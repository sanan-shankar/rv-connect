"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, BarChart3, Bold, Italic, Feather, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";

/** Where the composer is posting. Drives the placeholder and the available affordances. */
export type ComposerScope = "post" | "group" | "letter";

const TAGS = [
  { value: "campus-memory", label: "Campus Memory", color: "bg-leaf/10 text-leaf" },
  { value: "life-update", label: "Life Update", color: "bg-cinnamon/10 text-cinnamon" },
  { value: "looking-for-connections", label: "Looking for Connections", color: "bg-sky/10 text-sky" },
  { value: "photo", label: "Photo", color: "bg-sky/10 text-sky" },
  { value: "general", label: "General", color: "bg-muted text-muted-foreground" },
];

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
  const collapsedPlaceholder =
    placeholder ?? SCOPE_PLACEHOLDER[resolvedScope];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLetter = kind === "letter";
  const maxLen = isLetter ? 20000 : 5000;
  const effectivePlaceholder = isLetter
    ? "Write your letter to the valley. Take your time."
    : collapsedPlaceholder;

  function expand(startKind?: "post" | "letter") {
    if (startKind) setKind(startKind);
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

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
    const after = content.slice(
      mentionStart + (mentionQuery?.length ?? 0) + 1
    );
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
      setExpanded(defaultLetter);
      toast.success(
        isLetter ? "Your letter is published" : groupId ? "Posted to the group" : "Post shared!"
      );
      onPosted?.();
    }
    setSubmitting(false);
  }

  // Collapsed: a single pill row (avatar + placeholder + Photo/Poll/Letter), expands on click.
  // Letters default to expanded, so they skip the pill and open straight into the editor.
  if (!expanded) {
    return (
      <div
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
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => expand("post")}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
          >
            <ImageIcon className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => expand("post")}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
          >
            <BarChart3 className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Poll</span>
          </button>
          {/* Letters can be written in the main feed and in a group (carrying
              groupId). The group read view gates group letters to members. */}
          <button
            type="button"
            onClick={() => expand("letter")}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
          >
            <Feather className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Letter</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-composer
      className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
    >
      {expanded && (
        <div className="mb-1 flex gap-1">
          <button
            type="button"
            onClick={() => wrapSelection("**")}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("*")}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
        </div>
      )}
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
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder={effectivePlaceholder}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onFocus={() => setExpanded(true)}
          rows={isLetter ? 10 : expanded ? 4 : 2}
          maxLength={maxLen}
          className="w-full resize-none bg-transparent text-base leading-[1.7] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {mentionQuery !== null && (
          <MentionDropdown
            query={mentionQuery}
            onSelect={handleMentionSelect}
          />
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Tags (not for letters) */}
          {!isLetter && (
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTag(tag === t.value ? null : t.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    tag === t.value
                      ? `${t.color} ring-2 ring-ring`
                      : "bg-muted text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Poll creator */}
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
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex gap-2">
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
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 3 || uploading}
              >
                <ImagePlus className="mr-1 h-4 w-4" />
                {uploading ? "Uploading..." : "Photo"}
              </Button>
              {!isLetter && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setPollOptions(pollOptions ? null : ["", ""])}
                  className={pollOptions ? "text-leaf" : ""}
                >
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Poll
                </Button>
              )}
              {!defaultLetter && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setKind(isLetter ? "post" : "letter");
                    if (!isLetter) setPollOptions(null);
                  }}
                  className={isLetter ? "text-leaf" : ""}
                >
                  <Feather className="mr-1 h-4 w-4" />
                  Letter
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.length}/{maxLen}
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                variant="leaf"
                size="sm"
              >
                {submitting ? (isLetter ? "Publishing..." : "Posting...") : isLetter ? "Publish letter" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
