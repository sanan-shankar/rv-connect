"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, X, BarChart3, Feather, Plus, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { downscaleImage } from "@/lib/image-downscale";
import { directUploadPut } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";
import { cn } from "@/lib/utils";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";
import { useTourAnchor } from "@/components/tour/tour-anchors";

/* ------------------------------------------------------------------ *
 *  Rich text <-> markdown bridge. The editor is a contentEditable
 *  surface so bold/italic/underline/strikethrough render LIVE, with no
 *  raw "**" ever on screen. There is no formatting toolbar: the three
 *  ways in are the ones people already know, and all three land in the
 *  same <b>/<i>/<u>/<s> the serializer below understands.
 *
 *    1. the phone's own selection bar (Bold / Italic / Underline), which
 *       a contentEditable gets natively;
 *    2. Cmd/Ctrl+B / I / U (handled explicitly in handleEditorKeyDown so
 *       it is deterministic across browsers);
 *    3. markdown typed by hand, WhatsApp style: **bold**, *italic*,
 *       __underline__, ~~struck~~. Those characters survive verbatim
 *       through this serializer and are rendered by renderRichText()
 *       (src/lib/utils.ts), whose matching rules are deliberately strict
 *       so ordinary writing ("2*3*4", a bullet list) never bolds itself.
 *
 *  On every input we walk the DOM and serialize it back to the SAME
 *  markdown wire format renderRichText() already expects, so post
 *  storage/rendering/search never change. Mentions stay a literal
 *  "@[Name](id) " text insertion.
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
  let inner = Array.from(el.childNodes).map(serializeNode).join("");
  if (inner && isBoldNode(el)) inner = `**${inner}**`;
  if (inner && isItalicNode(el)) inner = `*${inner}*`;
  if (inner && isUnderlineNode(el)) inner = `__${inner}__`;
  if (inner && isStrikeNode(el)) inner = `~~${inner}~~`;
  if (el.tagName === "DIV" || el.tagName === "P") return "\n" + inner;
  return inner;
}

/** Walk a contentEditable root and serialize its live formatting back to markdown. */
function serializeEditableToMarkdown(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/^\n/, "");
}

/** If the caret sits right after an "@partial" run in a single text node, return the
 *  Range spanning it (for the mention dropdown) plus the partial query text. */
