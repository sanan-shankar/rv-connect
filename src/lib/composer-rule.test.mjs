import assert from "node:assert/strict";
import test from "node:test";
import { balancedBody } from "./test-fn-body.mjs";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The composer, the card and the letters desk.
 *
 *  Five separate ways a member's own writing went missing or went stale,
 *  found by the pre-release audit. Each is a shape rather than a value, so
 *  each is pinned here where it costs nothing to check on every run:
 *
 *   B-041  deleting or editing a post never updated the on-screen list
 *   B-043  autosave failed silently and a fresh letter had no crash net
 *   B-044  Post stayed enabled while photos were still uploading
 *   B-045  the feed rail teased city-scoped letters to everybody
 *   B-048  a draft's audience was invisible and unchangeable
 *   B-049  removing a contact row saved the PRE-removal list
 * ------------------------------------------------------------------ */

const card = decomment(read("src/components/posts/post-card.tsx"));
const composer = decomment(read("src/components/posts/create-post-form.tsx"));
const editDialog = decomment(read("src/components/posts/edit-post-dialog.tsx"));
const rail = decomment(read("src/components/feed/rail/letters-module.tsx"));
const desk = decomment(read("src/components/letters/letter-desk.tsx"));
const contacts = decomment(read("src/components/profile/contacts-editor.tsx"));
const letterhead = decomment(read("src/components/profile/letterhead-profile.tsx"));
const feedActions = decomment(read("src/app/(main)/feed/actions.ts"));

/* The shared balanced-brace extractor, not a local `indexOf("\n  }")`.
   That one stops at the first two-space-indented closing brace, which is fine
   for a component's inner function and wrong for a top-level server action --
   and the workaround for that (asserting against the whole tail of the file
   below the declaration) is what made the B-048 pin below vacuous for months
   (audit C-188). See src/lib/test-fn-body.mjs. */
const fnBody = (src, name) => {
  const body = balancedBody(src, name);
  assert.ok(body, `${name} is gone`);
  // A four-line slice means the extractor lost the scope; every assertion
  // after it would then pass against almost nothing.
  assert.ok(body.length > 60, `${name}'s body did not extract; this test is vacuous`);
  return body;
};

/* ---- B-041 ---------------------------------------------------------- */

test("a deleted post leaves the list without a reload", () => {
  const fn = fnBody(card, "async function handleDelete");
  assert.ok(
    /setRemoved\(true\)/.test(fn),
    "handleDelete does nothing locally on success again: every surface that " +
      "renders PostCard holds its posts in client state, so revalidatePath " +
      "leaves the card sitting there and a second click answers 'Post not found'"
  );
});

test("an edited post shows the new words without a reload", () => {
  assert.ok(/onSaved/.test(editDialog), "EditPostDialog no longer reports what it saved");
  assert.ok(
    /onSaved=\{/.test(card),
    "PostCard does not take the saved content back from the edit dialog, so the " +
      "card keeps the pre-edit words until the member navigates away and back"
  );
});

/* ---- B-043 ---------------------------------------------------------- */

test("a failing autosave says so instead of sitting on 'Saving...'", () => {
  assert.ok(
    /onAutosaveState\?\.\("failed"\)/.test(composer),
    "the autosave failure path is empty again; the desk chrome will sit on " +
      "'Saving...' while every later save fails too (B-043)"
  );
  assert.ok(/catch/.test(composer), "the autosave await has no try/catch");
  assert.ok(
    /"failed"/.test(desk),
    "the letters desk has nothing to render for a failed save"
  );
});

test("a letter with nowhere else to live is kept on the device", () => {
  assert.ok(
    /localStorage/.test(composer),
    "there is no crash net: a fresh letter has no row until the first explicit " +
      "save, so navigating away loses the whole thing (B-043)"
  );
  assert.ok(
    /clearLocalDraft/.test(composer),
    "nothing clears the local copy, so a stale one can shadow a good server copy"
  );
});

/* ---- B-044 ---------------------------------------------------------- */

test("the composer cannot publish while photos are still uploading", () => {
  const disabled = [...composer.matchAll(/disabled=\{!content\.trim\(\)[^}]*\}/g)].map((m) => m[0]);
  assert.ok(disabled.length >= 2, `expected the two submit buttons, found ${disabled.length}`);
  for (const d of disabled) {
    assert.ok(
      /uploading/.test(d),
      "a submit button is not gated on in-flight uploads, so the post publishes " +
        "without its photos and the next post silently carries them (B-044)"
    );
  }
});

