import assert from "node:assert/strict";
import test from "node:test";

import { serializeEditableToMarkdown } from "./rich-text-editing.ts";

/* ------------------------------------------------------------------ *
 *  The composer's DOM -> markdown half, pinned at the shapes a browser
 *  actually builds inside a contentEditable.
 *
 *  There is no jsdom in this repo and this serializer does not need one:
 *  it reads nodeType, tagName, childNodes, textContent and style, and
 *  nothing else. The node factories below are exactly that much DOM, and
 *  the shapes they build were READ OFF Chrome (chrome-devtools MCP,
 *  2026-08-27) rather than guessed -- typing "para one", Enter, Enter,
 *  "para two" into a contentEditable produces, verbatim:
 *      para one<div><br></div><div>para two</div>
 * ------------------------------------------------------------------ */

globalThis.Node ??= { TEXT_NODE: 3, ELEMENT_NODE: 1 };

const text = (value) => ({ nodeType: 3, textContent: value, childNodes: [] });
const el = (tagName, childNodes = []) => ({ nodeType: 1, tagName, childNodes, style: {} });
const br = () => el("BR");
/** The contentEditable itself: serializeEditableToMarkdown reads only its children. */
const editable = (childNodes) => ({ childNodes });

test("one blank line between paragraphs stays ONE blank line", () => {
  // The owner's bug, 2026-08-27: a letter spaced with a single empty line came
  // back from Drafts with two. `<div><br></div>` used to serialize as "\n\n" --
  // one newline for the block, another for the filler <br> inside it -- so the
  // extra line was written to the row and only became visible on reopening.
  const dom = editable([text("para one"), el("DIV", [br()]), el("DIV", [text("para two")])]);
  assert.equal(serializeEditableToMarkdown(dom), "para one\n\npara two");
});

test("two blank lines are still two", () => {
  // The fix drops the filler, not the block: spacing a writer actually asked
  // for has to survive the round trip unchanged.
  const dom = editable([
    text("a"),
    el("DIV", [br()]),
    el("DIV", [br()]),
    el("DIV", [text("b")]),
  ]);
  assert.equal(serializeEditableToMarkdown(dom), "a\n\n\nb");
});

test("a <br> in the middle of a block is a real line break", () => {
  // Shift+Enter inside a paragraph. Only a TRAILING <br> is the browser's
  // height filler; this one is the writer's.
  const dom = editable([el("DIV", [text("a"), br(), text("b")])]);
  assert.equal(serializeEditableToMarkdown(dom), "a\nb");
});

test("a block ending in a real <br> keeps its text", () => {
  const dom = editable([el("DIV", [text("a"), br()]), el("DIV", [text("b")])]);
  assert.equal(serializeEditableToMarkdown(dom), "a\nb");
});

test("live formatting still serializes to the wire markers", () => {
  const dom = editable([
    el("DIV", [text("plain "), el("B", [text("bold")])]),
    el("DIV", [br()]),
    el("DIV", [el("I", [text("italic")])]),
  ]);
  assert.equal(serializeEditableToMarkdown(dom), "plain **bold**\n\n*italic*");
});
