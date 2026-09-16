"use client";

import Link from "next/link";
import { DelightShell } from "../_kit";

/* Built one at a time; a door appears here when its room exists. The other
   two are described in docs/planning/valley/ideas-round-two.md. */
const ROOMS = [
  {
    href: "/lab/years/wall",
    title: "Every photograph, at once",
    body: "Pinch out of one photograph and it takes its place among all of them, laid out by year. Pinch in on any one and it comes back up. Nothing moves but the camera.",
    where: "the Collection's viewer",
  },
  {
    href: "/lab/years/then",
    title: "The same bench, years apart",
    body: "The benches under the SBT in 2009 lift off as grains of their own colour and settle as the same benches in 2022. Drag the year and hold it anywhere between.",
    where: "a photograph that has a sibling",
  },
];
const PLANNED = [
  {
    title: "Everyone who was here, as thread",
    body: "The school's hundred years as a length of cloth. Every member is a thread across the years they were here, dyed by the house they were in. Drag the shuttle to a year and see who was there.",
    where: "the directory's Batches, and your profile",
  },
];

export function YearsIndex() {
  return (
    <DelightShell title="Time, drawn" lede="Three rooms on the one axis this site has: the photographs by year, one place across years, the people by year." css={CSS}>
      <div className="yi-doors">
        {ROOMS.map((r) => (
          <Link key={r.href} href={r.href} className="yi-door">
            <h3>{r.title}</h3>
            <p>{r.body}</p>
            <span className="yi-where">Would live in {r.where}</span>
            <span className="dl-routelink-go">Open</span>
          </Link>
        ))}
        {PLANNED.map((r) => (
          <div key={r.title} className="yi-door planned">
            <h3>{r.title}</h3>
            <p>{r.body}</p>
            <span className="yi-where">Would live in {r.where}</span>
            <span className="yi-soon">Not built yet</span>
          </div>
        ))}
      </div>
      <p className="yi-note">
        Why these three: <code>docs/planning/valley/ideas-round-two.md</code> judges sixteen candidates against his bar. Each of these is pulled by a gesture that does a job, or is rare by nature; none of them plays on the feed.
      </p>
    </DelightShell>
  );
}

const CSS = `
.yi-doors { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.yi-door { display:flex; flex-direction:column; gap:8px; text-decoration:none; color:inherit; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); padding:20px 20px 18px; box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }
.yi-door:hover { background:color-mix(in srgb, var(--surface) 94%, var(--ink)); }
.yi-door h3 { font-family:var(--font-display),Georgia,serif; font-size:19px; margin:0; line-height:1.2; }
.yi-door p { margin:0; font-size:13.5px; line-height:1.5; color:var(--ink-soft); flex:1; }
.yi-where { font-size:12px; color:var(--ink-soft); }
.yi-door.planned { opacity:.72; }
.yi-soon { font-size:12.5px; font-weight:700; color:var(--ink-soft); }
.yi-note { margin:22px 2px 0; font-size:13.5px; color:var(--ink-soft); max-width:76ch; line-height:1.5; }
.yi-note code { font-size:12px; }
@media (max-width:760px) { .yi-doors { grid-template-columns:1fr; } }
`;
