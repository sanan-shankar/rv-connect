"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreatePostForm } from "@/components/posts/create-post-form";

/* ------------------------------------------------------------------ *
 *  The writing desk: the whole-page letter surface behind /letters/new
 *  and /letters/[id]/edit (owner, 2026-07-30: "I'd like it if the letter
 *  writing thing was a whole page, so people can properly immerse
 *  themselves in it instead of hanging other unrelated elements on the
 *  page distracting them"). One back link, a quiet save status, and a
 *  paper sheet holding the same shared editor the feed's letter mode
 *  uses - extracted nothing, forked nothing, so the two can never drift.
 *  The index page's header, drafts strip and forty letter cards stay on
 *  /letters where they belong.
 * ------------------------------------------------------------------ */

export function LetterDesk({
  userPlaces,
  postId,
  initialTitle,
  initialContent,
  initialImages,
}: {
  userPlaces: string[];
  /** Present when resuming an existing draft (/letters/[id]/edit). */
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImages?: string[];
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/letters"
          /* Bare text above the sheet, so no state layer (a tint behind it would
             invent a control where there is only a label). active:opacity-70 is
             the press it was missing. */
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-opacity duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          All letters
        </Link>
        {/* The autosave voice: present-tense while writing to the row, then a
            quiet "Saved". Only resumed drafts autosave; a fresh letter says
            nothing until its first explicit save creates the row. */}
        <p aria-live="polite" className="text-[12.5px] text-muted-foreground">
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}
        </p>
      </div>

      {/* The paper. Generous internal padding so the letter sits on a sheet,
          not in a form; the editor inside is chromeless (immersive) and
          composes at reading fidelity. */}
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-8 sm:px-14 sm:py-12">
        <CreatePostForm
          defaultLetter
          immersive
          userPlaces={userPlaces}
          postId={postId}
          initialTitle={initialTitle}
          initialContent={initialContent}
          initialImages={initialImages}
          onAutosaveState={setSaveState}
          onDraftSaved={(id) => {
            // Adopt the new row: from here on, saves update in place and
            // autosave takes over. replace (not push) so Back leaves the
            // desk, not this same letter twice.
            router.replace(`/letters/${id}/edit`);
          }}
          onPosted={() => {
            router.push(postId ? `/letters/${postId}` : "/letters");
          }}
        />
      </div>
    </div>
  );
}
