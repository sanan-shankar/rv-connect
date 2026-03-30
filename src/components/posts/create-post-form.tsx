"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, BarChart3, Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/feed/actions";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";

const TAGS = [
  { value: "campus-memory", label: "Campus Memory", color: "bg-leaf/10 text-leaf" },
  { value: "life-update", label: "Life Update", color: "bg-bark/10 text-bark" },
  { value: "looking-for-connections", label: "Looking for Connections", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "photo", label: "Photo", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  { value: "general", label: "General", color: "bg-muted text-muted-foreground" },
];

export function CreatePostForm() {
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (tag) formData.set("tag", tag);
    if (images.length > 0) formData.set("images", JSON.stringify(images));
    if (pollOptions) {
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
      setImages([]);
      setPreviews([]);
      setPollOptions(null);
      setExpanded(false);
      toast.success("Post shared!");
    }
    setSubmitting(false);
  }

  return (
    <div className="glass rounded-xl p-4">
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
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder="Share a story, memory, or update..."
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onFocus={() => setExpanded(true)}
          rows={expanded ? 4 : 2}
          maxLength={5000}
          className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
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
          {/* Tags */}
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

          {/* Poll creator */}
          {pollOptions && (
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
          <div className="flex items-center justify-between border-t border-white/20 pt-3 dark:border-white/10">
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
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() =>
                  setPollOptions(pollOptions ? null : ["", ""])
                }
                className={pollOptions ? "text-leaf" : ""}
              >
                <BarChart3 className="mr-1 h-4 w-4" />
                Poll
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.length}/5000
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                variant="leaf"
                size="sm"
              >
                {submitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
