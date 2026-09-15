"use client";

/* ------------------------------------------------------------------ *
 *  /lab/valley: the overview. The two small, always-on pieces live here
 *  at full size (the mark, the world at this hour) beside the readout
 *  that feeds them; the two big ones have their own rooms and a door each.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { DelightShell } from "../_kit";
import { MarkLit } from "./_mark-light";
import { Seal, SEAL_CSS } from "./_seal";
import { Terminator, TERMINATOR_CSS, type CityDot } from "./_terminator";
import { moonPhase, sunPosition, sunTimes, valleyClock, valleyDateAt, type ValleyWeather } from "./_sun";

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const compass = (az: number) => ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(az / 45) % 8];

export function ValleyRoom({ weather, phrase, cities, serverNow, me }: { weather: ValleyWeather | null; phrase: string | null; cities: CityDot[]; serverNow: number; me: { id: string; name: string } }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  const when = new Date(now);
  const clock = valleyClock(when);
  const sun = sunPosition(when);
  const times = sunTimes(when);
  const moon = moonPhase(when);
  const sunLine =
    sun.elevation > 0
      ? `The sun is ${Math.round(sun.elevation)}° up in the ${compass(sun.azimuth)}; it sets at ${fmt(times.sunset)}.`
      : sun.elevation > -6
        ? `Twilight. The sun went down in the ${compass(sun.azimuth)}.`
        : `Night. The sun rises at ${fmt(times.sunrise)}, over the ${compass(sunPosition(valleyDateAt(when, times.sunrise + 0.1)).azimuth)}.`;
  const moonLine = moon < 0.05 || moon > 0.95 ? "a new moon" : moon < 0.45 ? "a waxing moon" : moon < 0.55 ? "a full moon" : "a waning moon";
  const HOURS = [5.75, 7, 9, 12, 15, 17, 18.1, 19, 22];

  return (
    <DelightShell title="The site knows where it is" lede="Four things that follow the valley's real sun, sky and hills. None of them plays on the feed." css={CSS}>
      <section className="vr-now">
        <div className="vr-clock">
          <b>{clock.label}</b>
          <span>at the valley right now</span>
        </div>
        <p className="vr-line">
          {sunLine} {weather && phrase ? `It is ${Math.round(weather.temperatureC)}°C and ${phrase}` : "The weather could not be fetched"}
          {weather && weather.windKmh > 12 ? `, with a ${Math.round(weather.windKmh)} km/h wind` : ""}. Tonight there is {moonLine}.
        </p>
        <p className="vr-small">
          One file computes all of it from the clock: `_sun.ts`. The weather is Open-Meteo, fetched on the server every fifteen minutes.
        </p>
      </section>

      <section className="vr-block">
        <h2>The mark, lit by that sun</h2>
        <p className="vr-copy">
          The peaks are seen from the school looking west, so the ridge is front-lit in the morning and a silhouette at sunset, when the sun goes down behind it. On the rail the mark stays one colour and only its warmth moves through the day. At 64px the three planes show why.
        </p>
        <div className="vr-marks">
          <div className="vr-rail">
            <MarkLit when={when} size={19} variant="cream" />
            <span>Rishi Valley</span>
            <em>now</em>
          </div>
          <div className="vr-strip">
            {HOURS.map((h) => (
              <div key={h} className="vr-rail small">
                <MarkLit when={valleyDateAt(when, h)} size={19} variant="cream" />
                <em>{fmt(h)}</em>
              </div>
            ))}
          </div>
          <div className="vr-planes">
            {[6.5, 9, 12, 16, 17.9, 21].map((h) => (
              <figure key={h}>
                <MarkLit when={valleyDateAt(when, h)} size={64} variant="planes" />
                <figcaption>{fmt(h)}</figcaption>
              </figure>
            ))}
            <figure className="live">
              <MarkLit when={when} size={64} variant="planes" />
              <figcaption>now, {clock.label}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="vr-block">
        <h2>The world at this hour</h2>
        <p className="vr-copy">
          The directory’s map with the night where it actually is. The yellow dot is where the sun is overhead. Cinnamon cities are in daylight, so somebody there could take a call.
        </p>
        <Terminator cities={cities} now={now} />
      </section>

      <section className="vr-doors">
        <Link href="/lab/valley/hills" className="vr-door">
          <h3>The hills, as they are</h3>
          <p>
            Real elevation, drawn as a contour map that stands up into relief, lit by this minute’s sun under today’s sky. Drag it. Drag the hour. Stand on the campus and look west at Bodikonda, Middle Peak and Rishikonda.
          </p>
          <span className="dl-routelink-go">Open the hills</span>
        </Link>
        <Link href="/lab/valley/seal" className="vr-door">
          <div className="vr-door-seal">
            <Seal seed={me.id} size={96} now={now} interactive={false} />
          </div>
          <h3>Your bird, pressed into wax</h3>
          <p>Press and hold to seal a time capsule with your own bird. The light on the wax comes from the same sun.</p>
          <span className="dl-routelink-go">Open the seal</span>
        </Link>
      </section>

      <section className="vr-block vr-where">
        <h2>Where each one would live</h2>
        <ul>
          <li><b>The mark</b>: the sidebar lockup, always on, changing over hours. Nobody is told.</li>
          <li><b>The world at this hour</b>: the directory’s map, always on, doing a job.</li>
          <li><b>The hills</b>: About, which has never shown the place. Also the 404. Never the feed.</li>
          <li><b>The seal</b>: the Catch-ups time capsule, the morning it is sealed. Once a year is the right rate for something this rich.</li>
        </ul>
      </section>
    </DelightShell>
  );
}

const CSS = `
${TERMINATOR_CSS}
${SEAL_CSS}
.vr-now { display:grid; gap:6px; margin:6px 0 30px; }
.vr-clock { display:flex; align-items:baseline; gap:10px; }
.vr-clock b { font-family:var(--font-display),Georgia,serif; font-size:44px; line-height:1; letter-spacing:-.015em; }
.vr-clock span { font-size:14px; color:var(--ink-soft); }
.vr-line { margin:0; font-size:16px; line-height:1.5; max-width:70ch; }
.vr-small { margin:0; font-size:12.5px; color:var(--ink-soft); }
.vr-block { margin:0 0 34px; }
.vr-block h2 { font-family:var(--font-display),Georgia,serif; font-size:22px; margin:0 0 6px; letter-spacing:-.01em; }
.vr-copy { margin:0 0 14px; font-size:14.5px; line-height:1.55; color:var(--ink); max-width:72ch; }
.vr-marks { display:grid; gap:14px; }
.vr-rail { display:inline-flex; align-items:center; gap:14px; background:#235C49; color:#EBF3EE; border-radius:14px; padding:14px 18px; width:max-content; }
.vr-rail span { font-family:var(--font-display),Georgia,serif; font-weight:700; letter-spacing:.02em; font-size:18px; transform:translateY(2px); }
.vr-rail em { font-style:normal; font-size:11px; color:#B4CBBE; margin-left:6px; }
.vr-rail.small { padding:10px 12px; gap:8px; }
.vr-strip { display:flex; flex-wrap:wrap; gap:8px; }
.vr-planes { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px; align-items:end; }
.vr-planes figure { margin:0; display:grid; gap:6px; justify-items:center; padding:12px 14px 10px; background:var(--surface); border:1px solid var(--border); border-radius:14px; }
.vr-planes figure.live { border-color:#235C49; }
.vr-planes figcaption { font-size:11.5px; color:var(--ink-soft); }
.vr-doors { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:0 0 34px; }
.vr-door { display:block; text-decoration:none; color:inherit; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); padding:20px 20px 18px; box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }
.vr-door h3 { font-family:var(--font-display),Georgia,serif; font-size:19px; margin:0 0 6px; }
.vr-door p { margin:0 0 12px; font-size:13.5px; color:var(--ink-soft); line-height:1.5; }
.vr-door-seal { margin:-4px 0 10px; }
.vr-where ul { margin:0; padding-left:18px; font-size:14px; line-height:1.6; }
@media (max-width:760px) { .vr-doors { grid-template-columns:1fr; } .vr-clock b { font-size:36px; } }
`;
