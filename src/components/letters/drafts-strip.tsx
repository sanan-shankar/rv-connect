"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { EditPostDialog } from "@/components/posts/edit-post-dialog";

export type DraftSummary = {
  id: string;
  title: string | null;
  content: string;
  updatedAt: string;
};

/**
 * A compact, visually recessed strip of the viewer's own in-progress letters,
 * shown above the published list on /letters (only when they have at least
 * one). Deliberately subordinate to the main list -- a hairline mist inset,
 * never a full card -- since these are unfinished, not content to browse.
 * Opening a row reuses the shared EditPostDialog in its draft mode (continue
 * editing, save as draft again, or publish).
 */
export function DraftsStrip({ drafts }: { drafts: DraftSummary[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = drafts.find((d) => d.id === openId) ?? null;

  if (drafts.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-mist/40 p-4">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Your drafts
      </p>
      <div className="space-y-0.5">
        {drafts.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setOpenId(d.id)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
          >
            <PenLine className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">
              {d.title?.trim() || "Untitled letter"}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              Edited{" "}
              {new Date(d.updatedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <EditPostDialog
          postId={open.id}
          kind="letter"
          initialContent={open.content}
          initialTitle={open.title}
          initialTag={null}
          open
          isDraft
          onClose={() => setOpenId(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}
