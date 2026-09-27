/* ------------------------------------------------------------------ *
 *  Tagging a member in a contentEditable composer, the iMessage way.
 *
 *  The owner, 2026-09-27, on picking someone after "@": "I get this
 *  like, very coding type of square brackets [...] that looks really
 *  ugly. [...] do it like iMessage [...] it does that, like, iMessage
 *  style weave animation. And kind of makes it a little bit bolder to
 *  show that it's tagged."
 *
 *  So a tagged member is a TOKEN in the editor: their name, in the
 *  weight and green a mention has once published, one piece that the
 *  caret steps over and Backspace removes whole. The wire format does
 *  not change: serializeEditableToMarkdown (rich-text-editing.ts)
 *  writes a token back as `@[Name](id)`, which renderRichText reads.
 *
 *  And a typed name that belongs to somebody here is underlined, the
 *  way Messages greys a contact's name, so it can be tagged without
 *  going back to type "@": tap it and the people search opens on it.
 *  The underline is the CSS Custom Highlight API, which styles a
 *  stretch of text without wrapping it in an element, so the caret
 *  and the browser's own undo never notice. A browser without it
 *  simply shows no underline; "@" still works everywhere.
 *
 *  DOM only; the composer holds the React state.
 * ------------------------------------------------------------------ */

/** The token's look: a published mention's weight and ink (rich-text.ts), and
 *  one line always, as a tag is in Messages. Without nowrap the wave's
 *  letter-by-letter spans let a long name break mid-word ("Lakshmipr / iya")
 *  and then jump back when the wave ended. */
const TOKEN_CLASS = "whitespace-nowrap font-semibold text-leaf";

/** Make every mention in hydrated HTML (a resumed draft, an edited post)
 *  a token, rather than a link the caret can wander into. */
export function markMentionTokens(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-mention-id]")) {
    el.contentEditable = "false";
    el.removeAttribute("href");
    el.className = TOKEN_CLASS;
  }
}

/** Replace `range` (an "@query", or a typed name) with a token for `user`,
 *  leave one space after it, and put the caret after that. Returns the token. */
export function insertMentionToken(range: Range, user: { id: string; name: string }): HTMLElement {
  range.deleteContents();
  const token = document.createElement("span");
  token.dataset.mentionId = user.id;
  token.contentEditable = "false";
  token.className = TOKEN_CLASS;
  token.textContent = user.name;
  range.insertNode(token);

  const next = token.nextSibling;
  const caret = document.createRange();
  if (next?.nodeType === Node.TEXT_NODE && /^\s/.test(next.textContent ?? "")) {
    caret.setStart(next, 1);
  } else {
    const space = document.createTextNode(" ");
    token.after(space);
    caret.setStartAfter(space);
  }
  caret.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(caret);
  return token;
}

/** The letters rise and settle one after another, once, as the name becomes
 *  a token. Each letter is its own inline-block for the length of the wave
 *  (a transform cannot move part of a text node), then the token is plain
 *  text again so the caret and selection meet one simple node. */
const WAVE_MS = 420;
const WAVE_STAGGER_MS = 26;
export function waveMention(token: HTMLElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const name = token.textContent ?? "";
  token.replaceChildren(
    ...Array.from(name, (char, i) => {
      const letter = document.createElement("span");
      letter.className = "mention-wave";
      letter.style.setProperty("--i", String(i));
      letter.textContent = char;
      return letter;
    }),
  );
  window.setTimeout(
    () => {
      if (token.isConnected) token.textContent = name;
    },
    WAVE_MS + name.length * WAVE_STAGGER_MS + 40,
  );
}

/* ---- Recognising typed names ------------------------------------- */

let namesOnce: Promise<Set<string>> | null = null;

/** Members' first names (api/users/first-names), fetched once per page. A
 *  failure resolves empty and is forgotten, so the next focus tries again. */
export function memberFirstNames(): Promise<Set<string>> {
  namesOnce ??= fetch("/api/users/first-names")
    .then((res) => (res.ok ? (res.json() as Promise<string[]>) : []))
    .then((list) => new Set(list))
    .catch(() => {
      namesOnce = null;
      return new Set<string>();
    });
  return namesOnce;
}

/** A capitalised word of three letters or more. Lower case is left alone:
 *  "will" and "may" are words; "Arjun" is a name. */
const WORD = /\p{Lu}\p{Ll}{2,}/gu;
const LETTER = /[\p{L}\p{N}_]/u;

/** Every typed word in `root` that is a member's first name, outside tokens. */
export function findNameCandidates(root: HTMLElement, names: Set<string>): Range[] {
  const found: Range[] = [];
  if (names.size === 0) return found;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest("[data-mention-id]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    for (const match of text.matchAll(WORD)) {
      const start = match.index;
      const end = start + match[0].length;
      const before = text[start - 1] ?? "";
      // Part of a longer word, or an "@query" the dropdown already owns.
      if (before === "@" || LETTER.test(before) || LETTER.test(text[end] ?? "")) continue;
      if (!names.has(match[0].toLowerCase())) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      found.push(range);
    }
  }
  return found;
}

/** The candidate the caret is in or touching, if any. */
export function candidateAtCaret(candidates: Range[]): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const caret = selection.getRangeAt(0);
  return (
    candidates.find(
      (r) =>
        r.startContainer === caret.startContainer &&
        caret.startOffset >= r.startOffset &&
        caret.startOffset <= r.endOffset,
    ) ?? null
  );
}

/* One highlight for the page, painted from every composer's own list, so two
   composers open at once (the Feed's and an edit dialog's) do not wipe each
   other's underlines. */
const HIGHLIGHT = "mention-candidate";
const painted = new Map<HTMLElement, Range[]>();

/* The underline's one rule is added from here rather than globals.css: the
   build's CSS parser does not read `::highlight()` (Turbopack logs "Parsing
   CSS source code failed" and drops it). A dotted underline in the tag's
   green says "press me" without claiming to be a link yet. The CSP allows
   inline styles ('unsafe-inline' in style-src, next.config.ts). */
let styled = false;
function ensureHighlightStyle() {
  if (styled) return;
  styled = true;
  const style = document.createElement("style");
  style.textContent = `::highlight(${HIGHLIGHT}){text-decoration-line:underline;text-decoration-style:dotted;text-decoration-color:var(--leaf);text-decoration-thickness:2px}`;
  document.head.append(style);
}

export function paintNameCandidates(root: HTMLElement, candidates: Range[]): void {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  ensureHighlightStyle();
  if (candidates.length) painted.set(root, candidates);
  else painted.delete(root);
  const all = [...painted.values()].flat();
  if (all.length) CSS.highlights.set(HIGHLIGHT, new Highlight(...all));
  else CSS.highlights.delete(HIGHLIGHT);
}
