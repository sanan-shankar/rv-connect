"use client";

import { useEffect, useState } from "react";
import { DelightShell } from "../../_kit";
import { Weave, WEAVE_CSS, type Thread } from "./_weave";

export function WeaveRoom({ threads, firstYear, lastYear, meId }: { threads: Thread[]; firstYear: number; lastYear: number; meId: string | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the canvas measures the window; mounting it after hydration keeps server and client markup identical
    setMounted(true);
  }, []);
  const withHouses = threads.filter((t) => t.years.some((y) => y.house)).length;
  const oldest = threads.length ? Math.min(...threads.map((t) => t.from)) : firstYear;
  return (
    <DelightShell title="Everyone who was here, as thread" lede="The school's years as cloth, opened on your own thread. Pinch out for everyone; drag along the years to see who was here." css={CSS}>
      <div className="wr-stage">{mounted && <Weave threads={threads} firstYear={firstYear} lastYear={lastYear} meId={meId} />}</div>
      <div className="wr-notes">
        <p>
          Every year is a warp thread. Every member is a weft thread woven across the years they were at the school, dyed each year by the house they were in: the junior-school colour, the middle-school colour, the senior-school colour. Teachers are dyed the school&rsquo;s own green; a year nobody has filled in is undyed. Today that is {threads.length} threads, {withHouses} of them dyed, the oldest from {oldest}. The cloth is bare to the left of that. It fills in with every signup.
        </p>
        <p>
          It opens on your own thread, lifted over the warp with your name on it and the people who were here with you around it; that is where the profile would open it too. The light on the threads follows the pointer, which is what puts the sheen on them. Tap a thread to come in on it, and tap again to step back out.
        </p>
        <p className="wr-where">
          <b>Where it would live:</b> the directory&rsquo;s Batches tab, as a way of seeing everyone at once through time; and the profile, where &ldquo;In the valley 2014 to 2023&rdquo; would open on your own thread with the ones that crossed it. Pulled by the member; never on the feed.
        </p>
      </div>
    </DelightShell>
  );
}

const CSS = `
${WEAVE_CSS}
.wr-stage { height:min(78vh, 800px); min-height:440px; }
.wr-notes { max-width:76ch; margin:22px 2px 0; display:grid; gap:10px; }
.wr-notes p { margin:0; font-size:14.5px; line-height:1.55; }
.wr-where { color:var(--ink-soft); }
@media (max-width:640px) { .wr-stage { height:70vh; min-height:0; } }
`;
