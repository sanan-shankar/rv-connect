"use server";

/* ------------------------------------------------------------------ *
 *  ONE PRESS, ONE ROUND TRIP.
 *
 *  The review room's Approve carries whatever the admin corrected on the
 *  way past -- a capital letter, a bucket, the year the file suggested --
 *  because in this room those are not two acts. You look at the
 *  photograph, you fix what is wrong with it, and you let it in. Making
 *  that a Save followed by an Approve would mean two presses and two
 *  round trips for the ordinary case, and a queue of two hundred is
 *  where that arithmetic stops being academic.
 *
 *  THE DATE NEVER GATES THE DECISION. The owner, asked whether an
 *  undated photograph should be stopped at the door: "approval is not
 *  just for year, it's also for suitability of the photo and everything
 *  else." So there is no check here that a year was given, no confirm,
 *  and no nag. A photograph with nothing in the year box approves
 *  exactly as fast as one with a year in it.
 * ------------------------------------------------------------------ */

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { parsePhotoMeta } from "@/lib/collection-photo";
import { declinePhoto } from "@/app/(main)/collection/actions";

/** The answers as the room holds them, already run through the one date rule
 *  in lib/collection.ts on the client -- the same encoding the contribute
 *  paths and the edit dialog send. */
export type ReviewAnswers = {
  caption?: string;
  buckets?: string[];
  era?: string;
  datePrecision?: string;
  photoYear?: number;
  photoMonth?: number;
};

/**
 * Save what the admin corrected, and do one thing with the photograph.
 *
 *   approve  let it in.
 *   aside    park it: unapproved, off the Waiting pile and every count.
 *   back     un-park it, onto the Waiting pile again.
 *   save     the Undated pile: already in, only the corrections are written.
 *
 * One function and not four, because all four validate and write the same
 * answers and differ only in two columns -- four copies would drift.
 */
export async function saveReview(input: {
  id: string;
  answers: ReviewAnswers;
  action: "approve" | "aside" | "back" | "save";
}) {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };
  if (IS_DEMO) {
    return { error: "The demo does not take changes to the Collection." };
  }

  const limited = await rateLimit("photoReview", actor.actorId);
  if (!limited.ok) return { error: limited.error };

  /* THE SAME VALIDATOR EVERY OTHER ROUTE INTO THE COLLECTION USES. An admin
     is trusted to judge a photograph, not to bypass the shape of a row: a
     seventh bucket or a year in the future must be refused here exactly as it
     is refused on the contribute path, or this room becomes the one door
     through which a malformed row enters. */
  const parsed = parsePhotoMeta({
    caption: input.answers.caption || undefined,
    buckets: input.answers.buckets?.filter(Boolean),
    era: input.answers.era || undefined,
    datePrecision: input.answers.datePrecision || undefined,
    photoYear: input.answers.photoYear,
    photoMonth: input.answers.photoMonth,
  });
  if ("error" in parsed) return { error: parsed.error };
  const { meta } = parsed;

  /* updateMany rather than update: two admins clearing the queue together is
     the ordinary way a row goes missing between the render and the press, and
     P2025 reaches the client as "check your connection", which is a wrong
     diagnosis inviting a retry that can never work (audits C-074/C-130). This
     is the only write that lets a photograph in, so this is where that pair is
     pinned -- image-purge-rule.test.mjs reads it by name.

     The `approved: false` in the WHERE is what makes the approving half
     idempotent: a photograph another admin let in a second ago is counted out
     and answered, not approved twice with a second approver's name on it. */
  /* Parking is only for a photograph still undecided: one another admin
     approved a second ago must not be dragged back out of the Collection. */
  const deciding = input.action !== "save";
  const changed = await prisma.photo.updateMany({
    where: deciding ? { id: input.id, approved: false } : { id: input.id },
    data: {
      caption: meta.caption,
      subject: meta.buckets,
      era: meta.era,
      photoYear: meta.photoYear,
      photoMonth: meta.photoMonth,
      datePrecision: meta.datePrecision,
      ...(input.action === "approve"
        ? { approved: true, approvedAt: new Date(), approvedById: actor.actorId, heldAt: null }
        : input.action === "aside"
          ? { heldAt: new Date() }
          : input.action === "back"
            ? { heldAt: null }
            : {}),
    },
  });
  if (changed.count === 0) {
    return {
      error: deciding
        ? "Somebody else has already dealt with that one."
        : "That photo is no longer here.",
    };
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${input.id}`);
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Turn one away.
 *
 * Straight through to the Collection's own `declinePhoto`, which erases the
 * row, purges the bytes and writes the contributor the note explaining it. All
 * of that is the same act wherever it is triggered from, and a second
 * implementation of "decline" is a second chance to forget the note.
 *
 * Whatever the admin typed into the panel before pressing Decline is dropped,
 * on purpose: there is no row left to save it to.
 */
export async function declineReview(id: string) {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };
  const limited = await rateLimit("photoReview", actor.actorId);
  if (!limited.ok) return { error: limited.error };
  return declinePhoto(id);
}
