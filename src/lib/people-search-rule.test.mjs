import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  Who the people-search endpoint is allowed to hide.
 *
 *  /api/users/search excluded teachers unconditionally, under a comment
 *  saying its only consumers were the Catch-ups people surfaces. They were
 *  not: the composer's @-mention dropdown is the third, and it is the only
 *  way to insert a mention -- so a teacher, who writes to the feed and the
 *  letters like any other member, could never be mentioned by name
 *  (bug-report-2 C-006). Proved live: the teacher the search now returns to
 *  the composer is still absent from the Catch-ups pickers.
 *
 *  The rule moved to the surface that has it. What is pinned here is that it
 *  stays there, and that the default stays inclusive: a caller that forgets
 *  the flag must get MORE people, never a silently narrowed list.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/**
 * Surfaces that search people WITHOUT asking for alumni only, and why each is
 * right to see the whole membership. Anything else calling the endpoint or
 * the hook has to pass the flag, or land here with its reason.
 */
const SEARCHES_EVERYONE = {
  "src/components/posts/mention-dropdown.tsx":
    "the composer's @-mention list: teachers are first-class authors here, and this is the only way to link one",
};

test("the endpoint hides teachers only when the caller asks", () => {
  const src = decomment(read("src/app/api/users/search/route.ts"));
  assert.match(src, /alumniOnly/, "the endpoint no longer reads the caller's alumni-only flag");
  const where = src.slice(src.indexOf("prisma.user.findMany"), src.indexOf("orderBy"));
  const exclusion = /accountType:\s*\{\s*notIn/;
  assert.ok(exclusion.test(where), "the teacher exclusion is gone entirely; Catch-ups needs it");
  assert.match(
    where,
    /alumniOnly\s*\?[\s\S]{0,120}notIn/,
    "the teacher exclusion is unconditional again, so no surface that shares this endpoint can reach a teacher"
  );
});

test("every people-search caller either asks for alumni only or says why not", () => {
  const callers = execSync(
    `git grep -l 'api/users/search\\|useUserSearch(' -- 'src/**/*.ts' 'src/**/*.tsx' || true`,
    { cwd: ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean)
    // The endpoint itself and the hook that wraps it are the mechanism, not
    // callers of it.
    .filter((f) => f !== "src/app/api/users/search/route.ts")
    .filter((f) => f !== "src/components/common/use-user-search.ts")
    // A grep hit inside a comment is not a caller: the places endpoint cites
    // this one by name to explain a shared decision.
    .filter((f) => /api\/users\/search|useUserSearch\s*\(/.test(decomment(read(f))));

  assert.ok(callers.length >= 3, `only found ${callers.length} people-search callers; the grep broke`);
  for (const file of callers) {
    if (SEARCHES_EVERYONE[file]) continue;
    assert.match(
      decomment(read(file)),
      /alumniOnly/,
      `${file} searches people without asking for alumni only, and is not on the SEARCHES_EVERYONE list`
    );
  }
});

test("the list of everyone-searchers names only files that still search", () => {
  for (const file of Object.keys(SEARCHES_EVERYONE)) {
    assert.match(
      decomment(read(file)),
      /api\/users\/search|useUserSearch\s*\(/,
      `${file} is listed as an everyone-searcher but no longer searches people (stale entry)`
    );
  }
});

test("the flag defaults to including everyone", () => {
  // The failure mode this shape prevents: a boolean whose absent state means
  // "hide people". Both the hook and the route read a positive opt-in.
  const hook = decomment(read("src/components/common/use-user-search.ts"));
  assert.match(hook, /opts\?\.alumniOnly\s*\?/, "the hook no longer treats alumni-only as an opt-in");
  const route = decomment(read("src/app/api/users/search/route.ts"));
  assert.match(
    route,
    /searchParams\.get\(["']alumniOnly["']\)\s*===\s*["']1["']/,
    "the route reads the flag some other way; an absent param must mean everyone"
  );
});
