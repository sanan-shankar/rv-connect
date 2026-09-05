import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CreateCatchupForm } from "@/components/catchups/create/create-catchup-form";
import type { PickedPerson } from "@/components/catchups/create/people-picker";
import { CADENCE_LABELS, isMissingCatchupTable } from "@/lib/catchups";
import { IDENTITY_SELECT } from "@/lib/people-select";

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
      select: { ...IDENTITY_SELECT, batchYear: true },
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
    // This route rides the CENTERED 768px column (content-column.tsx) at its
    // full standard measure. It used to narrow further to max-w-xl (576px)
    // on the reasoning that "a three-field form only needs it" -- correct
    // about the fields, wrong about the page: on an actual wide desktop
    // monitor that left a small card adrift in a great deal of empty canopy
    // background, which read as the one surface in the app that did not
    // "match any of the margins we've standardised to" (owner, 2026-08-29).
    // The fix keeps the form exactly as short as it was and gives the
    // now-available width to the form's OWN layout instead of to the page
    // margin -- see the two-column arrangement in CreateCatchupForm.
    <div>
      <PageHeader title="Start a Catch-up" />
      <CreateCatchupForm
        cadenceLabels={CADENCE_LABELS}
        myBatchYear={batchYear}
        suggestedName={batchYear ? `Batch of ${batchYear}` : ""}
        me={me}
      />
    </div>
  );
}
