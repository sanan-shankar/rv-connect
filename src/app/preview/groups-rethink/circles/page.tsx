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
import { MapPin, Sparkles, ArrowRight, MessagesSquare } from "lucide-react";

const NAV: NavItem[] = [
  { label: "Feed", icon: ICONS.Newspaper },
  { label: "Directory", icon: ICONS.Compass },
  { label: "Collection", icon: ICONS.Images },
  { label: "Letters", icon: ICONS.Feather },
  { label: "Catch-ups", icon: ICONS.MessagesSquare, active: true },
  { label: "Events", icon: ICONS.CalendarDays },
  { label: "About", icon: ICONS.Info },
  { label: "Groups", icon: ICONS.Users, ghost: true, note: "folded into Catch-ups" },
];

export default function CirclesConcept() {
  return (
    <PreviewShell current="circles" nav={NAV}>
      <ConceptHeading
        n="A"
        title="Circles for Catch-ups"
        lede="Groups stop being a place you visit. A Circle is the thin membership container a Catch-up runs on, and nothing else. There is no group feed and no group browser. The only surface is Catch-ups, and Circles are just how it is sliced."
      />

      {/* the actual surface: /catchups, circle-first */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <Eyebrow tone="leaf">The surface · /catchups</Eyebrow>
          <h2 className="mt-1.5 font-heading text-[1.6rem] font-bold tracking-tight text-foreground">
            Your Catch-ups
          </h2>
        </div>
        <span className="hidden text-[13px] text-muted-foreground sm:block">
          One card per Circle you are in
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* left: the circle cards */}
        <div className="space-y-4">
          {/* batch circle */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Chip tone="canopy">Batch Circle</Chip>
                  <span className="text-[12px] text-muted-foreground">auto, everyone is in</span>
                </div>
                <h3 className="mt-2 font-heading text-[1.35rem] font-bold tracking-tight text-foreground">
                  Batch of 2004
                </h3>
              </div>
              <AvatarStack people={BATCH_2004} extra={38} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist/60 p-3.5">
              <CatchupStatus round={3} state="answering" detail="9 of 38 have shared · 4 days left" />
              <CTA>
                Answer now
                <ArrowRight className="h-3.5 w-3.5" />
              </CTA>
            </div>
          </Card>

          {/* interest circle: Burdens */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Chip tone="cinnamon">
                    <Sparkles className="h-3 w-3" />
                    Interest Circle
                  </Chip>
                  <span className="text-[12px] text-muted-foreground">admin-created</span>
                </div>
                <h3 className="mt-2 font-heading text-[1.35rem] font-bold tracking-tight text-foreground">
                  Burdens of RV
                </h3>
              </div>
              <AvatarStack people={BURDENS} extra={10} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist/60 p-3.5">
              <CatchupStatus round={7} state="published" detail="Round 7 is out · 8 wrote in" />
              <CTA variant="outline">
                Read the Round
                <ArrowRight className="h-3.5 w-3.5" />
              </CTA>
            </div>
          </Card>

          {/* a circle with no catch-up yet */}
          <Card className="border-dashed p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Chip tone="cinnamon">
                    <Sparkles className="h-3 w-3" />
                    Interest Circle
                  </Chip>
                </div>
                <h3 className="mt-2 font-heading text-[1.35rem] font-bold tracking-tight text-foreground">
                  Valley Birders
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  No Catch-up here yet. Any member can start the first Round.
                </p>
              </div>
              <AvatarStack people={BIRDERS} extra={6} />
            </div>
            <div className="mt-4">
              <CTA variant="ghost" className="px-0">
                <MessagesSquare className="h-4 w-4" />
                Start a Catch-up
              </CTA>
            </div>
          </Card>
        </div>

        {/* right rail: fresh rounds + the "no feed" note */}
        <div className="space-y-4">
          <Card className="p-5">
            <Eyebrow tone="leaf">Fresh off the press</Eyebrow>
            <ul className="mt-3 space-y-3">
              {[
                ["Burdens of RV", "Round 7", "on staying kind when it costs you"],
                ["Batch of 2004", "Round 2", "where the world found us this year"],
                ["Valley Birders", "Round 1", "the sighting that started it"],
              ].map(([g, r, teaser]) => (
                <li key={r} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{g}</span>
                    <span className="dotsep">·</span>
                    {r}
                  </div>
                  <p className="mt-0.5 text-[13.5px] italic leading-snug text-foreground">
                    &ldquo;{teaser}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-sky/[0.06] p-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky" />
              <Eyebrow tone="sky">Where are people?</Eyebrow>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Circles never do location. Chennai, Bengaluru, the lot live on the
              Directory map, not as a Circle. A village of three shows as three
              pins, never a lonely group.
            </p>
            <CTA variant="outline" className="mt-3">
              Open the Directory
            </CTA>
          </Card>
        </div>
      </div>

      {/* how a circle differs from today's group */}
      <Card className="mt-6 p-6">
        <Eyebrow tone="cinnamon">A Circle is not a Group</Eyebrow>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            ["No feed", "A Circle has no wall to scroll. Its whole reason to exist is the Catch-up. Chatter stays on WhatsApp, where it already is."],
            ["No browser", "You do not go shopping for Circles. Batch Circles arrive automatically; interest Circles are added by an admin and simply appear."],
            ["No creation button", "Members cannot spin up Circles. That kills the empty friend-group problem at the root, by removing the button."],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
                {t}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <DecisionCard
        rows={[
          {
            q: "Where it lives in nav",
            a: "Nowhere new. Groups leaves the sidebar entirely; Catch-ups (already present) becomes the home for everything. Circles are a facet inside it, not a nav item.",
          },
          {
            q: "How Burdens of RV fits",
            a: "As an interest Circle: admin-created, members added, one Catch-up on a monthly rhythm. Identical machinery to a batch Circle, just not auto-provisioned. A few more like it live side by side.",
          },
          {
            q: "Location communities",
            a: "Not modelled here at all. Cities live on the Directory map. No threshold logic needed because a Circle is never made from a place, so a 3-person village can never spawn one.",
          },
          {
            q: "Existing Group data",
            a: "Groups that have (or could have) a Catch-up become Circles. Group posts are the casualty: they are exported to the owner and the wall is retired. Empty friend-groups are archived silently.",
          },
          {
            q: "What dies",
            a: "The group feed, the group browser, the create-group flow, and the word 'Groups'. The biggest bet: that nobody misses the wall.",
          },
        ]}
      />
    </PreviewShell>
  );
}
