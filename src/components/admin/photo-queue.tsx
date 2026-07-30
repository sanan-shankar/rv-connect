"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { approvePhoto, declinePhoto } from "@/app/(main)/collection/actions";
import { subjectLabel, areaLabel, eraLabel } from "@/lib/collection";
import { metaLine } from "@/lib/utils";

interface PendingPhoto {
  id: string;
  thumbUrl: string;
  caption: string | null;
  subject: string[];
  area: string | null;
  era: string;
  freeTags: string[];
  uploaderName: string;
  createdAt: string;
}

export function PhotoQueue({ photos }: { photos: PendingPhoto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, fn: (id: string) => Promise<{ error?: string }>) {
    setBusy(id);
    const result = await fn(id);
    setBusy(null);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  if (photos.length === 0) {
    return (
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No photos awaiting review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {photos.map((p) => (
        <div
          key={p.id}
          className="card-elevated flex gap-4 rounded-[var(--radius)] border border-border bg-card p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.thumbUrl}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            {p.caption && <p className="text-sm text-foreground">{p.caption}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.subject.map((s) => (
                <span key={s} className="rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf">
                  {subjectLabel(s)}
                </span>
              ))}
              {p.area && (
                <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-semibold text-sky">
                  {areaLabel(p.area)}
                </span>
              )}
              {p.era !== "unknown" && (
                <span className="rounded-full bg-cinnamon/10 px-2 py-0.5 text-[11px] font-semibold text-cinnamon">
                  {eraLabel(p.era)}
                </span>
              )}
              {p.freeTags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {metaLine(
                p.uploaderName,
                new Date(p.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy === p.id}
              onClick={() => act(p.id, approvePhoto)}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === p.id}
              onClick={() => act(p.id, declinePhoto)}
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
