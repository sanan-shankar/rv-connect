import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { ROOT, read, decomment, balancedBody, walk } from "./test-kit.mjs";
import { CATCHUP_PEOPLE } from "./catchup-caps.ts";

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
 *
 *  The flag was `alumniOnly` until bug audit 3 (L10-01) widened what the
 *  Catch-ups pickers ask for: not just alumni but `CATCHUP_PEOPLE`, the
 *  verified alumni a Catch-up may hold, because a Keeper's pick lands in a
 *  private group and is rung by it, and the pickers had been enrolling
 *  accounts that had confirmed nothing. Renamed `forCatchup` so the name
 *  says what it asks.
 * ------------------------------------------------------------------ */

/**
 * Surfaces that search people WITHOUT asking for alumni only, and why each is
 * right to see the whole membership. Anything else calling the endpoint or
 * the hook has to pass the flag, or land here with its reason.
 */
const SEARCHES_EVERYONE = {
  "src/components/posts/mention-dropdown.tsx":
    "the composer's @-mention list: teachers are first-class authors here, and this is the only way to link one",
};

test("the endpoint narrows to Catch-up people only when the caller asks", () => {
  const src = decomment(read("src/app/api/users/search/route.ts"));
  assert.match(src, /forCatchup/, "the endpoint no longer reads the caller's Catch-up flag");
  const where = src.slice(src.indexOf("prisma.user.findMany"), src.indexOf("orderBy"));
  assert.match(
    where,
    /forCatchup\s*\?\s*\[CATCHUP_PEOPLE\]\s*:\s*\[\]/,
    "the Catch-up rule is no longer applied behind the flag; the pickers would offer people their actions drop"
  );
  assert.doesNotMatch(
    where,
    /accountType:\s*\{\s*notIn|verifyState|emailVerified/,
    "a Catch-up-only filter is written straight into the shared where, so the mention list loses those people too"
  );
});

test("CATCHUP_PEOPLE holds exactly the people a Catch-up may hold", () => {
  /* Read off the object itself, not the source text: each clause is one
     account a Catch-up must never be handed (bug audit 3, L10-01). */
  assert.deepEqual(CATCHUP_PEOPLE.accountType, { notIn: ["teacher", "ex_teacher"] }, "teachers are back in");
  assert.deepEqual(CATCHUP_PEOPLE.emailVerified, { not: null }, "an unconfirmed account can be picked again");
  assert.equal(CATCHUP_PEOPLE.verifyState, "verified", "an unvouched account can be picked again");
  assert.equal(CATCHUP_PEOPLE.isBlocked, false, "a blocked account can be picked again");
  assert.equal(CATCHUP_PEOPLE.deletionRequestedAt, null, "an account inside its deletion window can be picked again");
  assert.deepEqual(CATCHUP_PEOPLE.id, { not: "anonymous" }, "the site's Anonymous byline can be enrolled again");
});

test("nothing spreads CATCHUP_PEOPLE, which would overwrite the caller's own id clause", () => {
  const offenders = walk(resolve(ROOT, "src"), { skip: ["generated", "node_modules"] })
    .filter((f) => /\.\.\.\s*CATCHUP_PEOPLE\b/.test(decomment(read(relative(ROOT, f)))))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(offenders, [], "spread instead of nested (AND: [CATCHUP_PEOPLE] / user: CATCHUP_PEOPLE)");
});

test("the batch shortcut asks for Catch-up people, and its route applies the rule behind the flag", () => {
  const picker = decomment(read("src/components/catchups/create/people-picker.tsx"));
  assert.match(picker, /api\/users-by-batch\?[^`]*forCatchup=1/, "the batch shortcut offers classmates creation then drops");
  const route = decomment(read("src/app/api/users-by-batch/route.ts"));
  assert.match(route, /searchParams\.get\(["']forCatchup["']\)\s*===\s*["']1["']/, "the route reads the flag some other way");
  assert.match(route, /forCatchup\s*\?\s*\{\s*AND:\s*\[CATCHUP_PEOPLE\]\s*\}\s*:\s*\{\}/, "the route no longer applies the Catch-up rule behind its flag");
});

test("the People door never offers somebody already in, and says what adding did (T3-22)", () => {
  const door = decomment(read("src/components/catchups/home/people-door.tsx"));
  const add = balancedBody(door, "function AddSomeone(");
  assert.ok(add, "AddSomeone is gone; this pin is reading nothing");
  assert.match(add, /results\.filter\(\(r\) => !inIds\.has\(r\.id\)\)/, "the add list is no longer filtered by the roster");
  assert.match(add, /\{offered\.map\(/, "the add list renders the unfiltered results again");
  assert.match(add, /added === 0/, "the toast no longer reads what the server did");
  assert.match(add, /is already in\./, "re-adding somebody says they were added");
  assert.match(door, /<AddSomeone[^>]*inIds=\{inIds\}/, "the panel no longer hands the roster to the add list");
  const panel = balancedBody(door, "export function PeoplePanel(");
  assert.match(panel, /new Set\(people\.map\(\(p\) => p\.id\)\)/, "the roster handed down is not the people in the panel");
});

test("every people-search caller either asks for Catch-up people or says why not", () => {
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
      /forCatchup/,
      `${file} searches people without asking for Catch-up people, and is not on the SEARCHES_EVERYONE list`
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
  assert.match(hook, /opts\?\.forCatchup\s*\?/, "the hook no longer treats the Catch-up flag as an opt-in");
  const route = decomment(read("src/app/api/users/search/route.ts"));
  assert.match(
    route,
    /searchParams\.get\(["']forCatchup["']\)\s*===\s*["']1["']/,
    "the route reads the flag some other way; an absent param must mean everyone"
  );
});
