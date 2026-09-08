"use client";

/* ------------------------------------------------------------------ *
 *  <CatchupHomeShell> - the Catch-up home's top composition.
 *
 *  Layout shape (spec 3.3, BINDING): asymmetric two-column. Left (wide) =
 *  the live console, which swaps by Edition status and is the ONE surface
 *  the whole cycle happens on (owner review 2026-07-25): questions get
 *  added here while collecting, and the Edition is read here once it is
 *  published. Right rail = the member's reminder setting, the published
 *  Editions, and Keeper actions/settings. Never a centered single column on
 *  desktop; collapses to one stack on mobile.
 *
 *  There is no "Keeper controls" box. "Open answering" is the full-width
 *  rail action above Settings, which stays reachable while paused or ended.
 *
 *  The rail's first card is the people (2026-08-05). It carries the roster,
 *  add/remove, the Keeper hat and the invite link, and it is present at every
 *  status, so the group is visible while asking, answering and reading rather
 *  than only at the moment it was created.
 * ------------------------------------------------------------------ */

import { useRouter } from "next/navigation";
import { Archive, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { resumeCatchup } from "@/app/(main)/catchups/actions";
import { ConsoleCollecting, OpenAnsweringButton } from "./console-collecting";
import { ConsoleAnswering } from "./console-answering";
import { ConsolePublished, type PublishedEditionContents } from "./console-published";
import { ArchiveShelf } from "./archive-shelf";
import { ExtendDeadlineCard } from "./extend-deadline-card";
import { KeeperSettingsDialog } from "./keeper-settings-dialog";
import { PeoplePanel } from "./people-panel";
import { ReminderPrefControl } from "./reminder-pref-control";
import type { CatchupHomeData } from "./types";

export function CatchupHomeShell({
  data,
  contents,
}: {
  data: CatchupHomeData;
  /** The latest Edition's full contents, present only once it has published. */
  contents?: PublishedEditionContents | null;
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
        ) : (
          <ConsolePublished edition={edition} contents={contents ?? null} />
        )}
      </div>

      <aside className="space-y-[var(--space-m)]">
        {/* Above everything else in the rail, and present at every status:
            who you are doing this with is the thing a member most wants to
            see, and seeing the same faces in the same place while asking,
            answering and reading is what makes it one room (owner,
            2026-08-05). Answered ticks only during answering, where "has
            written in" is a fact rather than a prediction. */}
        <PeoplePanel
          data={data}
          answeredIds={
            edition?.status === "answering"
              ? new Set(edition.answeredAuthorIds)
              : undefined
          }
          onChanged={refresh}
        />
        <ReminderPrefControl catchupId={data.catchupId} initialMode={viewer.reminderMode} />
        <ArchiveShelf rows={data.archive} />
        {/* Above the settings dialog, not inside it: a deadline is something a
            Keeper reaches for in the moment, on the day it matters, and it is
            useless once the window it extends has closed. */}
        {viewer.isKeeper &&
          catchupStatus === "active" &&
          (edition?.status === "collecting" || edition?.status === "answering") && (
            <ExtendDeadlineCard
              editionId={edition.id}
              phase={edition.status}
              closesAt={
                edition.status === "collecting" ? edition.questionsCloseAt : edition.answersCloseAt
              }
              onChanged={refresh}
            />
          )}
        {viewer.isKeeper &&
          catchupStatus === "active" &&
          edition?.status === "collecting" &&
          edition.prompts.some((prompt) => prompt.accepted) && (
            <OpenAnsweringButton editionId={edition.id} onChanged={refresh} />
          )}
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
    try {
      const result = await callAction(() => resumeCatchup(catchupId));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Catch-up resumed.");
      onChanged();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // this button stuck on "Resuming..." forever (audit B-042).
      setBusy(false);
    }
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
            ? "No new Edition opens until it is resumed. Every published Edition is still here to read."
            : "No new Edition will open. Every published Edition is still here to read."}
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
          Setting up {groupName}&apos;s first Edition...
        </p>
        <p className="mt-[var(--space-xs)] text-sm text-muted-foreground">
          Give it a moment and refresh the page.
        </p>
      </div>
    </FadeRise>
  );
}
