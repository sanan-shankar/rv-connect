"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock, ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createGroup } from "@/app/(main)/groups/actions";

interface BatchYear {
  year: number;
  count: number;
}

interface Props {
  batchYears: BatchYear[];
  currentUserId: string;
}

export function CreateGroupForm({ batchYears, currentUserId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleBatch(year: number) {
    setSelectedBatches((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Upload failed");
      } else {
        const { urls } = await res.json();
        setCoverImage(urls[0]);
      }
    } catch {
      toast.error("Failed to upload cover");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    setSubmitting(true);

    // Resolve selected batches to member ids (the creator is always added server-side).
    let memberIds: string[] = [currentUserId];
    if (selectedBatches.length > 0) {
      try {
        const res = await fetch(
          `/api/users-by-batch?batches=${selectedBatches.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          memberIds = [...new Set([currentUserId, ...data.userIds])];
        }
      } catch {
        // fall back to just the creator
      }
    }

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("visibility", visibility);
    if (coverImage) formData.set("coverImage", coverImage);
    formData.set("memberIds", JSON.stringify(memberIds));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      setSubmitting(false);
    } else {
      toast.success("Group created");
      router.push(`/groups/${result.groupId}`);
    }
  }

  return (
    <div className="card-elevated space-y-5 rounded-[var(--radius)] border border-border bg-card p-6">
      {/* Cover */}
      <div>
        <Label className="mb-1.5 block">Cover image (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCover}
        />
        {coverImage ? (
          <div className="relative h-28 w-full overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverImage(null)}
              className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
              aria-label="Remove cover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-28 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-gradient-to-br from-leaf/12 via-sky/8 to-cinnamon/8 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add a cover"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bengaluru circle"
          maxLength={80}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this group about?"
          rows={2}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label>Who can join</Label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(
            [
              {
                value: "public" as const,
                icon: Globe,
                title: "Public",
                blurb: "Anyone can find it and join.",
              },
              {
                value: "private" as const,
                icon: Lock,
                title: "Private",
                blurb: "Invite-only, hidden from browse.",
              },
            ]
          ).map((opt) => {
            const active = visibility === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-canopy bg-canopy/8"
                    : "border-border bg-card hover:border-canopy/40"
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    active ? "text-canopy" : "text-muted-foreground"
                  )}
                />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {opt.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{opt.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add by batch */}
      {batchYears.length > 0 && (
        <div className="space-y-2">
          <Label>Add batches now (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Everyone from a selected batch is added. You can also invite people
            later from the group page.
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {batchYears.map(({ year, count }) => {
              const selected = selectedBatches.includes(year);
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleBatch(year)}
                  className={cn(
                    "relative flex flex-col items-center rounded-lg border p-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected
                      ? "border-canopy bg-canopy/10 text-canopy"
                      : "border-border bg-card text-foreground hover:border-canopy/40"
                  )}
                >
                  {selected && (
                    <Check className="absolute right-1 top-1 h-3 w-3" />
                  )}
                  <span className="font-heading text-sm font-bold">
                    &apos;{String(year).slice(-2)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button onClick={handleSubmit} disabled={submitting} variant="primary">
          {submitting ? "Creating..." : "Create group"}
        </Button>
      </div>
    </div>
  );
}
