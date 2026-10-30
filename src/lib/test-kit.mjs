/**
 * The six helpers every shape test in this repo was re-typing.
 *
 * The unit gate runs each `*.test.mjs` with bare `node` — no resolver, no `@/`
 * alias, no database, no browser — so a test that wants to assert on a server
 * action, a `.tsx` file or anything importing Prisma reads the SOURCE as text
 * and asserts on its shape. That pattern is deliberate and documented in most
 * of the files that use it. What was not deliberate is that its scaffolding
 * was copy-pasted: 37 identical `ROOT`/`read` preambles, `decomment` in two
 * spellings that disagreed with each other, six hand-rolled `walk`s and three
 * surrogate detectors.
 *
 * Two spellings of `decomment` is the part that mattered. The weak variant
 * `(^|[^:])//` was written to avoid eating the `//` in a `https://` URL, and it
 * does — but it also eats a `//` that sits inside a string literal, so the two
 * variants could disagree about the same line of source. This module ships the
 * strong one (which also guards a preceding quote or backslash) as the only
 * one.
 *
 * Same constraints as `test-fn-body.mjs`, for the same reason: plain `.mjs`,
 * nothing the bare `node` runner cannot resolve, and NOT named `*.test.mjs` so
 * the runner does not try to execute it. The one import that is not `node:` is
 * `typescript`, which `decomment` loads on its first call: a devDependency that
 * `npm ci` installs everywhere the gate runs, and resolved from node_modules
 * like any package, so the no-resolver rule still holds.
 */

