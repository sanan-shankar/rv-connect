"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
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
  writerId,
  userPlaces,
  postId,
  initialTitle,
  initialContent,
  initialImages,
  initialCityScope,
  initialUpdatedAt,
}: {
  /** The signed-in writer. Not decoration: it is half of the crash-net key
   *  (audit C-014), so an unsaved letter on a shared browser cannot be
   *  restored into the next person's composer. This desk is the ONLY surface
   *  that writes letter drafts, so an id missing here means the fix is off
   *  everywhere -- which is exactly what it was until 2026-08-27. */
  writerId: string;
  userPlaces: string[];
  /** Present when resuming an existing draft (/letters/[id]/edit). */
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImages?: string[];
  /** The audience the draft was saved with; null is "Everyone". */
  initialCityScope?: string | null;
  initialUpdatedAt?: string;
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  return (
    /* w-full is load-bearing, not habit: this div is a direct child of the
       centered ContentColumn, which is a flex column, and a flex item with
       auto side margins does NOT stretch (the auto margins eat the free space
       instead). Without it the sheet was shrink-to-fit, so an EMPTY letter
       hugged its own toolbar at 510px while a draft with prose in it filled
       the full 760 -- the same desk, two different widths (owner, 2026-08-30:
       "why is the write a letter window smaller than the editing a draft
       window"). */
    <div className="mx-auto w-full max-w-[760px]">
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
            nothing until its first explicit save creates the row.
            "Not saving" is deliberately louder than the other two -- it is the
            one state the writer has to act on, and the chrome used to sit on
            "Saving..." forever instead of ever saying it (bug audit B-043). */}
        <p
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 text-[12.5px]",
            saveState === "failed"
              ? "font-medium text-destructive"
              : "text-muted-foreground"
          )}
        >
          {saveState === "failed" && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : saveState === "failed"
                ? "Not saving. Kept on this device."
                : ""}
        </p>
      </div>

      {/* The paper. Generous internal padding so the letter sits on a sheet,
          not in a form; the editor inside is chromeless (immersive) and
          composes at reading fidelity. */}
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-8 sm:px-14 sm:py-12">
        <CreatePostForm
          defaultLetter
          immersive
          /* Only the id: this shell draws no avatar (see the `!immersive`
             guard in CreatePostForm), and the composer wants the identity for
             the draft key, not for a bird. */
          currentUser={{ id: writerId, photoUrl: null }}
          userPlaces={userPlaces}
          postId={postId}
          initialTitle={initialTitle}
          initialContent={initialContent}
          initialImages={initialImages}
          initialCityScope={initialCityScope}
          initialUpdatedAt={initialUpdatedAt}
          onAutosaveState={setSaveState}
          onDraftSaved={(id) => {
            // Adopt the new row: from here on, saves update in place and
            // autosave takes over. replace (not push) so Back leaves the
            // desk, not this same letter twice.
            router.replace(`/letters/${id}/edit`);
          }}
          onPosted={({ kind }) => {
            // A short letter published as a post has no letter page to open.
            if (kind === "post") router.push("/feed");
            else router.push(postId ? `/letters/${postId}` : "/letters");
          }}
        />
      </div>
    </div>
  );
}
