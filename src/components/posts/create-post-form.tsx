"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ImagePlus,
  X,
  BarChart3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Feather,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";

/* ------------------------------------------------------------------ *
 *  Rich text <-> markdown bridge. The editor is a contentEditable
 *  surface so Bold/Italic/Underline/Strikethrough render live (execCommand
 *  applies a real <b>/<i>/<u>/<s> to the selection, so the field never
 *  shows raw "**"). On every input we walk the DOM and serialize it back
 *  to the SAME markdown wire format renderRichText() already expects
 *  (src/lib/utils.ts), so post storage/rendering/search never change.
 *  Mentions stay a literal "@[Name](id) " text insertion, matching the
 *  plain-text behaviour the old textarea already had.
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

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const UPLOAD_TIMEOUT_MS = 60_000;

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
  onPosted,
}: {
  groupId?: string;
  scope?: ComposerScope;
  placeholder?: string;
  defaultLetter?: boolean;
  currentUser?: AvatarUser;
  onPosted?: () => void;
} = {}) {
  // Resolve scope: explicit prop wins, else infer from defaultLetter / groupId.
  const resolvedScope: ComposerScope =
    scope ?? (defaultLetter ? "letter" : groupId ? "group" : "post");
  const collapsedPlaceholder = placeholder ?? SCOPE_PLACEHOLDER[resolvedScope];
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
  const [expanded, setExpanded] = useState(defaultLetter);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [more, setMore] = useState(false); // overflow ("+") menu: poll + letter live here
  // Explicit, measured height for the one clean downward growth / contraction.
  const [colHeight, setColHeight] = useState<number>(COLLAPSED_H);
  // True only once the grow animation has fully settled; gates overflow so the
  // "More" popover can escape the box, while the unfurl/contraction stays clipped.
  const [settled, setSettled] = useState(false);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);

  const isLetter = kind === "letter";
  const maxLen = isLetter ? 20000 : 5000;
  const effectivePlaceholder = isLetter
    ? "Write your letter to the valley. Take your time."
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
    setFmt({ bold: false, italic: false, underline: false, strike: false });
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

  // Live selection-format state, so the toolbar buttons show which formats are
  // active at the caret/selection (bold stays highlighted while typing inside it).
  const syncFmt = useCallback(() => {
    if (typeof document.queryCommandState !== "function") return;
    try {
      setFmt({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
      });
    } catch {
      /* queryCommandState throws when focus is elsewhere; ignore */
    }
  }, []);

  // Apply a live format to the current selection. execCommand is deprecated but
  // remains the simplest reliable way to make the SELECTED TEXT visually bold
  // (or italic/underlined/struck) in place, with no raw markdown ever on screen.
  function applyFormat(command: string) {
    richRef.current?.focus();
    try {
      document.execCommand(command, false);
    } catch {
      /* no-op: unsupported in this browser */
    }
    syncFmt();
    handleRichInput();
  }

  // Force plain-text paste: clipboard formatting never bleeds into the editor,
  // so bold/italic only ever comes from the toolbar (or existing markdown the
  // user types by hand, which still round-trips through renderRichText).
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

    // Validate sizes up front (skip oversized files individually rather than
    // aborting the whole batch on the first one).
    const candidates = Array.from(fileList).slice(0, remaining);
    const valid: File[] = [];
    for (const file of candidates) {
      if (file.size > MAX_IMAGE_BYTES) {
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

    // One request per file (sequential): gives a real "uploading N of M"
    // state and means one bad file doesn't sink the others.
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setUploadProgress({ done: i, total: valid.length });
      try {
        const url = await uploadOneFile(file);
        uploadedUrls.push(url);
        uploadedPreviews.push(URL.createObjectURL(file));
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

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", content);
    formData.set("kind", kind);
    if (isLetter && title.trim()) formData.set("title", title.trim());
    if (groupId) formData.set("groupId", groupId);
    if (images.length > 0) formData.set("images", JSON.stringify(images));
    if (!isLetter && pollOptions) {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length >= 2) {
        formData.set("pollOptions", JSON.stringify(validOptions));
      }
    }

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
      setFmt({ bold: false, italic: false, underline: false, strike: false });
      setMore(false);
      setSettled(false);
      setExpanded(defaultLetter);
      toast.success(
        isLetter ? "Your letter is published" : groupId ? "Posted to the group" : "Post shared!"
      );
      onPosted?.();
    }
    setSubmitting(false);
  }

  // The four inline formatting controls. Each maps to a live execCommand plus
  // the fmt-state key that reports whether it's active at the current selection.
  const fmtButtons: { key: keyof typeof fmt; command: string; icon: ReactNode; label: string }[] = [
    { key: "bold", command: "bold", icon: <Bold className="h-4 w-4" />, label: "Bold" },
    { key: "italic", command: "italic", icon: <Italic className="h-4 w-4" />, label: "Italic" },
    { key: "underline", command: "underline", icon: <Underline className="h-4 w-4" />, label: "Underline" },
    { key: "strike", command: "strikeThrough", icon: <Strikethrough className="h-4 w-4" />, label: "Strikethrough" },
  ];

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
          onKeyUp={syncFmt}
          onMouseUp={syncFmt}
          onPaste={handlePaste}
          style={{ minHeight: isLetter ? 260 : 96 }}
          className={cn(
            "peer block w-full resize-none whitespace-pre-wrap break-words rounded-[var(--radius)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7] text-foreground outline-none",
            "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]"
          )}
        />
        {/* focus ring lives as an overlay so only opacity/transform animate, and
            there is never a stray second box behind the field */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-center scale-[0.992] rounded-[var(--radius)] opacity-0 transition-[opacity,transform] duration-200 ease-out peer-focus:scale-100 peer-focus:opacity-100"
          style={{
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-leaf) 26%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-leaf) 55%, var(--border))",
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Formatting: plain icons, no boxed group. Active format highlights
              canopy with a small underline dot; hover/idle colors unchanged. */}
          <div className="flex w-fit shrink-0 items-center gap-0.5">
            {fmtButtons.map((b) => (
              <SpringPress
                key={b.key}
                className={cn(
                  "relative inline-grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  fmt[b.key] &&
                    "text-canopy after:absolute after:bottom-1 after:left-1/2 after:h-[3px] after:w-[3px] after:-translate-x-1/2 after:rounded-full after:bg-canopy"
                )}
                onClick={() => applyFormat(b.command)}
                {...({
                  type: "button",
                  title: b.label,
                  "aria-label": b.label,
                  "aria-pressed": fmt[b.key],
                } as object)}
              >
                {b.icon}
              </SpringPress>
            ))}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:flex-1 sm:justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />

            <Button
              variant="ghost"
              size="xs"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 3 || uploading}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading
                ? uploadProgress && uploadProgress.total > 1
                  ? `Uploading ${uploadProgress.done + 1} of ${uploadProgress.total}...`
                  : "Uploading..."
                : "Photo"}
            </Button>

            {/* "More" is now a plain, unboxed plus that opens a labelled menu
                (icon + label rows), so it reads the same as the format icons
                rather than a separate boxed control. */}
            <div className="relative">
              <SpringPress
                className={cn(
                  "inline-grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  more && "bg-accent text-foreground"
                )}
                onClick={() => setMore((m) => !m)}
                {...({
                  type: "button",
                  "aria-label": "Add to your post",
                  "aria-expanded": more,
                } as object)}
              >
                <motion.span
                  className="inline-grid place-items-center"
                  animate={{ rotate: more ? 45 : 0 }}
                  transition={SPRINGS.snappy}
                >
                  <Plus className="h-4 w-4" />
                </motion.span>
              </SpringPress>

              <AnimatePresence>
                {more && (
                  <motion.div
                    className="absolute right-0 top-10 z-30 w-52 rounded-[var(--radius)] border border-border bg-card p-1.5 shadow-lg"
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -3, scale: 0.97 }}
                    transition={SPRINGS.snappy}
                    style={{ transformOrigin: "top right" }}
                  >
                    {!isLetter && (
                      <button
                        type="button"
                        onClick={() => {
                          setPollOptions(pollOptions ? null : ["", ""]);
                          setMore(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-accent ${
                          pollOptions ? "text-leaf" : "text-foreground"
                        }`}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>{pollOptions ? "Remove poll" : "Add a poll"}</span>
                      </button>
                    )}
                    {!defaultLetter && (
                      <button
                        type="button"
                        onClick={() => {
                          setKind(isLetter ? "post" : "letter");
                          if (!isLetter) setPollOptions(null);
                          setMore(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-accent ${
                          isLetter ? "text-leaf" : "text-foreground"
                        }`}
                      >
                        <Feather className="h-4 w-4" />
                        <span>{isLetter ? "Back to a post" : "Write as a Letter"}</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 self-end sm:self-auto">
            {content.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {content.length}/{maxLen}
              </span>
            )}
            {/* A clean pill Post button: quiet/disabled until there is text, then
                it springs to life. Keeps the existing disabled/submitting logic.
                Canopy fill, matching the shared Button's primary variant
                (this button is bespoke/animated so it can't use <Button> directly). */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="inline-flex h-10 items-center rounded-full border-0 px-[22px] text-[14px] font-bold text-white"
              style={{
                background: "var(--color-canopy)",
                cursor: hasContent && !submitting ? "pointer" : "default",
                boxShadow:
                  hasContent && !submitting
                    ? "0 6px 16px -11px var(--color-canopy), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent)"
                    : "none",
              }}
              animate={{ scale: hasContent ? 1 : 0.97, opacity: hasContent ? 1 : 0.55 }}
              whileHover={hasContent && !submitting ? { scale: 1.03 } : undefined}
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
            type="button"
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