import { readFileSync, readdirSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export { balancedBody } from "./test-fn-body.mjs";

/**
 * The repository root, resolved from THIS file rather than from the caller —
 * which is the whole reason the kit can be imported from any depth. A test in
 * `src/lib/demo-seed/` gets the same ROOT as one in `src/lib/`.
 */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Read a repo-relative path as UTF-8 text. */
export const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

/**
 * next.config.ts as Next reads it: the evaluated object, not its text.
 *
 * A grep over that file has to guess what it says, and the C-134 pin guessed
 * wrong twice (bug audit 3, L9-01): the old comment stripper ate the lines its
 * regex was looking for, and the regex knew one spelling of a wildcard, so
 * Next's own `**.r2.dev` would have passed it anywhere. The object has no
 * spellings: `images.remotePatterns` and the headers() array are what ships.
 *
 * `@sentry/nextjs` is swapped, for this one importer, for an identity
 * `withSentryConfig`. The wrapper adds build plumbing (env, webpack) and
 * touches neither images nor headers, and the real SDK takes seconds to load
 * and prints a deprecation notice into every run.
 */
export async function nextConfig() {
  const url = pathToFileURL(resolve(ROOT, "next.config.ts")).href;
  if (!configHooked) {
    configHooked = true;
    registerHooks({
      resolve(specifier, context, next) {
        if (specifier !== "@sentry/nextjs" || context.parentURL !== url) return next(specifier, context);
        return {
          url: "data:text/javascript,export const withSentryConfig = (config) => config;",
          shortCircuit: true,
        };
      },
      /* Said out loud so Node does not guess (package.json names no module
         type) and print a warning about guessing. */
      load(href, context, next) {
        return next(href, href === url ? { ...context, format: "module-typescript" } : context);
      },
    });
  }
  return (await import(url)).default;
}
let configHooked = false;

/**
 * Strip comments so an assertion cannot pass (or fail) on prose.
 *
 * Read by TypeScript's parser, not by a regex, because the regex this used to
 * be did not know when it was inside a string (bug audit 3, L9-02). Every
 * `accept="image/*"`, `"https://*.razorpay.com"` or `Accept: "*\/*"` opened a
 * "comment" that ran to the next real `*\/` and deleted the live code between:
 * ninety lines of next.config.ts, including every security header, and the
 * very DialogHeader attach-well.test.mjs exists to watch. A negative assertion
 * over a deleted span passes on nothing, and its docblock promised the
 * opposite ("errs by leaving prose in"). It erred both ways.
 *
 * How: parse the text, mark every literal the parser found (strings, template
 * pieces, regular expressions, JSX text), and remove `//` and `/*` runs only
 * outside them. Outside a literal those two openers can only start a comment,
 * so what is removed is exactly what TypeScript calls a comment. Checked across
 * all 1,072 sources under src/, scripts/ and next.config.ts on 2026-10-30: all
 * 19,095 comments gone, and the code that remains prints identically to the
 * original's with its comments dropped.
 *
 * The output is shaped as before, so no caller had to change: a block comment
 * is removed whole, a line comment up to (not including) its line break.
 *
 * Text that parses neither as TSX nor as TS (the one SQL migration a test
 * reads, or a fragment sliced through the middle of a token) gets the old
 * regex, which is right for SQL's block comments and is the only reading
 * there is for broken source. Everything a test reads whole is parsed.
 */
export function decomment(src) {
  if (!src.includes("//") && !src.includes("/*")) return src;
  let out = stripped.get(src);
  if (out === undefined) {
    const literals = literalSpans(src);
    out = literals ? stripOutside(src, literals) : decommentByRegex(src);
    stripped.set(src, out);
  }
  return out;
}

/** Tests strip the same file more than once (`decomment(src).slice(decomment(src)…)`). */
const stripped = new Map();

const require = createRequire(import.meta.url);
let ts;
/** Loaded on the first call: most tests never strip a comment, and the compiler is 9 MB. */
const typescript = () => (ts ??= require("typescript"));

/** `[start, end)` of every literal in `src`, sorted, or null when it does not parse. */
function literalSpans(src) {
  const t = typescript();
  const LITERAL = new Set([
    t.SyntaxKind.StringLiteral,
    t.SyntaxKind.NoSubstitutionTemplateLiteral,
    t.SyntaxKind.TemplateHead,
    t.SyntaxKind.TemplateMiddle,
    t.SyntaxKind.TemplateTail,
    t.SyntaxKind.RegularExpressionLiteral,
    t.SyntaxKind.JsxText,
  ]);
  /* TSX first: a .tsx file does not parse as TS, while the only TS a TSX parse
     refuses (a `<T>value` cast, a `<T>(x) => x` arrow) is rare here. */
  for (const [name, kind] of [
    ["decomment.tsx", t.ScriptKind.TSX],
    ["decomment.ts", t.ScriptKind.TS],
  ]) {
    const options = { languageVersion: t.ScriptTarget.Latest, jsDocParsingMode: t.JSDocParsingMode?.ParseNone };
    const file = t.createSourceFile(name, src, options, false, kind);
    if (file.parseDiagnostics.length > 0) continue;
    const spans = [];
    const visit = (node) => {
      if (!LITERAL.has(node.kind)) return void t.forEachChild(node, visit);
      /* JSX text has no leading trivia to skip: a `//` in "Visit us // soon" is
         text, and TypeScript's own getStart() refuses to read it as a comment. */
      spans.push([node.kind === t.SyntaxKind.JsxText ? node.pos : node.getStart(file), node.end]);
    };
    visit(file);
    return spans.sort((a, b) => a[0] - b[0]);
  }
  return null;
}

function stripOutside(src, literals) {
  let out = "";
  let from = 0; // the first character not yet copied to `out`
  let next = 0; // the first literal not yet stepped over
  for (let i = 0; i < src.length; ) {
    while (next < literals.length && literals[next][1] <= i) next++;
    if (next < literals.length && literals[next][0] <= i) {
      i = literals[next][1]; // inside a literal nothing is a comment
      continue;
    }
    if (src[i] === "/" && (src[i + 1] === "/" || src[i + 1] === "*")) {
      out += src.slice(from, i);
      if (src[i + 1] === "*") {
        const close = src.indexOf("*/", i + 2);
        i = close < 0 ? src.length : close + 2;
      } else {
        const lineBreak = src.slice(i).search(/[\n\r\u2028\u2029]/);
        i = lineBreak < 0 ? src.length : i + lineBreak;
      }
      from = i;
      continue;
    }
    i++;
  }
  return out + src.slice(from);
}

/** The old heuristic, kept for text that is not TypeScript at all. The guard
 *  class spares `https://` and a `//` that opens a string or sits in a regex. */
const decommentByRegex = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** Directories no source sweep should descend into. */
export const SKIP_DIRS = ["generated", "node_modules"];

/**
 * Every file under `dir` matching `match`, as absolute paths.
 *
 * `skip` is directory basenames (or a predicate over `(name, fullPath)`) that
 * are not descended into. `lab` belongs in most sweeps' skip list but not all —
 * it is the dev/preview wing, so a date or a colour there is not shown to a
 * member — so it is passed in rather than assumed.
 */
export function walk(dir, { skip = SKIP_DIRS, match = /\.tsx?$/ } = {}) {
  const skipped =
    typeof skip === "function" ? skip : (name, full) => skip.includes(name) || skip.includes(full);
  const matches = typeof match === "function" ? match : (name) => match.test(name);
  const out = [];
  const visit = (d) => {
    /* Each entry's own type, never a link's target: `statSync` followed links,
       and one that dangled (a staged album's links into originals that had
       since moved, 2026-10-28) threw out of every sweep that walks scripts/. */
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!skipped(entry.name, full)) visit(full);
      } else if (!skipped(entry.name, full) && matches(entry.name)) {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}

/**
 * Every file under `under` (repo-relative folders) whose name passes `match`
 * and whose text matches `pattern`, repo-relative and sorted: what the sweeps
 * used to ask `git grep -l` for, read off the disk instead.
 *
 * `git grep` sees TRACKED files only, so a file nobody had staged yet was
 * invisible to every sweep built on it. CLAUDE.md's order is run the gate,
 * then stage by name, so the laptop's gate was green on a new file the push's
 * gate then failed, after the deploy (bug audit 3, L9-07; the same shape
 * C-189 took out of two sweeps). Two of them also ended in `|| true`, which
 * turns a git that cannot run into an empty, passing candidate list.
 *
 * The text is matched raw, comments included, as `git grep` matched it; the
 * callers decomment what they then assert on. A string pattern is literal.
 */
export function filesContaining(pattern, { under = ["src"], match = /\.tsx?$/, skip = SKIP_DIRS } = {}) {
  const re =
    typeof pattern === "string" ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : pattern;
  return under
    .flatMap((dir) => walk(resolve(ROOT, dir), { skip, match }))
    .filter((full) => re.test(readFileSync(full, "utf8")))
    .map((full) => relative(ROOT, full))
    .sort();
}

/**
 * True if `s` contains an unpaired UTF-16 surrogate, i.e. half a character.
 *
 * What a naive `slice(0, n)` on a string containing an emoji produces, and what
 * C-011 and C-059 both pin closed.
 */
export function hasLoneSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * Every server-action file under `dir`, repo-relative.
 *
 * This used to be `git grep -l '"use server"'` in two sweeps, and it failed
 * open three ways at once (audit C-189). It matched the literal DOUBLE-quoted
 * directive, so an equally valid `'use server'` file was never listed. It
 * required the directive at character zero, so a file opening with its
 * docblock -- the likely shape in a codebase as comment-heavy as this one --
 * was dropped whole. And `git grep` only sees TRACKED files, so a new action
 * file was invisible until somebody staged it, which is precisely the moment
 * you would want it to speak up.
 *
 * Every one of those produces NO assertion rather than a failing one, so a new
 * ungated action simply ships. `gate-coverage.test.mjs` was fixed in C-189;
 * `security-regressions.test.mjs` -- the SECURITY sweep, the one pinning the
 * two Criticals closed -- kept the broken shape until 2026-09-05. It is here
 * so there is one answer to "which files are actions", not two that agree
 * today and diverge on the day somebody writes `'use server'`.
 *
 * Not named `useServerFiles`: ESLint's rules-of-hooks reads a `use` prefix as
 * a React hook and refuses it at the top level.
 */
export function serverActionFiles(dir = resolve(ROOT, "src")) {
  const acc = [];
  for (const full of walk(dir, { skip: [...SKIP_DIRS, ".next"], match: /\.ts$/ })) {
    /* The directive must be the first STATEMENT, not the first line: leading
       comments are stripped before the test. A grep hit inside a comment (two
       lib files explicitly document that they are NOT use-server modules,
       quoting the directive) is not an action file, and this is what tells
       the two apart. */
    const head = readFileSync(full, "utf8").replace(
      /^(?:\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)\s*)*/,
      ""
    );
    if (/^(['"])use server\1/.test(head)) acc.push(relative(ROOT, full));
  }
  return acc;
}
