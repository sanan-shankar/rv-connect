"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Feather } from "lucide-react";
import { CreatePostForm } from "@/components/posts/create-post-form";

/** A "Write a letter" affordance that reveals the shared composer in letter mode. */
export function LetterComposer() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card-elevated flex w-full items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-5 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf/10 text-leaf">
          <Feather className="h-[18px] w-[18px]" />
        </span>
        <span>
          <span className="block font-heading text-[15px] font-bold tracking-tight text-foreground">
            Write a letter
          </span>
          <span className="block text-[13px] text-muted-foreground">
            A longer piece, taken slowly. A tribute, a reflection, a letter home.
          </span>
        </span>
      </button>
    );
  }

  return (
    <CreatePostForm
      defaultLetter
      onPosted={() => {
        setOpen(false);
        router.refresh();
      }}
    />
  );
}