function computeMentionRange(): { range: Range; query: string } | null {
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

/** Where the composer is posting. Drives the placeholder and the available affordances. */
export type ComposerScope = "post" | "group" | "letter";

// Height of the resting pill (h-11). The expand animation grows the box DOWN from
// exactly this height, and collapse contracts back to it, so nothing ever shrinks
// up first or starts stretched.
const COLLAPSED_H = 44;

// Past this length a post is nudged toward Letters instead of being capped or
// counted down. No red numbers, no limits messaging: just a hint.
const LETTER_NUDGE_LEN = 600;

const UPLOAD_TIMEOUT_MS = 60_000;

// The keyboard path to formatting, now that the toolbar is gone. Same keys
// every editor uses; strikethrough has no agreed shortcut, so it stays a
// markdown ("~~struck~~") and phone-selection-bar affordance.
const FORMAT_SHORTCUTS: Record<string, string> = {
  b: "bold",
  i: "italic",
  u: "underline",
};

const SCOPE_PLACEHOLDER: Record<ComposerScope, string> = {
  post: "Share a memory, a sighting, or a note for the valley",
  group: "Share something with this group",
  letter: "Write your letter to the valley. Take your time.",
};

export function CreatePostForm({
  groupId,
  scope,
  placeholder,
  defaultLetter = false,
  currentUser,
  userPlaces,
  onPosted,
}: {
  groupId?: string;
  scope?: ComposerScope;
  placeholder?: string;
  defaultLetter?: boolean;
  currentUser?: AvatarUser;
  /** The poster's own cities (their UserPlace list). Drives the "Show to" audience
   *  control below; omitted or empty means the control simply doesn't render. */
  userPlaces?: string[];
  onPosted?: () => void;
} = {}) {
  // Resolve scope: explicit prop wins, else infer from defaultLetter / groupId.
  const resolvedScope: ComposerScope =
    scope ?? (defaultLetter ? "letter" : groupId ? "group" : "post");
  const collapsedPlaceholder = placeholder ?? SCOPE_PLACEHOLDER[resolvedScope];
  // Tour spotlight target (walkthrough spec sec 2): only the feed's own
  // top-level composer, never a group's or a letter's.
  const isFeedComposer = resolvedScope === "post" && !groupId;
  const tourAnchorRef = useTourAnchor<HTMLButtonElement>("feed-composer", isFeedComposer);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"post" | "letter">(defaultLetter ? "letter" : "post");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Determinate-feeling progress for the "Photo" button label while a batch
  // uploads one file at a time (no byte-level progress events on a plain
  // fetch, but "uploading 2 of 3" reads as real progress).
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [expanded, setExpanded] = useState(defaultLetter);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [more, setMore] = useState(false); // overflow ("+") menu: poll + letter live here
  // City-scoped audience: null = "Everyone" (the default); otherwise one of the
  // poster's own cities. Never offered for a group post -- the group's own
  // membership already scopes who reads it.
  const [audienceCity, setAudienceCity] = useState<string | null>(null);
  const audienceOptions = resolvedScope === "group" ? [] : userPlaces ?? [];
  // Explicit, measured height for the one clean downward growth / contraction.
  const [colHeight, setColHeight] = useState<number>(COLLAPSED_H);
  // True only once the grow animation has fully settled; gates overflow so the
  // "More" popover can escape the box, while the unfurl/contraction stays clipped.
  const [settled, setSettled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);

  const isLetter = kind === "letter";
  // With a poll attached, this field IS the poll's question: the feed prints
  // the post body directly above the options, so a second "question" input
  // would just duplicate `Post.content`. Saying so in the placeholder is what
  // turns the composer from "here are some options with no question" into a
  // question followed by its choices.
  const hasPoll = !isLetter && pollOptions !== null;
  const effectivePlaceholder = isLetter
    ? "Write your letter to the valley. Take your time."
    : hasPoll
      ? "Ask your question"
      : collapsedPlaceholder;
  const hasContent = content.trim().length > 0;

  function expand(startKind?: "post" | "letter") {
    if (startKind) setKind(startKind);
    setSettled(false);
    setExpanded(true);
    setTimeout(() => richRef.current?.focus({ preventScroll: true }), 0);
  }

  // Collapse back to the resting pill, closing any open popovers. Letters
  // default to expanded, so they never retract to a pill. Only ever called
  // while empty (see the outside-click/Escape handler below), but the DOM is
  // cleared defensively too: a contentEditable can be left holding a stray
  // empty <div><br></div> even once its text content is gone.
  const collapse = useCallback(() => {
    setMore(false);
    setSettled(false);
    if (!defaultLetter) setExpanded(false);
    if (richRef.current) richRef.current.innerHTML = "";
    setContent("");
  }, [defaultLetter]);

  // Measure the editor's natural height and animate the box to it. A
  // ResizeObserver keeps the box exactly the content's size, so adding an image
  // or a poll grows it cleanly (no fixed height, no clipping) while the
  // expand/collapse spring stays a single deliberate downward/upward motion.
  useEffect(() => {
    if (!expanded) {
      setColHeight(COLLAPSED_H);
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    const update = () => setColHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  // Outside-click + Escape. Empty + outside click (or Escape with nothing open)
  // retracts to the pill; if the user has typed, an outside click only closes a
  // popover so a draft is never lost to a stray click.
  useEffect(() => {
    if (!expanded) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (!hasContent) collapse();
        else setMore(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (more) setMore(false);
      else if (!hasContent) collapse();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, hasContent, more, collapse]);

  // Re-derive the markdown mirror + mention query from the live DOM. Called after
  // every keystroke, paste, and formatting toggle so `content` (used for the Post
  // button's enabled state, the char counter, and the submit payload) never drifts
  // from what the editor visually shows.
  const handleRichInput = useCallback(() => {
    const el = richRef.current;
    if (!el) return;
    setContent(serializeEditableToMarkdown(el));
    const found = computeMentionRange();
    if (found) {
      setMentionQuery(found.query);
      mentionRangeRef.current = found.range;
    } else {
      setMentionQuery(null);
      mentionRangeRef.current = null;
    }
  }, []);

  // Cmd/Ctrl + B / I / U. A contentEditable handles these natively in every
  // current browser, but we take them explicitly so the behaviour is the same
  // everywhere and so the markdown mirror is re-derived immediately rather than
  // waiting on the browser's own input event. execCommand is deprecated and
  // still the only reliable way to format the SELECTION in place, which is what
  // keeps raw "**" off the screen. The phone's native selection bar (Bold /
  // Italic / Underline) reaches the same code path through the browser itself.
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const command = FORMAT_SHORTCUTS[e.key.toLowerCase()];
    if (!command) return;
    e.preventDefault();
    try {
      document.execCommand(command, false);
    } catch {
      /* no-op: unsupported in this browser */
    }
    handleRichInput();
  }

  // Force plain-text paste: clipboard formatting never bleeds into the editor,
  // so bold/italic only ever comes from a shortcut, the phone's selection bar,
  // or markdown the user types by hand (which round-trips via renderRichText).
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    try {
      document.execCommand("insertText", false, text);
    } catch {
      /* no-op: unsupported in this browser */
    }
    handleRichInput();
  }

  function handleMentionSelect(user: { id: string; name: string }) {
    const range = mentionRangeRef.current;
    const el = richRef.current;
    if (range && el) {
      range.deleteContents();
      const mentionNode = document.createTextNode(`@[${user.name}](${user.id}) `);
      range.insertNode(mentionNode);
      const after = document.createRange();
      after.setStartAfter(mentionNode);
      after.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);
      el.focus();
      setContent(serializeEditableToMarkdown(el));
    }
    setMentionQuery(null);
    mentionRangeRef.current = null;
  }

  /**
   * Preferred upload path: presigned PUT straight to R2 (the shared
   * `directUploadPut` helper), then a finalize call that turns the staged
   * FULL-RESOLUTION original into the display WebP server-side. No bytes
   * pass through a serverless function, so Vercel's ~4.5MB request cap
   * never applies and nothing needs shrinking in the browser (owner,
   * 2026-07-30: client-side downscaling defeats the point of a 20MB limit).
   *
   * Falls back to the classic proxied POST when the direct path is
   * unavailable; only that fallback still browser-downscales, since it is
   * the path the platform cap can actually bite.
   */
  async function uploadViaPresign(original: File): Promise<string> {
    const staged = await directUploadPut(original, "post");
    if (staged) {
      const fin = await fetch("/api/upload/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [staged.key] }),
      });
      const data = await fin.json().catch(() => ({}));
      if (fin.ok && data.urls?.[0]) return data.urls[0] as string;
      throw new Error(data.error || `"${original.name}" failed to upload`);
    }
    const shrunk = await downscaleImage(original);
    return uploadOneFile(shrunk);
  }

  async function uploadOneFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`"${file.name}" timed out. Check your connection and try again.`);
      }
      throw new Error(`"${file.name}" failed to upload. Check your connection and try again.`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: null }));
      throw new Error(data.error || `"${file.name}" failed to upload`);
    }

    const { urls } = await res.json();
    return urls[0] as string;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const remaining = 3 - images.length;
    if (fileList.length > remaining) {
      toast.error(`You can add ${remaining} more image${remaining !== 1 ? "s" : ""}`);
      return;
    }

    // Validate the ORIGINAL size up front (skip oversized files individually
    // rather than aborting the whole batch on the first one). 20MB is the
    // real ceiling now that the direct path PUTs originals straight to
    // storage; only the proxied fallback still shrinks in the browser.
    const candidates = Array.from(fileList).slice(0, remaining);
    const valid: File[] = [];
    for (const file of candidates) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`"${file.name}" is over the 20MB limit`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    const uploadedPreviews: string[] = [];

    // One file at a time (sequential): gives a real "uploading N of M"
    // state and means one bad file doesn't sink the others.
    for (let i = 0; i < valid.length; i++) {
      const original = valid[i];
      setUploadProgress({ done: i, total: valid.length });
      try {
        const url = await uploadViaPresign(original);
        uploadedUrls.push(url);
        // Preview from the original file: higher quality than the re-encode,
        // and it is only ever shown locally in the composer.
        uploadedPreviews.push(URL.createObjectURL(original));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      setPreviews((prev) => [...prev, ...uploadedPreviews]);
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(saveAsDraft = false) {
    if (!content.trim()) return;
    if (saveAsDraft) setSavingDraft(true);
    else setSubmitting(true);

    const formData = new FormData();
    formData.set("content", content);
    formData.set("kind", kind);
    if (isLetter && title.trim()) formData.set("title", title.trim());
    if (groupId) formData.set("groupId", groupId);
    if (audienceCity) formData.set("cityScope", audienceCity);
    if (images.length > 0) formData.set("images", JSON.stringify(images));
    if (!isLetter && pollOptions) {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length >= 2) {
        formData.set("pollOptions", JSON.stringify(validOptions));
      }
    }
    // "Save as draft" only ever applies to a letter; the button itself is
    // hidden outside letter mode, but this keeps the payload honest either way.
    if (isLetter && saveAsDraft) formData.set("saveAsDraft", "true");

    const result = await createPost(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      // The editor is uncontrolled contentEditable, so clearing `content` alone
      // does not clear what's on screen: clear the DOM explicitly too.
      if (richRef.current) richRef.current.innerHTML = "";
      setContent("");
      setTitle("");
      setKind(defaultLetter ? "letter" : "post");
      setImages([]);
      setPreviews([]);
      setPollOptions(null);
      setMore(false);
      setAudienceCity(null);
      setSettled(false);
      setExpanded(defaultLetter);
      toast.success(
        saveAsDraft
          ? "Draft saved"
          : isLetter
            ? "Your letter is published"
            : groupId
              ? "Posted to the group"
              : "Post shared!"
      );
      onPosted?.();
    }
    if (saveAsDraft) setSavingDraft(false);
    else setSubmitting(false);
  }

  // The "+" menu only earns its place when it has something to offer: a poll
  // (posts only), the letter toggle (not on the letters page, which is already
  // a letter), and the audience picker (only if this person has cities).
  const canAddPoll = !isLetter;
  const canToggleLetter = !defaultLetter;
  const showMore = canAddPoll || canToggleLetter || audienceOptions.length > 0;

  // One shared shelf for the two icon controls, so the row reads as one hand
  // made it: 36px target (comfortable on a phone), 18px glyph, pill, and the
  // full hover / focus-visible / active set (active comes from SpringPress).
  const iconControl =
    "inline-grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

  // The full editor surface. Shared by the collapsible feed composer and the
  // always-open letter composer, so both read as one hand made them.
  const editorBody = (
    <>
      {isLetter && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title your letter"
          maxLength={160}
          className="mb-2 w-full bg-transparent font-heading text-xl font-bold tracking-[-0.01em] text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
        />
      )}

      {/* The field, with ONE clean focus ring overlay. A contentEditable surface
          (not a textarea) so Bold/Italic/etc. render live: execCommand applies a
          real <b>/<i>/<u>/<s> to the selection, so raw "**" never shows on screen.
          The overlay's inset-0 box traces the field's border box on all four edges. */}
      <div className="group relative rounded-[var(--radius)]">
        <div
          ref={richRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={isLetter ? "Write your letter" : "Write your post"}
          data-empty={content.trim().length === 0 ? "true" : "false"}
          data-placeholder={effectivePlaceholder}
          onInput={handleRichInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          style={{ minHeight: isLetter ? 260 : 96 }}
          className={cn(
            "peer block w-full resize-none whitespace-pre-wrap break-words rounded-[var(--radius)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7] text-foreground outline-none focus-visible:outline-none",
            // Kill WebKit's own tap-highlight flash on touch/trackpad taps: it
            // paints a square-cornered highlight over this rounded field, which
            // reads as an uneven ring (thicker at the corners) for an instant
            // before our own focus ring below has faded in. Outline is already
            // fully suppressed above; this is the other native "ring" source.
            "[-webkit-tap-highlight-color:transparent]",
            "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]"
          )}
        />
        {/* Focus ring, drawn ENTIRELY INSIDE the field's border box (an INSET
            shadow, never an outward spread) and with NO transition, so its very
            first painted frame is already the final, even shape.

            Why inset matters here: the feed composer's expand keeps this field
            inside a wrapper that stays overflow:hidden for the whole ~1s height
            spring (until `settled` flips it to visible). The field is flush to
            that wrapper's top/left/right edges, so any ring that spread OUTWARD
            past the border box got clipped to nothing along those straight edges
            while the rounded corners -- which recede inward from the wrapper's
            square corner -- kept their spread in the corner pocket. That is what
            read as a ring "thicker at the corners" for about a second before the
            wrapper stopped clipping. An inset ring has nothing outside the border
            box to clip, so it is even on every frame, expanding or settled. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[var(--radius)] opacity-0 peer-focus:opacity-100"
          style={{
            boxShadow: "inset 0 0 0 2px color-mix(in srgb, var(--color-leaf) 42%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-leaf) 60%, var(--border))",
          }}
        />
        {mentionQuery !== null && (
          <MentionDropdown query={mentionQuery} onSelect={handleMentionSelect} />
        )}
      </div>

      {/* Staged reveal: everything below the editor rises in as ONE block, on a
          beat's delay after the field fades in, instead of snapping into place
          while the tile is still expanding. */}
      <motion.div
        className="mt-2 space-y-2.5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { ...SPRINGS.settle, delay: 0.16 } }}
      >
        {/* ONE control row. With the formatting icons gone (formatting now comes
            from the phone's own selection bar, Cmd/Ctrl+B/I/U, or markdown typed
            by hand) there is room for Post to sit inline instead of dropping to
            its own line. The two remaining controls are one group -- both are
            "add something to this post" -- so no divider earns its place. */}
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Icon only: the word "Photo" is gone, so the label lives in
                aria-label/title (and carries the live upload progress, which
                used to be the button's text). */}
            <SpringPress
              className={iconControl}
              onClick={() => fileInputRef.current?.click()}
              {...({
                type: "button",
                disabled: images.length >= 3 || uploading,
                title: uploading ? "Uploading..." : "Add a photo",
                "aria-label": uploading
                  ? uploadProgress && uploadProgress.total > 1
                    ? `Uploading photo ${uploadProgress.done + 1} of ${uploadProgress.total}`
                    : "Uploading photo"
                  : "Add a photo",
              } as object)}
            >
              {uploading ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <ImagePlus className="h-[18px] w-[18px]" />
              )}
            </SpringPress>

            {/* The plus opens the same "add to your post" menu (poll, letter,
                audience). Hidden entirely when it would open on nothing. */}
            {showMore && (
              <div className="relative">
                <SpringPress
                  className={cn(iconControl, more && "bg-accent text-foreground")}
                  onClick={() => setMore((m) => !m)}
                  {...({
                    type: "button",
                    title: "Add to your post",
                    "aria-label": "Add to your post",
                    "aria-haspopup": "menu",
                    "aria-expanded": more,
                  } as object)}
                >
                  <motion.span
                    className="inline-grid place-items-center"
                    animate={{ rotate: more ? 45 : 0 }}
                    transition={SPRINGS.snappy}
                  >
                    <Plus className="h-[18px] w-[18px]" />
                  </motion.span>
                </SpringPress>

                <AnimatePresence>
                  {more && (
                    <motion.div
                      role="menu"
                      /* Opens from the plus's LEFT edge, because the plus now sits
                         at the START of the row. Anchored right (as it used to be)
                         it ran off the left of a phone screen. It can never touch
                         either viewport edge now: the card's own padding holds it
                         in on the left, and the max-width holds it in on the right
                         on the narrowest phones. */
                      className="absolute left-0 top-11 z-30 w-52 max-w-[calc(100vw-3.5rem)] rounded-[var(--radius)] border border-border bg-card p-1.5 shadow-lg"
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -3, scale: 0.97 }}
                      transition={SPRINGS.snappy}
                      style={{ transformOrigin: "top left" }}
                    >
                      {canAddPoll && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setPollOptions(pollOptions ? null : ["", ""]);
                            setMore(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] ${
                            pollOptions ? "text-leaf" : "text-foreground"
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>{pollOptions ? "Remove poll" : "Add a poll"}</span>
                        </button>
                      )}
                      {canToggleLetter && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setKind(isLetter ? "post" : "letter");
                            if (!isLetter) setPollOptions(null);
                            setMore(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] ${
                            isLetter ? "text-leaf" : "text-foreground"
                          }`}
                        >
                          <Feather className="h-4 w-4" />
                          <span>{isLetter ? "Back to a post" : "Write as a Letter"}</span>
                        </button>
                      )}
                      {audienceOptions.length > 0 && (
                        <div className="mt-1 border-t border-border pt-1.5" role="group" aria-label="Show to">
                          <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Show to
                          </p>
                          <div className="flex flex-wrap gap-1 px-2 pb-1">
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={!audienceCity}
                              onClick={() => setAudienceCity(null)}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95",
                                !audienceCity
                                  ? "bg-canopy text-white"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              )}
                            >
                              Everyone
                            </button>
                            {audienceOptions.map((city) => (
                              <button
                                key={city}
                                type="button"
                                role="menuitemradio"
                                aria-checked={audienceCity === city}
                                onClick={() => setAudienceCity(city)}
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95",
                                  audienceCity === city
                                    ? "bg-canopy text-white"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                )}
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* A small persistent indicator once an audience is chosen, so it stays
              legible without reopening the "+" menu -- clicking it reopens the
              menu to change or clear it. Truncates rather than pushing Post. */}
          {audienceCity && (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="inline-flex min-w-0 items-center gap-1 rounded-full bg-sky/10 px-2.5 py-1 text-[11.5px] font-semibold text-sky hover:bg-sky/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{audienceCity} only</span>
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Letters only: a quiet way to stop for now without losing the
                piece. Outline pill, one step down from Publish, so it never
                reads as the confident primary action. */}
            {isLetter && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={!content.trim() || submitting || savingDraft}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "px-4 text-sm")}
              >
                {savingDraft ? "Saving..." : "Save as draft"}
              </button>
            )}

            {/* Post sits INLINE, at the end of the same row. Same pill CTA language
                as "New post" (shared buttonVariants, canopy fill, font-medium --
                never bold), but a step down from the page-level CTA's 40px: 36px
                tall with golden-ratio-generous 20px sides, so it reads as the
                confident primary action of the composer without competing with
                the header's own button. Still bespoke/animated (subdued until
                there's text, springs to life) so it can't use <Button> directly. */}
            <motion.button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!content.trim() || submitting || savingDraft}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "px-5 text-sm")}
              animate={{ scale: hasContent ? 1 : 0.97, opacity: hasContent ? 1 : 0.55 }}
              whileTap={hasContent && !submitting ? { scale: 0.94 } : undefined}
              transition={SPRINGS.snappy}
            >
              {submitting
                ? isLetter
                  ? "Publishing..."
                  : "Posting..."
                : isLetter
                  ? "Publish letter"
                  : "Post"}
            </motion.button>
          </div>
        </div>

        {/* Gentle, non-blocking nudge once a post runs long: no red numbers, no
            limits messaging, just a hint that Letters might suit it better.
            Only opacity animates (mounts fresh each time, so the surrounding
            layout reflows once instead of the row height itself animating). */}
        <AnimatePresence>
          {!isLetter && content.length > LETTER_NUDGE_LEN && (
            <motion.p
              key="letter-nudge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.gentle}
              className="text-[13px] leading-snug text-muted-foreground"
            >
              This might make a lovely{" "}
              <Link
                href="/letters"
                className="font-medium text-cinnamon hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-sm"
              >
                Letter
              </Link>
              .
            </motion.p>
          )}
        </AnimatePresence>

        {!isLetter && pollOptions && (
          <PollCreator
            options={pollOptions}
            onChange={setPollOptions}
            onRemove={() => setPollOptions(null)}
          />
        )}

        {previews.length > 0 && (
          <div className="flex gap-2">
            {previews.map((preview, i) => (
              <div key={i} className="relative h-20 w-20">
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );

  // Letters open straight into the editor and never retract, so they skip the
  // pill + height machinery: the surface is simply present (a gentle opacity
  // arrival), and its natural height flows on its own.
  if (defaultLetter) {
    return (
      <div
        ref={rootRef}
        data-composer
        className="card-elevated overflow-visible rounded-[var(--radius)] border border-border bg-card p-4"
      >
        <div className="flex items-start gap-3">
          {currentUser && (
            <BirdAvatar user={currentUser} size="sm" className="mt-0.5 hidden shrink-0 sm:inline-grid" />
          )}
          <motion.div
            className="min-w-0 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            {editorBody}
          </motion.div>
        </div>
      </div>
    );
  }

  // Feed / group composer. ONE clean downward growth on expand, ONE clean
  // contraction on collapse: the box's explicit height springs between the pill
  // height and the measured editor height (no FLIP scale, nothing shrinking up or
  // starting stretched). The pill sits in flow as the collapsed baseline; the
  // editor is an overlay that fades over it while the box grows / shrinks beneath.
  return (
    <div
      ref={rootRef}
      data-composer
      className="card-elevated overflow-visible rounded-[var(--radius)] border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        {currentUser && (
          <BirdAvatar user={currentUser} size="sm" className="mt-0.5 hidden shrink-0 sm:inline-grid" />
        )}
        <motion.div
          className="relative min-w-0 flex-1"
          initial={false}
          animate={{ height: colHeight }}
          transition={SPRINGS.gentle}
          onAnimationComplete={() => setSettled(expanded)}
          style={{ overflow: settled ? "visible" : "hidden" }}
        >
          {/* The pill's own opacity now runs on the SAME spring as the box height
              (SPRINGS.gentle) instead of snapping instantly, so on collapse it
              cross-fades in underneath the editor as the tile shrinks: one clock,
              no children popping into place. `ring-inset` keeps the focus ring
              fully inside the pill's bounds so its rounded caps are never cut off
              by this wrapper's overflow-hidden clipping during expand/collapse. */}
          <motion.button
            ref={tourAnchorRef}
            type="button"
            data-tour={isFeedComposer ? "feed-composer" : undefined}
            onClick={() => expand("post")}
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : 0}
            animate={{ opacity: expanded ? 0 : 1 }}
            transition={SPRINGS.gentle}
            style={{ pointerEvents: expanded ? "none" : undefined }}
            className="flex h-11 w-full min-w-0 items-center rounded-full bg-secondary px-4 text-left text-[14px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:scale-[0.99]"
          >
            <span className="truncate">{collapsedPlaceholder}</span>
          </motion.button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                key="editor"
                ref={editorRef}
                className="absolute inset-x-0 top-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18 } }}
                exit={{ opacity: 0, transition: SPRINGS.gentle }}
              >
                {editorBody}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
