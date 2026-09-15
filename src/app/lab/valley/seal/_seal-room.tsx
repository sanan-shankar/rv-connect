"use client";

import { useEffect, useState } from "react";
import { GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";
import { DelightShell } from "../../_kit";
import { Seal, SEAL_CSS } from "../_seal";
import { sunPosition, valleyClock } from "../_sun";

export function SealRoom({ seed, name, serverNow }: { seed: string; name: string; serverNow: number }) {
  const [species, setSpecies] = useState<number | null>(null);
  const [now, setNow] = useState(serverNow);
  const [preSealed, setPreSealed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL after mount, as the lab kit does
    if (new URLSearchParams(window.location.search).get("sealed") === "1") setPreSealed(true);
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  const sun = sunPosition(new Date(now));
  const clock = valleyClock(new Date(now));

  return (
    <DelightShell title="Your bird, pressed into wax" lede="Press and hold. Let go early and the wax springs back. On a laptop, the light follows your hand." css={CSS}>
      <div className="sr-stage">
        <div className="sr-paper">
          <Seal key={preSealed ? "sealed" : "live"} seed={seed} species={species} size={280} now={now} interactive={!preSealed} />
          <p className="sr-cap">
            {name ? `${name.split(" ")[0]}'s` : "Your"} bird. Lit from where the sun is over the valley at {clock.label}
            {sun.elevation > 0 ? "" : ", so by the moon"}.
          </p>
        </div>
        <div className="sr-side">
          <label className="sr-pick">
            <span>Try another bird</span>
            <select value={species ?? ""} onChange={(e) => setSpecies(e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">Mine</option>
              {GALLERY_SPECIES.map((s) => (
                <option key={s.index} value={s.index}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="sr-sizes">
            <figure><Seal seed={seed} species={species} size={96} now={now} interactive={false} /><figcaption>on a capsule card</figcaption></figure>
            <figure><Seal seed={seed} species={species} size={40} now={now} interactive={false} /><figcaption>as a chip</figcaption></figure>
          </div>
          <p className="sr-note">
            No image and no canvas. The bird’s own outline is the height map for an SVG lighting filter, so every one of the fifty birds works, at any size, in one colour of wax.
          </p>
          <p className="sr-note"><b>Where it would live:</b> the Catch-ups time capsule, the morning it is sealed. Once a year is the right rate for something this rich.</p>
        </div>
      </div>
    </DelightShell>
  );
}

const CSS = `
${SEAL_CSS}
.sr-stage { display:grid; grid-template-columns:auto 1fr; gap:28px; align-items:start; }
.sr-paper { display:grid; justify-items:center; gap:14px; padding:34px 34px 22px; background:#F5F2EA; border:1px solid var(--border); border-radius:var(--r-card);
  background-image:repeating-linear-gradient(0deg, transparent 0 27px, rgba(35,36,30,.06) 27px 28px); }
.sr-cap { margin:0; font-size:13px; color:var(--ink-soft); text-align:center; max-width:32ch; }
.sr-side { display:grid; gap:16px; max-width:52ch; }
.sr-pick { display:grid; gap:6px; font-size:13px; font-weight:600; }
.sr-pick select { font:inherit; font-weight:500; height:40px; border-radius:12px; border:1px solid var(--border); background:var(--surface); color:var(--ink); padding:0 12px; }
.sr-sizes { display:flex; gap:22px; align-items:flex-end; }
.sr-sizes figure { margin:0; display:grid; gap:6px; justify-items:center; }
.sr-sizes figcaption { font-size:11.5px; color:var(--ink-soft); }
.sr-note { margin:0; font-size:13.5px; line-height:1.55; color:var(--ink); }
@media (max-width:760px) { .sr-stage { grid-template-columns:1fr; } .sr-paper { padding:24px 16px 18px; } }
`;