/* ---- B-045 ---------------------------------------------------------- */

test("the feed rail's letter teaser is scoped to who is looking", () => {
  assert.ok(
    /cityScopeWhere/.test(rail),
    "LettersModule queries with no audience filter again: a city-scoped letter's " +
      "title, excerpt and author are shown to every member, and clicking it 404s (B-045)"
  );
  /* Was a grep for `targetBatches`. The three queries that applied this
     audience each hand-built the same OR, so they were folded into one shared
     `batchScopeWhere` fragment (audit M43) and the literal column name no
     longer appears here -- pin the filter, not the spelling. */
  assert.ok(
    /batchScopeWhere\(viewer\.batch\)|targetBatches/.test(rail),
    "the rail ignores a letter's batch audience"
  );
  assert.ok(/viewer/.test(rail), "the rail query has no viewer context at all");
});

/* ---- B-048 ---------------------------------------------------------- */

test("a draft's audience survives being saved and reopened", () => {
  /* Against editPost's OWN body. This used to test the whole tail of
     feed/actions.ts below the declaration, where `cityScope` appears six more
     times in loadPosts and loadSavedPosts -- so deleting editPost's entire
     audience block left this green (audit C-188). The balanced body was
     already being computed on the line above and then thrown away. */
  const fn = fnBody(feedActions, "export async function editPost");
  assert.ok(
    /cityScope/.test(fn),
    "editPost drops cityScope again, so choosing a city on a resumed draft is " +
      "silently ignored (B-048)"
  );
  assert.ok(
    /initialCityScope/.test(composer),
    "the composer cannot be seeded with a draft's stored audience, so it always " +
      "opens looking like 'Everyone'"
  );
  assert.ok(
    /formData\.set\("cityScope", audienceCity \?\? ""\)/.test(composer),
    "the audience is sent only when set, which cannot express clearing it back " +
      "to Everyone"
  );
});

/* ---- B-049 ---------------------------------------------------------- */

