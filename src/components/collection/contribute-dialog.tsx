"use client";

import { useState } from "react";
import { shrinkForUpload } from "@/lib/image-downscale";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AttachImageWell } from "@/components/common/attach-image-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { BUCKETS, ERAS, PHOTO_YEAR_MIN, eraLabel } from "@/lib/collection";
import { contributePhoto, contributePhotoDirect } from "@/app/(main)/collection/actions";
import { directUploadPut } from "@/lib/upload-client";
import {MAX_UPLOAD_BYTES, isImageFile} from "@/lib/upload-shared";
import { cn, valleyYear } from "@/lib/utils";


const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NOT_SURE = "not-sure";
const NO_MONTH = "no-month";

function currentYear() {
  // The valley's year, matching the server validator that will judge this
  // choice: the browser's own year is a day ahead or behind for members
  // reading from the wrong side of a timezone at the turn of the year.
  return valleyYear();
}

function yearOptions(): number[] {
  const years: number[] = [];
  for (let y = currentYear(); y >= PHOTO_YEAR_MIN; y--) years.push(y);
  return years;
}

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
  const [caption, setCaption] = useState("");
  const [area, setArea] = useState("");
  /* Which of the six this photograph is. Several are allowed -- a photograph
     of the banyan with people under it is both -- and none is also allowed,
     because a contribution refused for want of a tag is a contribution that
     does not happen. */
  const [buckets, setBuckets] = useState<string[]>([]);
  // "When": either an exact year (+ optional month), or -- if not sure -- a
  // decade fallback from ERAS. yearChoice holds NOT_SURE until a real year is
  // picked, which is when the (optional) month select appears.
  const [yearChoice, setYearChoice] = useState<string>(NOT_SURE);
  const [monthChoice, setMonthChoice] = useState<string>(NO_MONTH);
  const [decade, setDecade] = useState<string>("unknown");
  const [submitting, setSubmitting] = useState(false);
  // Uploading is the costliest thing an account can do, so it is gated on a
  // confirmed address at the presign route, the finalize route and the action.
  const emailGate = useEmailGate();

  function reset() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaption("");
    setArea("");
    setBuckets([]);
    setYearChoice(NOT_SURE);
    setMonthChoice(NO_MONTH);
    setDecade("unknown");
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (!isImageFile(f)) {
      toast.error("Please choose an image");
      return;
    }
    if (f.type === "image/heic" || f.type === "image/heif" || /\.hei[cf]$/i.test(f.name)) {
      toast.error('HEIC photos aren\'t supported yet. Export as JPG or PNG (or turn off "High Efficiency" in your camera settings).');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      toast.error(`Photo must be under 20MB (this one is ${(f.size / (1024 * 1024)).toFixed(1)}MB)`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  /** Date fields exactly as contributePhoto's FormData path encodes them. */
  function dateMeta(): { era?: string; datePrecision?: string; photoYear?: number; photoMonth?: number } {
    if (yearChoice !== NOT_SURE) {
      const monthIndex = MONTHS.indexOf(monthChoice); // -1 when NO_MONTH
      return monthIndex >= 0
        ? { photoYear: Number(yearChoice), photoMonth: monthIndex + 1, datePrecision: "month" }
        : { photoYear: Number(yearChoice), datePrecision: "year" };
    }
    return { era: decade, datePrecision: decade === "unknown" ? "unknown" : "decade" };
  }

  async function handleSubmit() {
    if (!file) return toast.error("Choose a photo first");
    setSubmitting(true);

    let result: Awaited<ReturnType<typeof contributePhoto>>;
    try {
      // Preferred path: presigned PUT straight to storage (the shared
      // `directUploadPut` helper), so the FULL RESOLUTION original lands
      // there untouched (Vercel's ~4.5MB request cap never sees the bytes).
      // A null return means the direct path is unavailable for this request
      // (local dev without R2, or an origin the bucket's CORS rule does not
      // name) and the classic server-proxied path picks the upload up instead.
      const staged = await directUploadPut(file, "collection");

      if (staged) {
        result = await contributePhotoDirect({
          key: staged.key,
          caption: caption.trim() || undefined,
          area: area.trim() || undefined,
          buckets,
          ...dateMeta(),
        });
      } else {
        // The fallback carries the bytes through our own server, where Vercel
        // refuses a body over about 4.5MB before the action runs -- so a full
        // resolution original, which is exactly what the Collection wants,
        // cannot go this way (bug audit, Low 62). Shrink it rather than lose
        // the contribution, and say so, because for a heritage archive the
        // difference between the original and a 2048px copy is worth knowing.
        const ready = await shrinkForUpload([file]);
        if (!ready.ok) {
          setSubmitting(false);
          toast.error(ready.error);
          return;
        }
        if (ready.files[0].size < file.size) {
          toast("Uploading a smaller copy of this photo", {
            description: "The full-size original could not be sent from here.",
          });
        }
        const fd = new FormData();
        fd.set("file", ready.files[0]);
        if (caption.trim()) fd.set("caption", caption.trim());
        if (area.trim()) fd.set("area", area.trim());
        for (const b of buckets) fd.append("buckets", b);
        const meta = dateMeta();
        if (meta.photoYear !== undefined) fd.set("photoYear", String(meta.photoYear));
        if (meta.photoMonth !== undefined) fd.set("photoMonth", String(meta.photoMonth));
        if (meta.era) fd.set("era", meta.era);
        if (meta.datePrecision) fd.set("datePrecision", meta.datePrecision);
        result = await contributePhoto(fd);
      }
    } catch (err) {
      setSubmitting(false);
      // directUploadPut throws with a real message for definitive verdicts
      // (unsupported format, over the limit); otherwise the bytes were
      // dropped mid-flight, where a lost connection and an oversized body
      // look identical, so name both possibilities.
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "The upload didn't make it through. The photo may be too large, or the connection dropped. Try again."
      );
      return;
    }
    setSubmitting(false);
    if (result.error) {
      // An unconfirmed address is refused by both the presign route and the
      // contribute action; the dialog carries the fix, everything else is a toast.
      if (!emailGate.handled(result.error)) toast.error(result.error);
      return;
    }
    toast.success(
      result.autoApprove
        ? "Added to the Collection"
        : "Thank you. An admin will review it shortly."
    );
    // Anything the server changed about the photograph, said out loud: an
    // animated GIF has just been flattened to its first frame (audit C-073).
    if (result.notice) toast.info(result.notice);
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <>
    {emailGate.dialog}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Contribute a photo</DialogTitle>
          <DialogDescription>
            What is this, and when? The Collection is the valley&rsquo;s whole
            visual memory, people included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File: the dialog is already open, so this embeds the shared
              pick surface directly rather than nesting a second dialog
              inside it. */}
          {preview ? (
            <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-64 w-full object-cover" />
              <button
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  setFile(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background transition-[background-color,transform] hover:bg-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <AttachImageWell
              active={open}
              multiple={false}
              onFiles={(files) => pickFile(files[0] ?? null)}
            />
          )}

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

          {/* The buckets. Six, and pressing one is the single thing we ask of
              every contributor -- so it is a target you want to press rather
              than a checkbox you tolerate. Selection is the app's one green
              state (DESIGN-SYSTEM sec. 2 rule 4); hover is colour only, and the
              press keeps its sink. Spec sec. 8.2 wants a whole room built
              around this in phase 6; this is the same interaction at dialog
              scale, so it can be lived with first. */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              What is it of? <span className="font-normal text-muted-foreground">(pick any)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BUCKETS.map((b) => {
                const on = buckets.includes(b.value);
                return (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={on}
                    title={b.hint}
                    onClick={() =>
                      setBuckets((prev) =>
                        prev.includes(b.value)
                          ? prev.filter((v) => v !== b.value)
                          : [...prev, b.value]
                      )
                    }
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
                      "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      on
                        ? "border-canopy bg-canopy text-white"
                        : "state-layer border-border bg-card text-foreground"
                    )}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Part of school */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Part of school <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Junior school, the dining hall, Rishi Konda..."
              maxLength={100}
              className="bg-card"
            />
          </div>

          {/* When */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              When
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={yearChoice} onValueChange={(v) => { setYearChoice(v ?? NOT_SURE); setMonthChoice(NO_MONTH); }}>
                <SelectTrigger className="bg-card">
                  {/* Explicit label render: the underlying Select only learns an
                      item's label once its SelectContent has mounted, so the
                      NOT_SURE sentinel would otherwise show its raw value on
                      first paint instead of "Not sure of the year". */}
                  <SelectValue placeholder="Year">
                    {(v: string) => (v === NOT_SURE ? "Not sure of the year" : v)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SURE}>Not sure of the year</SelectItem>
                  {yearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {yearChoice !== NOT_SURE ? (
                <Select value={monthChoice} onValueChange={(v) => setMonthChoice(v ?? NO_MONTH)}>
                  <SelectTrigger className="bg-card">
                    {/* Explicit label render: same fix as the Year select above --
                        the NO_MONTH sentinel would otherwise show its raw value
                        on first paint instead of "Month (optional)". */}
                    <SelectValue placeholder="Month">
                      {(v: string) => (v === NO_MONTH ? "Month (optional)" : v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MONTH}>Month (optional)</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={decade} onValueChange={(v) => setDecade(v ?? "unknown")}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Decade">{(v: string) => eraLabel(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ERAS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !file}
            variant="primary"
            className="w-full"
          >
            {submitting ? "Adding..." : "Add to the Collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
