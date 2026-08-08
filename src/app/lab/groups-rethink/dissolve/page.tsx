"use client";

import {
  PreviewShell,
  ConceptHeading,
  Card,
  Eyebrow,
  Chip,
  AvatarStack,
  CatchupStatus,
  DecisionCard,
  ICONS,
  type NavItem,
} from "../_shell";
import { BATCH_2004, BURDENS } from "../_data";
import { CITIES, CITY_THRESHOLD } from "../_data";
import { MapPin, Heart, MessageCircle, Filter } from "lucide-react";

const NAV: NavItem[] = [
  { label: "Feed", icon: ICONS.Newspaper, active: true },
  { label: "Directory", icon: ICONS.Compass },
  { label: "Collection", icon: ICONS.Images },
  { label: "Letters", icon: ICONS.Feather },
  { label: "Catch-ups", icon: ICONS.MessagesSquare },
  { label: "Events", icon: ICONS.CalendarDays },
  { label: "About", icon: ICONS.Info },
  { label: "Groups", icon: ICONS.Users, ghost: true, note: "removed, jobs redistributed" },
];

export default function DissolveConcept() {
  return (
    <PreviewShell current="dissolve" nav={NAV}>
      <ConceptHeading
        n="C"
        title="Groups dissolve away"
        lede="The most radical answer: there is no Groups surface, and nothing named replaces it. Every job a group did is absorbed by a place that already exists. If a group is really just an audience plus a rhythm, then the Directory, the Feed, and Catch-ups can carry all three between them."
      />

      <Eyebrow tone="cinnamon" className="mb-3">
        The three jobs, rehoused
      </Eyebrow>

      {/* JOB 1: cohort cohesion -> feed filter */}
      <Card className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#235C49] text-[12px] font-bold text-white">
            1
          </span>
          <Eyebrow tone="leaf">Cohort cohesion → a Feed filter</Eyebrow>
        </div>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
          &quot;See what my batch is up to&quot; becomes a scope on the Feed you already read,
          not a separate wall you have to remember to visit.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-mist/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Chip tone="canopy">Batch of 2004</Chip>
            <Chip tone="neutral">Everyone</Chip>
            <Chip tone="neutral">Letters</Chip>
            <span className="ml-auto text-[12px] text-muted-foreground">
              showing 38 people
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {[
              ["Devika Nair", "Back in the Valley for the first time in twenty years. The banyan is exactly as tall as I remember and I am not.", "p-devika"],
              ["Kabir Sethi", "Anyone from our year in Berlin next month? First round is on me.", "p-kabir"],
            ].map(([name, body, id]) => (
              <div
                key={id}
                className="rounded-lg border border-border/70 bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <AvatarStack people={[{ id: id as string, name: name as string }]} size={28} max={1} extra={1} />
                  <span className="text-[13px] font-semibold text-foreground">{name}</span>
                  <span className="dotsep">·</span>
                  <span className="text-[12px] text-muted-foreground">Batch of 2004</span>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{body}</p>
                <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-[12px]">
                    <Heart className="h-3.5 w-3.5 text-heart" /> 12
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px]">
                    <MessageCircle className="h-3.5 w-3.5" /> 3
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* JOB 2: location -> threshold place pages in the directory */}
      <Card className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#235C49] text-[12px] font-bold text-white">
            2
          </span>
          <Eyebrow tone="sky">Location → threshold Place pages in the Directory</Eyebrow>
        </div>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
          A city only earns a page once {CITY_THRESHOLD} or more members opt in. Below
          that, it is only pins on the map. This is the direct answer to the
          three-person village: it can never become a group, because a page is never
          auto-created for it.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky/25 bg-sky/[0.06] p-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-sky" />
              <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
                Places (≥ {CITY_THRESHOLD} members)
              </span>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {CITIES.filter((c) => c.threshold).map((c) => (
                <li key={c.name} className="flex items-center justify-between">
                  <span className="text-[13.5px] text-foreground">
                    {c.name}
                    <span className="ml-1.5 text-[12px] text-muted-foreground">
                      {c.country}
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-sky">{c.count} →</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12px] italic text-muted-foreground">
              Each opens a scoped view: who is here, recent posts, an optional
              city Catch-up.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-mist/40 p-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
                Just pins (below threshold)
              </span>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {CITIES.filter((c) => !c.threshold).map((c) => (
                <li key={c.name} className="flex items-center justify-between">
                  <span className="text-[13.5px] text-muted-foreground">
                    {c.name}
                    <span className="ml-1.5 text-[12px] text-muted-foreground/70">
                      {c.country}
                    </span>
                  </span>
                  <span className="text-[12px] text-muted-foreground">{c.count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12px] italic text-muted-foreground">
              Madanapalle&apos;s three show as three pins. No page, no group, no
              admin, no emptiness.
            </p>
          </div>
        </div>
      </Card>

      {/* JOB 3: catch-ups attach to a batch / curated circle */}
      <Card className="mb-2 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#235C49] text-[12px] font-bold text-white">
            3
          </span>
          <Eyebrow tone="leaf">Catch-ups → attached to a batch or a curated circle</Eyebrow>
        </div>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
          A Catch-up no longer needs a Group to belong to. It hangs off a batch year
          directly, or off a small admin-curated circle, which is really just a saved
          audience with a name.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-mist/60 p-4">
            <Chip tone="canopy">Batch Catch-up</Chip>
            <div className="mt-2 font-heading text-[15px] font-semibold tracking-tight text-foreground">
              Batch of 2004
            </div>
            <div className="mt-1.5">
              <CatchupStatus round={3} state="answering" detail="9 have shared" />
            </div>
            <div className="mt-2">
              <AvatarStack people={BATCH_2004} size={26} extra={38} />
            </div>
          </div>
          <div className="rounded-xl bg-mist/60 p-4">
            <Chip tone="cinnamon">Curated circle · a saved audience</Chip>
            <div className="mt-2 font-heading text-[15px] font-semibold tracking-tight text-foreground">
              Burdens of RV
            </div>
            <div className="mt-1.5">
              <CatchupStatus round={7} state="published" detail="Round 7 out" />
            </div>
            <div className="mt-2">
              <AvatarStack people={BURDENS} size={26} extra={41} />
            </div>
          </div>
        </div>
      </Card>

      <DecisionCard
        rows={[
          {
            q: "Where it lives in nav",
            a: "Nowhere. 'Groups' is deleted from the sidebar and nothing takes its slot. The nav gets shorter, which is itself the statement that groups were never load-bearing.",
          },
          {
            q: "How Burdens of RV fits",
            a: "As a curated circle: an admin-named saved audience with a Catch-up hung off it. It surfaces under Catch-ups and as a card in the Feed rail, but it is never called a group and has no separate wall.",
          },
          {
            q: "Location communities",
            a: "Threshold Place pages in the Directory (≥ 8 members opting in). Below the threshold, only map pins. No auto-generation, ever, so tiny places stay pins.",
          },
          {
            q: "Existing Group data",
            a: "Batch groups are dropped, superseded by the batch Feed filter. Burdens-type groups migrate to curated circles. Friend-group posts are exported to owners, then the Group model is retired.",
          },
          {
            q: "What dies",
            a: "The entire Group surface and model: feeds, browser, creation, invites, the nav item. The most it removes, and the biggest bet that nothing is truly lost.",
          },
        ]}
      />
    </PreviewShell>
  );
}
