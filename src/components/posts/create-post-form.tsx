"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  X,
  BarChart3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Feather,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";

/** Where the composer is posting. Drives the placeholder and the available affordances. */
export type ComposerScope = "post" | "group" | "letter";

// Height of the resting pill (h-11). The expand animation grows the box DOWN from
// exactly this height, and collapse contracts back to it, so nothing ever shrinks
// up first or starts stretched.
const COLLAPSED_H = 44;

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
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(defaultLetter);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [more, setMore] = useState(false); // overflow ("+") menu: poll + letter live here
  // Explicit, measured height for the one clean downward growth / contraction.
  const [colHeight, setColHeight] = useState<number>(COLLAPSED_H);
  // True only once the grow animation has fully settled; gates overflow so the
  // "More" popover can escape the box, while the unfurl/contraction stays clipped.
  const [settled, setSettled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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
    setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 0);
  }

  // Collapse back to the resting pill, closing any open popovers. Letters
  // default to expanded, so they never retract to a pill.
  const collapse = useCallback(() => {
    setMore(false);
    setSettled(false);
    if (!defaultLetter) setExpanded(false);
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

  function wrapSelection(wrapper: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);
    const newContent = before + wrapper + selected + wrapper + after;
    setContent(newContent);
    setTimeout(() => {
      el.selectionStart = start + wrapper.length;
      el.selectionEnd = end + wrapper.length;
      el.focus();
    }, 0);
  }

  function handleContentChange(value: string) {
    setContent(value);
    const el = textareaRef.current;
    if (!el) {
      setMentionQuery(null);
      return;
    }
    const cursorPos = el.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[1].length - 1);
    } else {
      setMentionQuery(null);
    }
  }

  function handleMentionSelect(user: { id: string; name: string }) {
    const before = content.slice(0, mentionStart);
    const after = content.slice(mentionStart + (mentionQuery?.length ?? 0) + 1);
    const mention = `@[${user.name}](${user.id}) `;
    const newContent = before + mention + after;
    setContent(newContent);
    setMentionQuery(null);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = before.length + mention.length;
        el.selectionStart = pos;
        el.selectionEnd = pos;
        el.focus();
      }
    }, 0);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 3 - images.length;
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more image${remaining !== 1 ? "s" : ""}`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    const localPreviews: string[] = [];

    for (const file of Array.from(files).slice(0, remaining)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Each image must be under 5MB");
        setUploading(false);
        return;
      }
      formData.append("files", file);
      localPreviews.push(URL.createObjectURL(file));
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Upload failed");
        return;
      }

      const { urls } = await res.json();
      setImages((prev) => [...prev, ...urls]);
      setPreviews((prev) => [...prev, ...localPreviews]);
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      setContent("");
      setTitle("");
      setKind(defaultLetter ? "letter" : "post");
      setImages([]);
      setPreviews([]);
      setPollOptions(null);
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

  // The four inline formatting controls. Bold/italic/underline/strikethrough map
  // to markdown wrappers that renderRichText (and the letter strip regex) handle.
  const fmtButtons: { wrapper: string; icon: React.ReactNode; label: string }[] = [
    { wrapper: "**", icon: <Bold className="h-4 w-4" />, label: "Bold" },
    { wrapper: "*", icon: <Italic className="h-4 w-4" />, label: "Italic" },
    { wrapper: "__", icon: <Underline className="h-4 w-4" />, label: "Underline" },
    { wrapper: "~~", icon: <Strikethrough className="h-4 w-4" />, label: "Strikethrough" },
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

      {/* The field, with ONE clean focus ring overlay. The textarea is `block` so
          its wrapper carries no inline descender gap: the overlay's inset-0 box
          traces the textarea's border box exactly on all four edges. */}
      <div className="group relative rounded-[var(--radius)]">
        <textarea
          ref={textareaRef}
          placeholder={effectivePlaceholder}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={isLetter ? 10 : 4}
          maxLength={maxLen}
          className="peer block w-full resize-none rounded-[var(--radius)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7] text-foreground placeholder:text-muted-foreground focus:outline-none"
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

      <div className="mt-2 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <motion.div
            className="flex w-fit shrink-0 items-center gap-0.5 rounded-[10px] border border-border bg-secondary p-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.settle, delay: 0.05 }}
          >
            {fmtButtons.map((b) => (
              <SpringPress
                key={b.wrapper}
                className="inline-grid h-7 w-7 place-items-center rounded-[7px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => wrapSelection(b.wrapper)}
                {...({ type: "button", title: b.label, "aria-label": b.label } as object)}
              >
                {b.icon}
              </SpringPress>
            ))}
          </motion.div>

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
              {uploading ? "Uploading..." : "Photo"}
            </Button>

            <div className="relative">
              <SpringPress
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  more
                    ? "border-leaf/50 bg-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setMore((m) => !m)}
                {...({
                  type: "button",
                  "aria-label": "More post options",
                  "aria-expanded": more,
                } as object)}
              >
                More
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${more ? "rotate-180" : ""}`}
                />
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
      </div>
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
          <button
            type="button"
            onClick={() => expand("post")}
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : 0}
            style={{ opacity: expanded ? 0 : 1, pointerEvents: expanded ? "none" : undefined }}
            className="flex h-11 w-full min-w-0 items-center rounded-full bg-secondary px-4 text-left text-[14px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
          >
            <span className="truncate">{collapsedPlaceholder}</span>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                key="editor"
                ref={editorRef}
                className="absolute inset-x-0 top-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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
