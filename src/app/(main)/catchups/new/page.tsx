import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CreateCatchupForm } from "@/components/catchups/create/create-catchup-form";
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
 */
export default async function NewCatchupPage() {
  const session = await auth();
  if (!session?.user) return null;

  let batchYear: number | null = null;
  let tableMissing = false;
  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { batchYear: true },
    });
    batchYear = me?.batchYear ?? null;
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
    tableMissing = true;
  }

  if (tableMissing) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Start a Catch-up" />
        <AlmostReady />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Start a Catch-up" />
      <CreateCatchupForm
        cadenceLabels={CADENCE_LABELS}
        myBatchYear={batchYear}
        suggestedName={batchYear ? `Batch of ${batchYear}` : ""}
      />
    </div>
  );
}