test("removing a contact row saves the list without it", () => {
  assert.ok(
    /onCommit\(next\)/.test(contacts),
    "the remove button commits with no argument, so the parent saves the row " +
      "array captured before the removal and the value comes back (B-049)"
  );
  assert.ok(
    /function commitContacts\(next\?/.test(letterhead),
    "commitContacts takes no explicit rows again, the shape commitPlaces and " +
      "commitHouses have always had"
  );
});

/* ---- The letters desk and what it does with unsaved words ------------- *
 *
 *  Three ways the autosave lost or fought the writer, all in one effect.
 * --------------------------------------------------------------------- */

/* C-175. The armed timer guarded on `submitting`, read from the closure of an
 * effect whose deps do not include it, so setSubmitting(true) inside
 * handleSubmit never reached it: a keystroke within 2.5s of Publish fired an
 * autosave mid-publish, both writes carrying the same baseUpdatedAt, and
 * editPost's version precondition told the writer their letter had been
 * edited somewhere else. */

test("a Publish cannot be raced by the autosave it armed", () => {
  const armed = composer.slice(composer.indexOf("autosaveTimer.current = setTimeout"));
  const body = armed.slice(0, armed.indexOf("}, 2500)"));
  assert.ok(
    /submittingRef\.current/.test(body),
    "the autosave timer guards on render state again, which its own effect " +
      "does not depend on, so the guard cannot see a submit that started after " +
      "the timer was armed (C-175)"
  );
  assert.ok(
    !/if\s*\(submitting\s*\|\|/.test(body),
    "the stale-closure guard is back"
  );

  const submit = fnBody(composer, "async function handleSubmit");
  const disarm = submit.indexOf("clearTimeout(autosaveTimer.current)");
  assert.ok(disarm > -1, "handleSubmit no longer disarms the pending autosave (C-175)");
  assert.ok(
    disarm < submit.indexOf("await autosaveRunRef.current"),
    "the autosave is disarmed only after an await, which is a window for it to fire"
  );
});

/* C-176. runAutosave SENDS the audience, so the effect that arms it has to
 * depend on the audience -- otherwise choosing one and not typing never armed
 * a timer at all (the desk said "Saved" over an unsaved choice) and a timer
 * armed earlier wrote the OLD scope back from its stale closure. */

test("everything the autosave sends is something it watches", () => {
  const effect = composer.slice(composer.indexOf("const autosaveTimer = useRef"));
  const runStart = effect.indexOf("async function runAutosave");
  assert.ok(runStart > -1, "runAutosave is gone");
  const deps = /\}, \[([^\]]*)\]\);/.exec(effect.slice(runStart));
  assert.ok(deps, "the autosave effect's dependency list is gone");
  const watched = deps[1];

  // Bounded at the dependency list, so the exit-save effect further down the
  // file is not mistaken for part of this one.
  const run = effect.slice(runStart, runStart + deps.index);
  /* Every identifier that appears on the right of an `fd.set`. Globals and
     refs are dropped: a ref is read at fire time and so cannot go stale, and
     JSON/String/Number are not values this component owns. What is left is
     reactive state, and reactive state that a save SENDS is state the effect
     arming that save must watch. */
  const GLOBALS = new Set(["JSON", "String", "Number", "Boolean", "Date", "Math", "stringify"]);
  const sent = [...run.matchAll(/fd\.set\([^,]+,\s*([^;]+?)\);/g)]
    .flatMap((m) => m[1].match(/[A-Za-z_$][\w$]*/g) ?? [])
    .filter((name) => !GLOBALS.has(name) && !name.endsWith("Ref") && !/^(trim|current|set)$/.test(name));
  assert.ok(sent.length > 0, "runAutosave sends nothing; retarget this test");
  for (const value of new Set(sent)) {
    assert.ok(
      new RegExp(`\\b${value}\\b`).test(watched),
      `the autosave sends ${value} but does not depend on it, so a change to it ` +
        `alone never arms a save and an armed timer writes the old value (C-176)`
    );
  }
});

/* C-177. Both persistence paths were idle-debounced and neither survived the
 * tab closing, so writing fluently and then closing discarded every word since
 * the last 2.5s pause -- while the chrome still said "Saved". And the belt a
 * resumed draft did write was never read back. */

test("closing the tab mid-sentence keeps the words", () => {
  assert.ok(
    /addEventListener\("pagehide"/.test(composer),
    "nothing persists the letter on a real unload; an unmount cleanup never " +
      "runs for a closed tab (C-177)"
  );
  assert.ok(
    /visibilityState === "hidden"/.test(composer),
    "a phone locked mid-sentence is not covered"
  );
  // The flush must be a synchronous localStorage write. An unload gives no
  // time for a server round trip, so anything awaited here is theatre.
  const flush = composer.slice(composer.indexOf("const flush = ()"));
  assert.ok(
    /stashLocalDraft\(/.test(flush.slice(0, flush.indexOf("};"))),
    "the unload flush does not write the local belt"
  );
});

test("a resumed draft's local copy is read back, not just written", () => {
  const restore = composer.slice(composer.indexOf("const restoredRef = useRef"));
  const effect = restore.slice(0, restore.indexOf("}, []);"));
  assert.ok(
    !/if\s*\([^)]*initialContent[^)]*\)\s*return;/.test(effect.split("\n")[2] ?? ""),
    "the restore still bails the moment the draft came from the server, so the " +
      "belt it writes can never be offered back (C-177)"
  );
  assert.ok(
    /action:\s*\{/.test(effect),
    "a resumed draft's local copy is applied without asking; the server row may " +
      "have been written from another device and nothing here can rank the two"
  );
});
