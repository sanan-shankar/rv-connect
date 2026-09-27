/* ------------------------------------------------------------------ *
 *  The editing half of the app's one rich-text story. `renderRichText`
 *  (src/lib/rich-text.ts) turns the stored markdown into HTML for readers;
 *  these helpers are its inverse and its input path, shared by every
 *  writing surface (the feed/letter composer, the catch-up answer card,
 *  the edit dialog) so bold in one box behaves like bold in every box.
 *
 *  Wire format is markdown, never HTML: **bold**, *italic*, __underline__,
 *  ~~strike~~. The contentEditable shows live <b>/<i>/<u>/<s> (execCommand
 *  on the selection), and serialization walks the DOM back to the markers,
 *  so storage/rendering/search never change shape.
 *
 *  Pure DOM functions only. Anything with React state stays in the
 *  component that owns it; <RichTextArea> (components/common) is the
 *  drop-in field built on these.
 * ------------------------------------------------------------------ */

function isBoldNode(el: HTMLElement) {
  return el.tagName === "B" || el.tagName === "STRONG" || el.style.fontWeight === "bold" || el.style.fontWeight === "700";
}
function isItalicNode(el: HTMLElement) {
  return el.tagName === "I" || el.tagName === "EM" || el.style.fontStyle === "italic";
}
function isUnderlineNode(el: HTMLElement) {
  const deco = el.style.textDecorationLine || el.style.textDecoration || "";
  return el.tagName === "U" || deco.includes("underline");
}
function isStrikeNode(el: HTMLElement) {
  const deco = el.style.textDecorationLine || el.style.textDecoration || "";
  return el.tagName === "S" || el.tagName === "STRIKE" || el.tagName === "DEL" || deco.includes("line-through");
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.tagName === "BR") return "\n";
  /* A tagged member (lib/mention-editing.ts): one token on screen, the
     `@[Name](id)` renderRichText reads on the wire. The "@" a published
     mention used to carry is dropped if it is there, and square brackets
     cannot survive into the name, where they would end the markup early. */
  const mentionId = el.dataset?.mentionId;
  if (mentionId) {
    const name = (el.textContent ?? "").replace(/^@/, "").replace(/[[\]]/g, "").trim();
    return name ? `@[${name}](${mentionId})` : "";
  }
  const isBlock = el.tagName === "DIV" || el.tagName === "P";
  const children = Array.from(el.childNodes);
  /* The browser's filler <br>, which is not a line break anyone typed.
     A blank line in a contentEditable is `<div><br></div>`: the <br> exists
     only to give an empty block height. Counting it as well as the block
     emitted TWO newlines for ONE blank line, so a letter written with a blank
     line between paragraphs was STORED with two and came back from Drafts
     spaced double (owner, 2026-08-27). The doubling never showed while
     writing, because the sheet was rendering the DOM rather than the
     serialized text -- it only appeared on reopening.
     A <br> anywhere else in the block is real: `<div>a<br>b</div>` is two
     lines and still serializes as two. */
  if (isBlock && (children.at(-1) as HTMLElement | undefined)?.tagName === "BR") children.pop();
  let inner = children.map(serializeNode).join("");
  if (inner && isBoldNode(el)) inner = `**${inner}**`;
  if (inner && isItalicNode(el)) inner = `*${inner}*`;
  if (inner && isUnderlineNode(el)) inner = `__${inner}__`;
  if (inner && isStrikeNode(el)) inner = `~~${inner}~~`;
  if (isBlock) return "\n" + inner;
  return inner;
}

/** Walk a contentEditable root and serialize its live formatting back to markdown. */
export function serializeEditableToMarkdown(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/^\n/, "");
}

/** If the caret sits right after an "@partial" run in a single text node, return the
 *  Range spanning it (for the mention dropdown) plus the partial query text. */
export function computeMentionRange(): { range: Range; query: string } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return null;
  const text = container.textContent ?? "";
  const before = text.slice(0, range.startOffset);
  const match = before.match(/@(\w*)$/);
  if (!match) return null;
  const mentionRange = document.createRange();
  mentionRange.setStart(container, range.startOffset - match[0].length);
  mentionRange.setEnd(container, range.startOffset);
  return { range: mentionRange, query: match[1] };
}

// The keyboard path to formatting (there is no toolbar). Same keys every
// editor uses; strikethrough has no agreed shortcut, so it stays a markdown
// ("~~struck~~") and phone-selection-bar affordance.
const FORMAT_SHORTCUTS: Record<string, string> = {
  b: "bold",
  i: "italic",
  u: "underline",
};

/** Apply a Cmd/Ctrl+B/I/U keydown to the selection. Returns true if handled
 *  (the caller re-derives its markdown mirror); false to let the key through. */
export function applyFormatShortcut(e: React.KeyboardEvent<HTMLElement>): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
  const command = FORMAT_SHORTCUTS[e.key.toLowerCase()];
  if (!command) return false;
  e.preventDefault();
  try {
    // Deprecated and still the only reliable way to format the SELECTION in
    // place, which is what keeps raw "**" off the screen. The phone's native
    // selection bar (Bold / Italic / Underline) reaches the same code path
    // through the browser itself.
    document.execCommand(command, false);
  } catch {
    /* no-op: unsupported in this browser */
  }
  return true;
}

/** Force plain-text paste: clipboard formatting never bleeds into the editor,
 *  so bold/italic only ever comes from a shortcut, the phone's selection bar,
 *  or markdown the user types by hand (which round-trips via renderRichText). */
export function insertPlainTextPaste(e: React.ClipboardEvent<HTMLElement>): void {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  try {
    document.execCommand("insertText", false, text);
  } catch {
    /* no-op: unsupported in this browser */
  }
}
