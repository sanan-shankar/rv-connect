"use client";

/* ------------------------------------------------------------------ *
 *  <CatchupHomeShell> - the Catch-up home's top composition.
 *
 *  Layout shape (spec 3.3, BINDING): asymmetric two-column. Left (wide) =
 *  the live cycle console, which swaps by Round status. Right rail =
 *  Keeper controls + settings (Keeper only), everyone's reminder
 *  preference, and the archive of past Rounds (everyone). Never a
 *  centered single column on desktop; collapses to one stack on mobile.
 * ------------------------------------------------------------------ */

import { useRouter } from "next/navigation";
import { Archive, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { resumeCatchup } from "@/app/(main)/catchups/actions";
import { ConsoleCollecting } from "./console-collecting";
import { ConsoleAnswering } from "./console-answering";
import { ConsolePublished } from "./console-published";
import { KeeperRail } from "./keeper-rail";
import { ArchiveShelf } from "./archive-shelf";
import { ReminderPrefControl } from "./reminder-pref-control";
import type { CatchupHomeData } from "./types";

export function CatchupHomeShell({ data }: { data: CatchupHomeData }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const { catchupStatus, edition, viewer } = data;

  return (
    <div className="grid items-start gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        {catchupStatus !== "active" ? (
          <PausedOrEndedBanner
            status={catchupStatus}
            isKeeper={viewer.isKeeper}
            catchupId={data.catchupId}
            groupName={data.groupName}
            onChanged={refresh}
          />
        ) : !edition ? (
          <EmptyNoEditionCard groupName={data.groupName} />
        ) : edition.status === "collecting" ? (
          <ConsoleCollecting data={data} edition={edition} onChanged={refresh} />
        ) : edition.status === "answering" ? (
          <ConsoleAnswering data={data} edition={edition} />
        ) : edition.status === "preparing" ? (
          <FadeRise>
            <AlmostReady
              eyebrow={`Round ${edition.number}`}
              title="Putting your Catch-up together."
              body="Every answer is being gathered into one warm issue. No one, not even the Keeper, can read them yet. Check back soon and it will be ready."
            />
          </FadeRise>
        ) : (
          <ConsolePublished data={data} edition={edition} />
        )}
      </div>

      <aside className="space-y-5">
        {viewer.isKeeper && <KeeperRail data={data} edition={edition} onChanged={refresh} />}
        <ReminderPrefControl catchupId={data.catchupId} initialMode={viewer.reminderMode} />
        <ArchiveShelf rows={data.archive} groupName={data.groupName} />
      </aside>
    </div>
  );
}

function PausedOrEndedBanner({
  status,
  isKeeper,
  catchupId,
  groupName,
  onChanged,
}: {
  status: "paused" | "ended";
  isKeeper: boolean;
  catchupId: string;
  groupName: string;
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
      <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-8 text-center sm:p-10">
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
        <h2 className="relative mt-4 font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
          {isPaused ? "This Catch-up is paused." : "This Catch-up has ended."}
        </h2>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isPaused
            ? `${groupName}'s rhythm is on hold for now. Past Rounds are still here to read on the right.`
            : `Its rhythm has closed, but every Round ${groupName} shared is still here to read on the right.`}
        </p>
        {isPaused && isKeeper && (
          <div className="relative mt-5">
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
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center">
        <p className="font-heading text-lg tracking-tight text-foreground">
          Setting up {groupName}&apos;s first Round...
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Give it a moment and refresh the page.
        </p>
      </div>
    </FadeRise>
  );
}
