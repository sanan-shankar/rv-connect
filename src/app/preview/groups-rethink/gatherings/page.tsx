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
import { CITY_THRESHOLD } from "../_data";
import {
  MapPin,
  Sparkles,
  ArrowRight,
  MessagesSquare,
  Mail,
  Lock,
  Pin,
} from "lucide-react";

const NAV: NavItem[] = [
  { label: "Feed", icon: ICONS.Newspaper },
  { label: "Directory", icon: ICONS.Compass },
  { label: "Collection", icon: ICONS.Images },
  { label: "Letters", icon: ICONS.Feather },
  { label: "Catch-ups", icon: ICONS.MessagesSquare },
  { label: "Gatherings", icon: ICONS.Sparkles, active: true, note: "was Groups" },
  { label: "Events", icon: ICONS.CalendarDays },
  { label: "About", icon: ICONS.Info },
];

export default function GatheringsConcept() {
  return (
    <PreviewShell current="gatherings" nav={NAV}>
      <ConceptHeading
        n="D"
        title="Gatherings"
        lede="The synthesis, and the recommendation. Three honest sources of a space, each cut to a specific objection: a Batch room you never made, a short curated shelf of Gatherings, and Places that live in the Directory and only exist past a threshold. One demoted nav entry ties them together. No creation button anywhere."
      />

      {/* your batch room, pinned */}
      <div className="mb-3 flex items-center gap-2">
        <Pin className="h-4 w-4 text-cinnamon" />
        <Eyebrow tone="canopy">Your batch room · pinned, Catch-up-led</Eyebrow>
      </div>
      <Card className="mb-8 overflow-hidden p-0">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr]">
          {/* identity side */}
          <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
            <Chip tone="canopy">Batch of 2004</Chip>
            <h2 className="mt-2.5 font-heading text-[1.55rem] font-bold leading-tight tracking-tight text-foreground">
              Everyone from your year, already here
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Auto-provisioned from your batch year. No create step, no join step, no
              leaving. Its headline job is the Catch-up; a quiet noticeboard sits
              underneath.
            </p>
            <div className="mt-4">
              <AvatarStack people={BATCH_2004} extra={38} size={32} />
            </div>
          </div>
          {/* catch-up side */}
          <div className="bg-leaf/[0.05] p-5">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-leaf" />
              <span className="text-[12px] font-bold uppercase tracking-wide text-leaf">
                This round
              </span>
            </div>
            <div className="mt-3 rounded-xl border border-leaf/20 bg-card p-4">
              <CatchupStatus round={3} state="answering" detail="9 of 38 shared · 4 days left" />
              <p className="mt-3 font-heading text-[15px] italic leading-snug text-foreground">
                &ldquo;What does an ordinary Tuesday look like for you these days?&rdquo;
              </p>
              <CTA className="mt-3">
                Answer now
                <ArrowRight className="h-3.5 w-3.5" />
              </CTA>
            </div>
            <button className="mt-3 text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:underline">
              or glance at the noticeboard (4 notices)
            </button>
          </div>
        </div>
      </Card>

      {/* the gatherings shelf */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <Eyebrow tone="cinnamon">Gatherings · curated, a handful at a time</Eyebrow>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Standing communities the admins keep. Join what is yours.
          </p>
        </div>
        <Chip tone="neutral">3 open now</Chip>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Burdens */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center gap-1.5">
            <Chip tone="cinnamon">
              <Sparkles className="h-3 w-3" />
              Gathering
            </Chip>
            <Chip tone="neutral">
              <Lock className="h-3 w-3" />
            </Chip>
          </div>
          <h3 className="mt-2.5 font-heading text-[1.25rem] font-bold tracking-tight text-foreground">
            Burdens of RV
          </h3>
          <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            The long-running community space, carried over whole. Feed plus a monthly
            Catch-up.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={BURDENS} extra={41} size={26} max={4} />
            <CTA variant="outline">Open</CTA>
          </div>
        </Card>
        {/* Birders */}
        <Card className="flex flex-col p-5">
          <Chip tone="cinnamon">
            <Sparkles className="h-3 w-3" />
            Gathering
          </Chip>
          <h3 className="mt-2.5 font-heading text-[1.25rem] font-bold tracking-tight text-foreground">
            Valley Birders
          </h3>
          <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            Sightings and a seasonal Catch-up, for the hoopoe crowd.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={BIRDERS} extra={19} size={26} max={4} />
            <CTA>Join</CTA>
          </div>
        </Card>
        {/* Teachers */}
        <Card className="flex flex-col p-5">
          <Chip tone="cinnamon">
            <Sparkles className="h-3 w-3" />
            Gathering
          </Chip>
          <h3 className="mt-2.5 font-heading text-[1.25rem] font-bold tracking-tight text-foreground">
            Staff, past &amp; present
          </h3>
          <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            A room for teachers across the decades. Its own gentle Catch-up.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={BATCH_2004.slice(3, 9)} extra={27} size={26} max={4} />
            <CTA variant="outline">Open</CTA>
          </div>
        </Card>
      </div>

      {/* request + places */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3 bg-mist/50 p-5">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cinnamon" />
          <div>
            <div className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              No &quot;New Gathering&quot; button
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Propose one to the admins. The friction is the feature: it keeps the
              shelf short and every Gathering actually alive.
            </p>
            <CTA variant="outline" className="mt-3">
              Propose a Gathering
            </CTA>
          </div>
        </Card>

        <Card className="flex items-start gap-3 bg-sky/[0.06] p-5">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky" />
          <div>
            <div className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              Places live in the Directory
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Chennai, Bengaluru and friends get a scoped page once {CITY_THRESHOLD}+
              opt in. Under that, only map pins. A Gathering is never made from a
              place, so no ghost villages.
            </p>
            <CTA variant="outline" className="mt-3">
              Open the map
            </CTA>
          </div>
        </Card>
      </div>

      {/* why recommended */}
      <Card className="mt-6 border-leaf/25 bg-leaf/[0.05] p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-leaf" />
          <Eyebrow tone="leaf">Why this is the recommendation</Eyebrow>
        </div>
        <p className="mt-3 max-w-[74ch] text-[14px] leading-relaxed text-foreground">
          It concedes every one of the owner&apos;s points without throwing away the one
          case he trusts. Friend-groups are impossible because there is no create
          button. Batches carry Catch-ups without pretending to beat WhatsApp. Burdens
          of RV keeps working, on a curated shelf built to hold exactly that kind of
          thing. Tiny places can never spawn a ghost group, because places are a
          Directory feature gated on a threshold, not a group at all. And it costs the
          nav one demoted item, not a top-three slot. Concepts A and C are cleaner
          bets, but each gambles that a whole capability is unmissed; this keeps the
          proven one and drops the rest.
        </p>
      </Card>

      <DecisionCard
        rows={[
          {
            q: "Where it lives in nav",
            a: "One item, 'Gatherings', at position 6 (below Catch-ups). Your batch room is pinned to the top of that page; Places are reached through the Directory, not the nav.",
          },
          {
            q: "How Burdens of RV fits",
            a: "The template case for a Gathering: admin-curated, feed plus Catch-up, migrated intact. The shelf is explicitly designed to keep Burdens and a few peers (Staff, Birders) healthy.",
          },
          {
            q: "Location communities",
            a: "Threshold Places in the Directory (≥ 8 opting in) with a scoped feed and optional city Catch-up. Below the line, map pins only. No auto-generation, so no 3-person ghosts.",
          },
          {
            q: "Existing Group data",
            a: "Batch groups → Batch rooms (feed becomes the noticeboard, Catch-up preserved). Burdens-type groups → Gatherings. Friend-groups → archived with an export emailed to the creator. Group model stays, re-typed with a 'kind' (batch | gathering | place).",
          },
          {
            q: "What dies",
            a: "User-created groups, the create-group flow, the browse-all grid, and the top-3 nav slot. Creation becomes a proposal; browsing becomes a short curated shelf.",
          },
        ]}
      />
    </PreviewShell>
  );
}
