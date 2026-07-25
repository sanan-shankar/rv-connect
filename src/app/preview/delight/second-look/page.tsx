"use client";

import Link from "next/link";
import { LabShell, Rule, ROOMS } from "./_kit";

/* The recurring shapes of "fine but never thought about", named. Naming them
   matters more than any single fix: once you can see the pattern you can catch
   the next one without me. */
const PATTERNS = [
  {
    n: "01",
    name: "Alpha where an opaque token belongs",
    body: "A colour written as 70% of another colour looks like a dimmer version of it. On a saturated surface it is not: it is that colour mixed with the background. The result reads as low resolution, not as quiet.",
  },
  {
    n: "02",
    name: "Half-pixel values nobody chose",
    body: "14.5px, strokeWidth 1.9. Each is a whole number somebody nudged once and never revisited. Neither can be drawn cleanly, so both soften every edge they touch. There are 252 of them.",
  },
  {
    n: "03",
    name: "The border that is not doing work",
    body: "A card is the heaviest grouping tool available: it says these things are a unit AND separable from their neighbours AND individually actionable. Most lists here only needed the first, which proximity gives away free.",
  },
  {
    n: "04",
    name: "Content with structure the layout ignores",
    body: "Five catch-ups in five different lifecycle states, rendered as five identical rows. The layout is a container when the content was asking to be a diagram.",
  },
  {
    n: "05",
    name: "Decoration where information belongs",
    body: "An 80px pastel band on every group card. It is a cover-photo slot for a photo that does not exist, so it costs 38% of the card and returns nothing.",
  },
  {
    n: "06",
    name: "Drift you can never see",
    body: "Eleven routes, six different left edges, 224px apart end to end. You only ever look at one at a time, so it never registers as wrong, and it is wrong on every screen.",
  },
];

export default function SecondLookIndex() {
  const built = ROOMS.filter((r) => r.status === "built");
  const planned = ROOMS.filter((r) => r.status === "planned");

  return (
    <LabShell
      index
      title="Second look"
      lede="Everything examined here already looked fine. That is the entry requirement. This is the pass for the things that are working, inoffensive, and were never actually decided."
    >
      <div className="relative max-w-[74ch] pl-5">
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-cinnamon" />
        <p className="text-[18px] leading-[1.7]">
          You can find a misalignment, a dead button, or bad copy on your own. What you cannot find is
          a screen that works, offends nobody, and is still just the first idea anyone had. It gives
          off no signal. It never asks for attention, so it never gets any, and it ships.
        </p>
        <p className="mt-3 text-[17px] leading-[1.65] text-muted-foreground">
          So the method here is not &quot;what looks bad&quot;. It is: for each surface, what is the
          content actually shaped like, and is the layout shaped like that? Then, is there a version
          that is more useful, or more fun, or simply more decided? Every claim comes with a measured
          number, and every alternative is live on the page rather than described.
        </p>
      </div>

      <Rule>Six patterns, found repeatedly</Rule>

      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        {PATTERNS.map((p) => (
          <div key={p.n} className="flex gap-4">
            <span className="mt-0.5 shrink-0 font-heading text-[13px] font-bold tabular-nums text-leaf">
              {p.n}
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-[16px] font-bold leading-snug tracking-tight">
                {p.name}
              </h3>
              <p className="mt-1.5 text-[14px] leading-[1.6] text-muted-foreground">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Rule>The rooms</Rule>

      <div className="divide-y divide-border border-y border-border">
        {built.map((r) => (
          <Link
            key={r.slug}
            href={`/preview/delight/second-look/${r.slug}`}
            className="group flex flex-col gap-1.5 py-6 transition-[background-color,transform] duration-150 hover:bg-mist/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50 sm:flex-row sm:items-baseline sm:gap-8"
          >
            <h3 className="font-heading text-[19px] font-bold leading-snug tracking-tight sm:w-[34%] sm:shrink-0">
              {r.title}
            </h3>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-[1.6] text-muted-foreground">{r.looked}</p>
              <p className="mt-1.5 text-[14px] leading-[1.6] text-foreground">{r.tell}</p>
            </div>
            <span className="shrink-0 self-start rounded-full bg-leaf/12 px-3 py-1 text-[12px] font-bold text-leaf transition-transform duration-150 group-hover:translate-x-0.5">
              Open
            </span>
          </Link>
        ))}
      </div>

      {planned.length > 0 && (
        <>
          <Rule>Being built now</Rule>
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {planned.map((r) => (
              <div key={r.slug} className="min-w-0">
                <h3 className="font-heading text-[16px] font-bold leading-snug tracking-tight text-muted-foreground">
                  {r.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-muted-foreground">{r.tell}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </LabShell>
  );
}
