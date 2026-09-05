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
 * `node:` imports only, and NOT named `*.test.mjs` so the runner does not try
 * to execute it.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
 * Strip comments so an assertion cannot pass (or fail) on prose.
 *
 * The guard character class is what separates this from the weak variant the
 * suite also carried. `[^:]` alone spares `https://`; adding `"'` and a
 * backtick also spares a `//` written at the very start of a string or template
 * literal, and the backslash spares one inside a regex. It is a heuristic, not
 * a parser — a `//` further inside a string still reads as a comment — but it
 * errs by leaving prose in, and surviving prose can only fail an assertion
 * loudly, never make one pass on nothing.
 */
export const decomment = (src) =>
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
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) {
        if (!skipped(name, full)) visit(full);
      } else if (!skipped(name, full) && matches(name)) {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
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
