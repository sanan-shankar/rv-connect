/**
 * Tagging in the composer, the iMessage way (src/lib/mention-editing.ts).
 *
 * The owner, 2026-09-27: picking a member after "@" left "very coding type of
 * square brackets" in the box; he asked for a tag that looks tagged, a wave
 * as it lands, and a typed name that can be tapped to tag. Each piece lives in
 * a different file, and the wire format (`@[Name](id)`) must survive all of
 * them, so this pins the joins rather than the DOM (which Node has none of).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import { renderRichText } from "./rich-text.ts";

test("a tag goes back on the wire as @[Name](id)", () => {
  const src = decomment(read("src/lib/rich-text-editing.ts"));
  assert.match(src, /const mentionId = el\.dataset\?\.mentionId;/, "the serializer no longer reads a tag");
  assert.match(src, /return name \? `@\[\$\{name\}\]\(\$\{mentionId\}\)` : "";/);
});

test("a published mention carries its id, so a draft or an edit comes back as a tag", () => {
  const html = renderRichText("with @[Aditi Parekh](cmu816m5e000004l8d2tfip0x) today");
  assert.match(html, /data-mention-id="cmu816m5e000004l8d2tfip0x"/);
  // The name alone, as the composer shows it: no "@".
  assert.match(html, />Aditi Parekh<\/a>/);
  for (const file of ["src/components/posts/create-post-form.tsx", "src/components/common/rich-text-area.tsx"]) {
    const src = decomment(read(file));
    assert.match(src, /markMentionTokens\(/, `${file} hydrates tags as links again`);
  }
});

test("the composer inserts a token, waves it, and underlines typed names", () => {
  const form = decomment(read("src/components/posts/create-post-form.tsx"));
  assert.match(form, /const token = insertMentionToken\(range, user\);/);
  assert.match(form, /waveMention\(token\);/);
  assert.doesNotMatch(form, /createTextNode\(`@\[/, "the raw markup is being typed into the box again");
  assert.match(form, /onClick=\{handleEditorClick\}/, "a typed name can no longer be tapped to tag it");
  const editing = decomment(read("src/lib/mention-editing.ts"));
  // One line always, or the wave's letters let a name break mid-word.
  assert.match(editing, /const TOKEN_CLASS = "whitespace-nowrap font-semibold text-leaf";/);
});

test("the underline rule stays out of globals.css, which the build cannot parse it in", () => {
  assert.doesNotMatch(read("src/app/globals.css"), /::highlight\(/);
  assert.match(decomment(read("src/lib/mention-editing.ts")), /::highlight\(\$\{HIGHLIGHT\}\)/);
});

test("the name list has the people search's gate and people", () => {
  const route = decomment(read("src/app/api/users/first-names/route.ts"));
  assert.match(route, /const vet = await vetLookupRequest\(\);/);
  assert.match(route, /where: \{ isBlocked: false, deletionRequestedAt: null \}/);
});
