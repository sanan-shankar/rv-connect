import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CreateCatchupForm } from "@/components/catchups/create/create-catchup-form";
import type { PickedPerson } from "@/components/catchups/create/people-picker";
import { CADENCE_LABELS, isMissingCatchupTable } from "@/lib/catchups";

export const metadata: Metadata = {
  title: "Start a Catch-up",
};

/**
 * Start a Catch-up.
 *
 * Previously this route could only be reached with a group in hand, and it
 * resolved three shapes: guidance when you had no groups, a group picker, or
 * the form for an already-chosen group. Groups are now being retired as a
 * user-facing feature (owner, 2026-07-25), so all three collapse into one
 * form: name it, pick the people, pick the rhythm. The Group row that still
 * backs membership underneath is created silently by `createCatchupWithPeople`.
 *
 * The only thing loaded here is the viewer's batch year, which seeds both the
 * suggested name and the "everyone from my batch" shortcut, so the overwhelmingly
 * common case (a batch Catch-up) takes no typing at all.
 *
 * `?group=<id>` used to preload a group's name and roster into this form. It
 * is gone (2026-08-21, owner's call). The index's "Start one" row was the only
 * thing that ever produced that link, and that row is gone too: it offered to
 * start a Catch-up FOR a group while this page mints its own Group row
 * underneath, so pressing it left the member with a duplicate row offering to
 * do it again. With the row dropped, the param had nothing pointing at it, and
 * two membership queries per page load were being spent resolving a link
 * nobody could produce.
 */
export default async function NewCatchupPage() {
  const session = await auth();
  if (!session?.user) return null;

  let batchYear: number | null = null;
  let tableMissing = false;
  // The viewer's own chip in the With list. Falls back to the session's
  // identity so the chip is never missing even if this read fails.
  let me: PickedPerson = {
    id: session.user.id,
    name: session.user.name,
    photoUrl: session.user.photoUrl ?? null,
    birdOverride: session.user.birdOverride ?? null,
    batchYear: null,
  };
  try {
    const viewer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { batchYear: true, name: true, photoUrl: true, birdOverride: true },
    });
    batchYear = viewer?.batchYear ?? null;
    if (viewer) {
      me = {
        id: session.user.id,
        name: viewer.name,
        photoUrl: viewer.photoUrl,
        birdOverride: viewer.birdOverride,
        batchYear: viewer.batchYear,
      };
    }

  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
    tableMissing = true;
  }

  if (tableMissing) {
    return (
      <div>
        <PageHeader title="Start a Catch-up" />
        <AlmostReady />
      </div>
    );
  }

  return (
    /* This route rides the CENTERED 768px column (content-column.tsx), but
       a three-field form only needs a 576px (max-w-xl) measure. The mx-auto
       centres that narrower measure INSIDE the column with the title
       travelling along, flush with the card's left edge; without it the
       card left-pinned 96px off the page's centre, i.e. (768 - 576) / 2
       (owner, 2026-07-30: "weirdly to the left"). A narrower reading
       measure inside the centered column is the sanctioned exception to
       the no-page-level-widths rule; see content-column.tsx. */
    <div className="mx-auto max-w-xl">
      <PageHeader title="Start a Catch-up" />
      <CreateCatchupForm
        cadenceLabels={CADENCE_LABELS}
        myBatchYear={batchYear}
        suggestedName={batchYear ? `Batch of ${batchYear}` : ""}
        initialPeople={[]}
        me={me}
      />
    </div>
  );
}
