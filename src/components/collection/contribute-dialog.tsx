"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SUBJECTS, AREAS, ERAS } from "@/lib/collection";
import { contributePhoto } from "@/app/(main)/collection/actions";

export function ContributeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [area, setArea] = useState<string>("");
  const [era, setEra] = useState<string>("unknown");
  const [caption, setCaption] = useState("");
  const [freeTags, setFreeTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSubjects([]);
    setArea("");
    setEra("unknown");
    setCaption("");
    setFreeTags("");
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Photo must be under 15MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function toggleSubject(v: string) {
    setSubjects((prev) =>
      prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
    );
  }

  async function handleSubmit() {
    if (!file) return toast.error("Choose a photo first");
    if (subjects.length === 0) return toast.error("Pick at least one subject");
    setSubmitting(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("subject", JSON.stringify(subjects));
    if (area) fd.set("area", area);
    fd.set("era", era);
    if (caption.trim()) fd.set("caption", caption.trim());
    if (freeTags.trim()) fd.set("freeTags", freeTags.trim());

    const result = await contributePhoto(fd);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.autoApprove
        ? "Added to the Collection"
        : "Thank you. An admin will review it shortly."
    );
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Contribute a photo</DialogTitle>
          <DialogDescription>
            What is this, and where in the valley? The Collection is for the place itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-64 w-full object-cover" />
              <button
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  setFile(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-paper/50 py-10 text-muted-foreground transition-colors hover:border-leaf/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Choose a photo (up to 15MB)</span>
            </button>
          )}

          {/* Subjects */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              What is in it?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSubject(s.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    subjects.includes(s.value)
                      ? "bg-leaf text-white"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area + Era */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                Part of school
              </label>
              <Select value={area} onValueChange={(v) => setArea(v ?? "")}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                Roughly when?
              </label>
              <Select value={era} onValueChange={(v) => setEra(v ?? "unknown")}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERAS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Caption
            </label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="The banyan after the first rain..."
              maxLength={300}
              className="bg-card"
            />
          </div>

          {/* Free tags */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Bird or species names <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={freeTags}
              onChange={(e) => setFreeTags(e.target.value)}
              placeholder="hoopoe, paradise flycatcher"
              maxLength={200}
              className="bg-card"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !file || subjects.length === 0}
            variant="primary"
            className="w-full"
          >
            {submitting ? "Adding..." : "Add to the Collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
