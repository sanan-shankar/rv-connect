"use client";

import { DelightShell } from "../../_kit";
import { Hills, HILLS_CSS } from "../_hills";
import type { ValleyWeather } from "../_sun";

export function HillsRoom({ weather, serverNow }: { weather: ValleyWeather | null; serverNow: number }) {
  return (
    <DelightShell title="The hills, as they are" lede="Drag to turn it. Drag the hour to move the sun. Pinch to come closer. Stand on the campus and look west." css={CSS}>
      <div className="hr-stage">
        <Hills weather={weather} serverNow={serverNow} />
      </div>
      <div className="hr-notes">
        <p>
          This is the ground itself: public elevation data (SRTM, about 30 m) for 32 km each way round the school, drawn as contours every 20 m that stand up into relief. The light is where the sun is over the valley this minute; the shadows are cast by marching each pixel’s ray toward it through the heightmap. The sky is today’s sky, from the weather over the school.
        </p>
        <p>
          The three peaks the mark is drawn from are Bodikonda, Middle Peak and Rishikonda, left to right from the school, which is why the mark is a view and not a map: they are at very different distances and only line up from here. The hills carry their heights, not names, because nobody has written the names down where a map could read them.
        </p>
        <p className="hr-where">
          <b>Where it would live:</b> About, which has never shown the place; the 404, where you have wandered off the map. Never the feed. It is pulled by the member, and it costs the page nothing until it is.
        </p>
      </div>
    </DelightShell>
  );
}

const CSS = `
${HILLS_CSS}
.hr-stage { height:min(78vh, 820px); min-height:420px; }
.hr-notes { max-width:76ch; margin:22px 2px 0; display:grid; gap:10px; }
.hr-notes p { margin:0; font-size:14.5px; line-height:1.55; }
.hr-where { color:var(--ink-soft); }
@media (max-width:640px) { .hr-stage { height:72vh; } }
`;
