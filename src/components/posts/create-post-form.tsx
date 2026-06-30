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
  Image as ImageIcon,
  Plus,
  Tag as TagIcon,
  Check,
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

// One quiet tag, chosen from a small popover (presets plus free text). The tag
// state still flows into the FormData exactly as before; only the picker changed.
const TAG_PRESETS = ["Memory", "School update", "Looking for connections"];

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
  const [tag, setTag] = useState<string | null>(null);
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
  const [tagOpen, setTagOpen] = useState(false); // tag picker popover
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const isLetter = kind === "letter";
  const maxLen = isLetter ? 20000 : 5000;
  const effectivePlaceholder = isLetter
    ? "Write your letter to the valley. Take your time."
    : collapsedPlaceholder;
  const hasContent = content.trim().length > 0;

  function expand(startKind?: "post" | "letter") {
    if (startKind) setKind(startKind);
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // Collapse back to the resting pill, closing any open popovers. Letters
  // default to expanded, so they never retract to a pill.
  const collapse = useCallback(() => {
    setMore(false);
    setTagOpen(false);
    if (!defaultLetter) setExpanded(false);
  }, [defaultLetter]);

  // Outside-click + Escape. Empty + outside click (or Escape with nothing open)
  // retracts to the pill; if the user has typed, an outside click only closes a
  // popover so a draft is never lost to a stray click.
  useEffect(() => {
    if (!expanded) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (!hasContent) collapse();
        else {
          setMore(false);
          setTagOpen(false);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (tagOpen) setTagOpen(false);
      else if (more) setMore(false);
      else if (!hasContent) collapse();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, hasContent, more, tagOpen, collapse]);

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
    if (tag) formData.set("tag", tag);
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
      setTag(null);
      setTitle("");
      setKind(defaultLetter ? "letter" : "post");
      setImages([]);
      setPreviews([]);
      setPollOptions(null);
      setMore(false);
      setTagOpen(false);
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

  // Collapsed: a single pill row (avatar + placeholder + a quiet Photo control),
  // expands on click. Letters default to expanded, so they skip the pill.
  if (!expanded) {
    return (
      <div
        ref={rootRef}
        data-composer
        className="card-elevated flex items-center gap-3 rounded-full border border-border bg-card py-2 pl-3 pr-2"
      >
        {currentUser && (
          <BirdAvatar user={currentUser} size="sm" className="hidden sm:inline-grid" />
        )}
        <button
          type="button"
          onClick={() => expand("post")}
          className="min-w-0 flex-1 truncate rounded-full py-1.5 text-left text-[14px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
        >
          {collapsedPlaceholder}
        </button>
        <button
          type="button"
          onClick={() => expand("post")}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          <ImageIcon className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">Photo</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-composer
      className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
    >
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={SPRINGS.gentle}
        style={{ overflow: "visible" }}
      >
        {/* Inline formatting bar: reveals with the field, not stranded */}
        <motion.div
          className="mb-2 flex gap-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRINGS.settle, delay: 0.05 }}
        >
          {fmtButtons.map((b) => (
            <SpringPress
              key={b.wrapper}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => wrapSelection(b.wrapper)}
              {...({ type: "button", title: b.label, "aria-label": b.label } as object)}
            >
              {b.icon}
            </SpringPress>
          ))}
        </motion.div>

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

        {/* The field, with ONE clean focus ring overlay (no stray second box) */}
        <div className="group relative rounded-[calc(var(--radius)-2px)]">
          <textarea
            ref={textareaRef}
            placeholder={effectivePlaceholder}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={isLetter ? 10 : 4}
            maxLength={maxLen}
            className="peer w-full resize-none rounded-[calc(var(--radius)-2px)] bg-transparent px-0.5 text-base leading-[1.7] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {/* focus ring lives as an overlay so only opacity/transform animate */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[calc(var(--radius)-2px)] opacity-0 transition-opacity duration-200 ease-out peer-focus:opacity-100"
            style={{
              boxShadow: "0 0 0 2.5px color-mix(in srgb, var(--color-leaf) 22%, transparent)",
            }}
          />
          {mentionQuery !== null && (
            <MentionDropdown query={mentionQuery} onSelect={handleMentionSelect} />
          )}
        </div>

        <div className="mt-3 space-y-3">
          {/* Poll creator (poll lives behind the + menu; PollCreator unchanged) */}
          {!isLetter && pollOptions && (
            <PollCreator
              options={pollOptions}
              onChange={setPollOptions}
              onRemove={() => setPollOptions(null)}
            />
          )}

          {/* Image previews */}
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

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* One quiet Photo control stays on the surface */}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 3 || uploading}
              >
                <ImagePlus className="mr-1 h-4 w-4" />
                {uploading ? "Uploading..." : "Photo"}
              </Button>

              {/* "+" more menu: poll (in overflow) and letter toggle tuck here */}
              <div className="relative">
                <SpringPress
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    more ? "bg-accent text-foreground" : ""
                  }`}
                  onClick={() => {
                    setMore((m) => !m);
                    setTagOpen(false);
                  }}
                  {...({
                    type: "button",
                    "aria-label": "More options",
                    "aria-expanded": more,
                  } as object)}
                >
                  <motion.span
                    animate={{ rotate: more ? 45 : 0 }}
                    transition={SPRINGS.snappy}
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      transformBox: "view-box",
                      transformOrigin: "center",
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </SpringPress>

                <AnimatePresence>
                  {more && (
                    <motion.div
                      className="absolute bottom-11 left-0 z-30 w-52 rounded-[var(--radius)] border border-border bg-card p-1.5 shadow-lg"
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={SPRINGS.snappy}
                      style={{ transformOrigin: "bottom left" }}
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

              {/* Low-profile single tag (not for letters): zero footprint when unset */}
              {!isLetter && (
                <div className="relative">
                  {tag ? (
                    <motion.span
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-leaf/35 bg-leaf/10 pl-3 pr-1.5 text-xs font-semibold text-leaf"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={SPRINGS.snappy}
                    >
                      <TagIcon className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        aria-label="Remove tag"
                        onClick={() => setTag(null)}
                        className="inline-grid h-4 w-4 place-items-center rounded-full text-leaf hover:bg-leaf/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  ) : (
                    <>
                      <SpringPress
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                          tagOpen
                            ? "border-leaf/50 text-leaf"
                            : "border-border text-muted-foreground hover:border-leaf/50 hover:text-leaf"
                        }`}
                        onClick={() => {
                          setTagOpen((t) => !t);
                          setMore(false);
                        }}
                        {...({
                          type: "button",
                          "aria-expanded": tagOpen,
                        } as object)}
                      >
                        <TagIcon className="h-3 w-3" />
                        Add a tag
                      </SpringPress>

                      <AnimatePresence>
                        {tagOpen && (
                          <motion.div
                            className="absolute bottom-10 left-0 z-30 w-56 rounded-[var(--radius)] border border-border bg-card p-2 shadow-lg"
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={SPRINGS.snappy}
                            style={{ transformOrigin: "bottom left" }}
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {TAG_PRESETS.map((p) => (
                                <SpringPress
                                  key={p}
                                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:border-leaf/50 hover:text-leaf"
                                  onClick={() => {
                                    setTag(p);
                                    setTagOpen(false);
                                  }}
                                  {...({ type: "button" } as object)}
                                >
                                  {p}
                                </SpringPress>
                              ))}
                            </div>
                            <form
                              className="mt-2 flex gap-1.5"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const v = tagInputRef.current?.value.trim();
                                if (v) {
                                  setTag(v);
                                  setTagOpen(false);
                                }
                              }}
                            >
                              <input
                                ref={tagInputRef}
                                placeholder="or type your own"
                                maxLength={24}
                                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-secondary px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-leaf/50 focus:outline-none"
                              />
                              <button
                                type="submit"
                                aria-label="Add tag"
                                className="inline-grid h-8 w-8 place-items-center rounded-md bg-leaf text-white"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.length}/{maxLen}
                </span>
              )}
              {/* Quiet until there is content, then springs to life */}
              <motion.div
                animate={{ scale: hasContent ? 1 : 0.97, opacity: hasContent ? 1 : 0.6 }}
                whileTap={hasContent && !submitting ? { scale: 0.94 } : undefined}
                transition={SPRINGS.snappy}
                style={{ transformOrigin: "center" }}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  variant="leaf"
                  size="sm"
                >
                  {submitting
                    ? isLetter
                      ? "Publishing..."
                      : "Posting..."
                    : isLetter
                      ? "Publish letter"
                      : "Post"}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
