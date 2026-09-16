"use client";

import { useEffect, useState } from "react";
import { DelightShell } from "../../_kit";
import { Wall, WALL_CSS, type WallPhoto } from "./_wall";

export function WallRoom({ photos }: { photos: WallPhoto[] }) {
  const [startId, setStartId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    /* ?id=<photo> opens on that photograph, for a link from the viewer and for a scripted shot */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL after mount so the server and first client render agree
    setStartId(new URLSearchParams(window.location.search).get("id"));
    setReady(true);
  }, []);
  const years = new Set(photos.map((p) => p.y)).size;
  return (
    <DelightShell title="Every photograph, at once" lede="Pinch out of one photograph and it takes its place among all of them, by year. Pinch in on any one." css={CSS}>
      <div className="wr-stage">{ready && <Wall photos={photos} startId={startId} />}</div>
      <div className="wr-notes">
        <p>
          This is the whole Collection as you can see it: {photos.length.toLocaleString("en-IN")} photographs in {years} years, the valley&rsquo;s half and your own class&rsquo;s. Every photograph has one place on the wall and never moves; only the camera does. Newest at the top, each year as tall as it was full, so the shape of the archive is the shape of the years.
        </p>
        <p>
          Scroll or pinch to move between one photograph and all of them. Drag to move along the wall. Tap a photograph to come up to it; tap it again to step back out to its year; double-tap for the whole wall. The picture you started on keeps a thin frame so you can find it again from far out.
        </p>
        <p className="wr-where">
          <b>Where it would live:</b> the Collection&rsquo;s viewer, as the pinch-out that is missing today, and as a &ldquo;Time&rdquo; view of the Collection page. Pulled by the member, never played at them.
        </p>
      </div>
    </DelightShell>
  );
}

const CSS = `
${WALL_CSS}
.wr-stage { height:min(80vh, 860px); min-height:440px; }
.wr-notes { max-width:76ch; margin:22px 2px 0; display:grid; gap:10px; }
.wr-notes p { margin:0; font-size:14.5px; line-height:1.55; }
.wr-where { color:var(--ink-soft); }
@media (max-width:640px) { .wr-stage { height:74vh; min-height:0; } }
`;
