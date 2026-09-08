import test from "node:test";
import assert from "node:assert/strict";
import { read, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A heart does not revalidate the page it was tapped on.
 *
 *  WHY IT IS A TEST AND NOT A COMMENT. It already was a comment.
 *  `toggleLike` in feed/actions.ts has carried the rule in its own words
 *  since audit 2 took the last five calls out -- "an action whose result
 *  the client already holds does not revalidate" -- written after that
 *  refresh was landing as an occasional scroll-to-top on the heart click.
 *  `toggleEntryLove` in catchups/actions.ts was written later, with the
 *  call in it, twice.
 *
 *  What that cost, measured on "in the loop" Edition 1 (133 answers) at
 *  1440 on 2026-09-08, four taps each way:
 *
 *      with the call     223 KB, 1,333 to 1,809 ms per tap
 *      without it          1 KB,   514 to   781 ms per tap
 *
 *  `revalidatePath` makes Next rebuild the route's server tree the moment
 *  the action resolves, and this route server-renders every answer in the
 *  Edition. The member sees it as the heart filling at once and the
 *  animation arriving a second later, which is exactly the owner's report
 *  (brief 29): "if I'm on the feed and I click the heart, the heart just
 *  becomes red. But if I click a heart on Mohini's answer, it becomes red
 *  and the animation kicks in after the second."
 *
 *  Every one of these four buttons holds `liked` and `count` in client
 *  state through `useHeartToggle` and flips both in under 60 ms. There is
 *  nothing on the rebuilt page for any of them to read.
 * ------------------------------------------------------------------ */

const TOGGLES = [
  ["src/app/(main)/feed/actions.ts", "export async function toggleLike"],
  ["src/app/(main)/feed/actions.ts", "export async function toggleCommentLike"],
  ["src/app/(main)/collection/actions.ts", "export async function togglePhotoLove"],
  ["src/app/(main)/catchups/actions.ts", "export async function toggleEntryLove"],
];

test("no love toggle revalidates the page it was tapped on", () => {
  for (const [file, decl] of TOGGLES) {
    const body = balancedBody(read(file), decl);

    /* Anti-vacuity, and the failure this guards against is a rename: a
       null body would make the assertion below pass over nothing. The
       length floor catches the other half, a `balancedBody` that stops at
       the first nested brace and reads four lines. */
    assert.ok(body, `${decl} not found in ${file}; the test is reading the wrong path`);
    assert.ok(
      body.length > 400,
      `${decl} came back as ${body.length} characters; the slice is truncated, not the action`,
    );

    /* A comment saying the word is the point -- three of the four explain
       why the call is absent, and stripping comments would make the test
       unable to tell an explanation from a regression. So match the call
       itself, with its parenthesis. */
    const calls = body.match(/(?<!\/\/[^\n]*)\brevalidatePath\s*\(/g);
    assert.equal(
      calls,
      null,
      `${decl} calls revalidatePath. Its button already holds the count in ` +
        `client state, so the rebuilt server tree is markup nobody reads -- ` +
        `and on the Catch-ups reader that rebuild is every answer in the ` +
        `Edition: 223 KB and 1.7s a tap, which the owner sees as the heart's ` +
        `animation arriving a second late.`,
    );
  }
});
