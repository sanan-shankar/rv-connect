"use client";

import Link from "next/link";
import { ArrowRight, Check, X, Minus } from "lucide-react";
import { PreviewShell, CONCEPTS, Card, Eyebrow, Chip } from "./_shell";

const MATRIX: {
  row: string;
  cells: { v: "yes" | "no" | "some"; t: string }[];
}[] = [
  {
    row: "User-created groups",
    cells: [
      { v: "no", t: "Gone" },
      { v: "no", t: "Gone" },
      { v: "no", t: "Gone" },
      { v: "no", t: "Gone" },
    ],
  },
  {
    row: "Group feeds (day-to-day chatter)",
    cells: [
      { v: "no", t: "None" },
      { v: "some", t: "Light" },
      { v: "no", t: "Feed filter only" },
      { v: "some", t: "Batch noticeboard" },
    ],
  },
  {
    row: "Batches",
    cells: [
      { v: "yes", t: "Auto circle" },
      { v: "yes", t: "Auto space" },
      { v: "yes", t: "Directory + filter" },
      { v: "yes", t: "Auto room" },
    ],
  },
  {
    row: "Burdens of RV",
    cells: [
      { v: "yes", t: "Interest circle" },
      { v: "yes", t: "Interest space" },
      { v: "yes", t: "Curated circle" },
      { v: "yes", t: "A Gathering" },
    ],
  },
  {
    row: "Location communities",
    cells: [
      { v: "no", t: "Directory only" },
      { v: "no", t: "Directory only" },
      { v: "yes", t: "Threshold place page" },
      { v: "yes", t: "Threshold Place" },
    ],
  },
  {
    row: "Nav footprint",
    cells: [
      { v: "some", t: "Under Catch-ups" },
      { v: "some", t: "Demoted 'Spaces'" },
      { v: "no", t: "Zero" },
      { v: "some", t: "Demoted 'Gatherings'" },
    ],
  },
];

function MatrixIcon({ v }: { v: "yes" | "no" | "some" }) {
  if (v === "yes")
    return <Check className="h-3.5 w-3.5 shrink-0 text-leaf" strokeWidth={2.5} />;
  if (v === "no") return <X className="h-3.5 w-3.5 shrink-0 text-heart/70" strokeWidth={2.5} />;
  return <Minus className="h-3.5 w-3.5 shrink-0 text-cinnamon" strokeWidth={2.5} />;
}

export default function GroupsRethinkIndex() {
  return (
    <PreviewShell current="index">
      <header className="mb-9">
        <Eyebrow tone="cinnamon">Product exploration</Eyebrow>
        <h1 className="mt-2 font-heading text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
          What should Groups become?
        </h1>
        <p className="mt-3 max-w-[68ch] text-[15.5px] leading-relaxed text-muted-foreground">
          Four opinionated answers, built to react to. The starting belief: nobody
          makes a friend-group on a website (&quot;that is just going outside&quot;). Batches
          already live on WhatsApp, so their value here is not chatter, it is being the
          vehicle for a Catch-up. Location is real but collides with tiny places. And
          Groups should never be a top-three thing.
        </p>
      </header>

      {/* the constraints we designed against */}
      <Card className="mb-9 p-6">
        <Eyebrow tone="sky">The brief, held honestly</Eyebrow>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Friend-groups will not happen", "No concept leans on people making their own social groups."],
            ["Batches = the Catch-up vehicle", "The batch's job is to carry the recurring group letter, not to compete with the batch WhatsApp."],
            ["Burdens of RV must keep working", "A real, existing community space. Every concept has a home for it, and for a few more like it."],
            ["No ghost group for 3 people", "Madanapalle village with 3 members must never auto-spawn a lonely group. Location is handled by threshold or by the Directory."],
            ["Never a top-3 nav item", "Groups is 'definitely not that important.' Each concept shows exactly where its successor sits."],
            ["Existing Group data has a fate", "Batch groups, the Catch-up demo groups, and any friend-groups each get an explicit migration path."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl bg-mist/60 p-3.5">
              <div className="font-heading text-[14.5px] font-semibold tracking-tight text-foreground">
                {t}
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* concept cards */}
      <Eyebrow tone="leaf" className="mb-3">
        The four concepts
      </Eyebrow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CONCEPTS.map((c) => (
          <Link
            key={c.slug}
            href={`/lab/groups-rethink/${c.slug}`}
            className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            <Card className="h-full p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#235C49] font-heading text-[15px] font-bold text-white">
                  {c.n}
                </span>
                {c.slug === "gatherings" && <Chip tone="leaf">Recommended</Chip>}
              </div>
              <h2 className="mt-3 font-heading text-[1.35rem] font-bold tracking-tight text-foreground">
                {c.title}
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {c.pitch}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#235C49]">
                Walk through it
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      {/* comparison matrix */}
      <Eyebrow tone="sky" className="mb-3 mt-10">
        At a glance
      </Eyebrow>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-mist/50">
                <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                  &nbsp;
                </th>
                {CONCEPTS.map((c) => (
                  <th
                    key={c.slug}
                    className="px-4 py-3 text-[12.5px] font-semibold text-foreground"
                  >
                    <span className="text-[#235C49]">{c.n}</span> · {c.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.row} className="border-b border-border/60 last:border-0">
                  <th className="px-4 py-3 text-[13px] font-semibold text-foreground">
                    {r.row}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={i} className="px-4 py-3">
                      <span className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                        <MatrixIcon v={cell.v} />
                        {cell.t}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-[12.5px] italic text-muted-foreground">
        Static previews only. Mock data, no database writes. Full write-up in
        docs/planning/round6-specs/groups-rethink.md.
      </p>
    </PreviewShell>
  );
}
