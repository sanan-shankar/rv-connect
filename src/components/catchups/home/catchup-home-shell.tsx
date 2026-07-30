"use client";

/* ------------------------------------------------------------------ *
 *  <CatchupHomeShell> - the Catch-up home's top composition.
 *
 *  Layout shape (spec 3.3, BINDING): asymmetric two-column. Left (wide) =
 *  the live console, which swaps by Round status and is the ONE surface
 *  the whole cycle happens on (owner review 2026-07-25): questions get
 *  added here while collecting, and the issue is read here once it is
 *  published. Right rail = the member's reminder setting, the published
 *  issues, and the Keeper's settings link. Never a centered single
 *  column on desktop; collapses to one stack on mobile.
 *
 *  There is no "Keeper controls" box. Each Keeper transition lives in
 *  the console beside the thing it acts on, and Settings is a plain link
 *  at the foot of the rail so it stays reachable while paused or ended.
 * ------------------------------------------------------------------ */

import { useRouter } from "next/navigation";
import { Archive, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { PublishNowButton } from "@/components/catchups/round/publish-now-button";
import { resumeCatchup } from "@/app/(main)/catchups/actions";
import { ConsoleCollecting } from "./console-collecting";
import { ConsoleAnswering } from "./console-answering";
import { ConsolePublished, type PublishedIssue } from "./console-published";
import { ArchiveShelf } from "./archive-shelf";
import { KeeperSettingsDialog } from "./keeper-settings-dialog";
import { ReminderPrefControl } from "./reminder-pref-control";
import type { CatchupHomeData } from "./types";

export function CatchupHomeShell({
  data,
  issue,
}: {
  data: CatchupHomeData;
  /** The latest Round's full contents, present only once it has published. */
  issue?: PublishedIssue | null;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const { catchupStatus, edition, viewer } = data;

  return (
    <div className="grid items-start gap-x-[var(--space-l)] gap-y-[var(--space-m)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {catchupStatus !== "active" ? (
          <PausedOrEndedBanner
            status={catchupStatus}
            isKeeper={viewer.isKeeper}
            catchupId={data.catchupId}
            onChanged={refresh}
          />
        ) : !edition ? (
          <EmptyNoEditionCard groupName={data.groupName} />
        ) : edition.status === "collecting" ? (
          <ConsoleCollecting data={data} edition={edition} onChanged={refresh} />
        ) : edition.status === "answering" ? (
          <ConsoleAnswering data={data} edition={edition} onChanged={refresh} />
        ) : edition.status === "preparing" ? (
          <FadeRise>
            <AlmostReady
              eyebrow={`Round ${edition.number}`}
              title="Putting your Catch-up together."
              body="No one can read the answers yet, not even the Keeper. They all appear together the moment this Round publishes."
            />
            {viewer.isKeeper && (
              <div className="mt-[var(--space-m)] flex justify-center">
                <PublishNowButton editionId={edition.id} />
              </div>
            )}
          </FadeRise>
        ) : (
          <ConsolePublished edition={edition} issue={issue ?? null} />
        )}
      </div>

      <aside className="space-y-[var(--space-m)]">
        <ReminderPrefControl catchupId={data.catchupId} initialMode={viewer.reminderMode} />
        <ArchiveShelf rows={data.archive} groupName={data.groupName} />
        {viewer.isKeeper && (
          <KeeperSettingsDialog
            catchupId={data.catchupId}
            cadence={data.cadence}
            catchupStatus={data.catchupStatus}
            onChanged={refresh}
          />
        )}
      </aside>
    </div>
  );
}

function PausedOrEndedBanner({
  status,
  isKeeper,
  catchupId,
  onChanged,
}: {
  status: "paused" | "ended";
  isKeeper: boolean;
  catchupId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const isPaused = status === "paused";

  async function handleResume() {
    setBusy(true);
    const result = await resumeCatchup(catchupId);
    if (result && "error" in result) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    toast.success("Catch-up resumed.");
    onChanged();
  }

  return (
    <FadeRise>
      <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)] text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 50% 0%, color-mix(in srgb, var(--color-cinnamon) 8%, transparent), transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cinnamon/12 text-cinnamon">
          {isPaused ? <PauseCircle className="h-6 w-6" /> : <Archive className="h-6 w-6" />}
        </div>
        <h2 className="relative mt-[var(--space-s)] font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
          {isPaused ? "This Catch-up is paused." : "This Catch-up has ended."}
        </h2>
        <p className="relative mx-auto mt-[var(--space-xs)] max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isPaused
            ? "No new Round opens until it is resumed. Every published Round is still here to read."
            : "No new Round will open. Every published Round is still here to read."}
        </p>
        {isPaused && isKeeper && (
          <div className="relative mt-[var(--space-m)]">
            <Button variant="primary" onClick={handleResume} disabled={busy}>
              <PlayCircle className="h-4 w-4" />
              {busy ? "Resuming..." : "Resume this Catch-up"}
            </Button>
          </div>
        )}
      </div>
    </FadeRise>
  );
}

function EmptyNoEditionCard({ groupName }: { groupName: string }) {
  return (
    <FadeRise>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)] text-center">
        <p className="font-heading text-lg tracking-tight text-foreground">
          Setting up {groupName}&apos;s first Round...
        </p>
        <p className="mt-[var(--space-xs)] text-sm text-muted-foreground">
          Give it a moment and refresh the page.
        </p>
      </div>
    </FadeRise>
  );
}
