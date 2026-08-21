import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const card = decomment(read("src/components/posts/post-card.tsx"));
const composer = decomment(read("src/components/posts/create-post-form.tsx"));
const editDialog = decomment(read("src/components/posts/edit-post-dialog.tsx"));
const rail = decomment(read("src/components/feed/rail/letters-module.tsx"));
const desk = decomment(read("src/components/letters/letter-desk.tsx"));
const contacts = decomment(read("src/components/profile/contacts-editor.tsx"));
const letterhead = decomment(read("src/components/profile/letterhead-profile.tsx"));
const feedActions = decomment(read("src/app/(main)/feed/actions.ts"));

const fnBody = (src, name) => {
  const i = src.indexOf(name);
  assert.ok(i > -1, `${name} is gone`);
  return src.slice(i, src.indexOf("\n  }", i) + 4);
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
  const fn = fnBody(feedActions, "export async function editPost");
  assert.ok(
    /cityScope/.test(feedActions.slice(feedActions.indexOf("export async function editPost"))),
    "editPost drops cityScope again, so choosing a city on a resumed draft is " +
      "silently ignored (B-048)"
  );
  void fn;
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
