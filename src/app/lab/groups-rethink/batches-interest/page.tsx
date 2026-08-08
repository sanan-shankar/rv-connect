"use client";

import {
  PreviewShell,
  ConceptHeading,
  Card,
  Eyebrow,
  Chip,
  CTA,
  AvatarStack,
  CatchupStatus,
  DecisionCard,
  ICONS,
  type NavItem,
} from "../_shell";
import { BATCH_2004, BURDENS, BIRDERS } from "../_data";
import { Lock, Sparkles, ArrowRight, MessagesSquare, Mail } from "lucide-react";

const NAV: NavItem[] = [
  { label: "Feed", icon: ICONS.Newspaper },
  { label: "Directory", icon: ICONS.Compass },
  { label: "Collection", icon: ICONS.Images },
  { label: "Letters", icon: ICONS.Feather },
  { label: "Catch-ups", icon: ICONS.MessagesSquare },
  { label: "Spaces", icon: ICONS.Users, active: true, note: "was Groups" },
  { label: "Events", icon: ICONS.CalendarDays },
  { label: "About", icon: ICONS.Info },
];

export default function BatchesInterestConcept() {
  return (
    <PreviewShell current="batches-interest" nav={NAV}>
      <ConceptHeading
        n="B"
        title="Batches + Special Interest"
        lede="Keep real spaces, but take away the ability to make them. There are exactly two kinds: your Batch, derived from your year with no join or create step, and a short curated shelf of interest spaces the admins run. Both have a light feed and a Catch-up. Nobody can create a third kind."
      />

      {/* your batch: the one space that is truly yours */}
      <Eyebrow tone="canopy" className="mb-3">
        Your batch · lives at the top, one per person
      </Eyebrow>
      <Card className="mb-8 overflow-hidden p-0">
        <div className="relative h-24 bg-gradient-to-br from-leaf/25 via-sky/15 to-cinnamon/20">
          <span className="absolute right-3 top-3">
            <Chip tone="canopy">Auto · you are here because of your year</Chip>
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-[1.7rem] font-bold tracking-tight text-foreground">
                Batch of 2004
              </h2>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                38 members · no one made this and no one can leave it. It is simply
                your year.
              </p>
            </div>
            <AvatarStack people={BATCH_2004} extra={38} size={34} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
            {/* the catch-up: the headline job */}
            <div className="rounded-xl border border-leaf/20 bg-leaf/[0.06] p-4">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-leaf" />
                <span className="text-[12px] font-bold uppercase tracking-wide text-leaf">
                  The point of the batch
                </span>
              </div>
              <div className="mt-2">
                <CatchupStatus round={3} state="collecting" detail="add a question, 2 days left" />
              </div>
              <CTA className="mt-3">
                Add a question
                <ArrowRight className="h-3.5 w-3.5" />
              </CTA>
            </div>
            {/* light feed: secondary */}
            <div className="rounded-xl bg-mist/60 p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                Noticeboard
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                A quiet wall for the odd reunion notice. Framed as secondary. The
                daily talk stays on your batch WhatsApp.
              </p>
              <CTA variant="ghost" className="mt-2 px-0">
                See 4 notices
              </CTA>
            </div>
          </div>
        </div>
      </Card>

      {/* interest spaces: the curated shelf */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <Eyebrow tone="cinnamon">Interest spaces · a short, curated shelf</Eyebrow>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Made by the admins, not by members. Join the ones that are yours.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Burdens */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Chip tone="cinnamon">
              <Sparkles className="h-3 w-3" />
              Interest space
            </Chip>
            <Chip tone="neutral">
              <Lock className="h-3 w-3" />
              Members only
            </Chip>
          </div>
          <h3 className="mt-2.5 font-heading text-[1.3rem] font-bold tracking-tight text-foreground">
            Burdens of RV
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            The long-running community space. Kept exactly as it works today: a feed
            and a monthly Catch-up.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={BURDENS} extra={41} size={28} />
            <CTA variant="outline">Open</CTA>
          </div>
        </Card>

        {/* Birders */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Chip tone="cinnamon">
              <Sparkles className="h-3 w-3" />
              Interest space
            </Chip>
          </div>
          <h3 className="mt-2.5 font-heading text-[1.3rem] font-bold tracking-tight text-foreground">
            Valley Birders
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Sightings, photos, and a seasonal Catch-up. One of a handful the admins
            keep.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={BIRDERS} extra={19} size={28} />
            <CTA>Join</CTA>
          </div>
        </Card>
      </div>

      {/* request-a-space, instead of create */}
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 bg-mist/50 p-5">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cinnamon" />
          <div>
            <div className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              There is no &quot;New space&quot; button
            </div>
            <p className="mt-0.5 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
              Think a group deserves to exist, like Burdens once did? Ask the admins.
              A real threshold of intent keeps the shelf short and every space alive.
            </p>
          </div>
        </div>
        <CTA variant="outline">Request a space</CTA>
      </Card>

      {/* location note */}
      <Card className="mt-4 bg-sky/[0.06] p-5">
        <Eyebrow tone="sky">Location is not a space</Eyebrow>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
          &quot;People in Chennai&quot; is answered by the Directory&apos;s city filter, not by a
          space. Nobody has to admin a Chennai group, and Madanapalle&apos;s three
          alumni never get a ghost space. If a city ever wants more, an admin can
          promote it to an interest space by hand, the same as any other.
        </p>
      </Card>

      <DecisionCard
        rows={[
          {
            q: "Where it lives in nav",
            a: "A single 'Spaces' item, dropped below Catch-ups (position 6, not 3). Your batch is pinned to the top of that page; interest spaces sit under it.",
          },
          {
            q: "How Burdens of RV fits",
            a: "It is the flagship interest space, migrated as-is with its feed and Catch-up intact. The curated shelf is designed around keeping it and a few peers healthy.",
          },
          {
            q: "Location communities",
            a: "Handled by the Directory city filter, never as a space. An admin may hand-promote a genuinely active city to an interest space, but nothing auto-generates one.",
          },
          {
            q: "Existing Group data",
            a: "Batch-named groups fold into Batch spaces (feeds preserved as the noticeboard). Burdens-type groups become interest spaces. Member-made friend-groups are archived and their owners emailed an export.",
          },
          {
            q: "What dies",
            a: "User-created groups and the create-group flow. Private friend-groups. The 'browse all groups' grid. Creation becomes a request to admins.",
          },
        ]}
      />
    </PreviewShell>
  );
}
