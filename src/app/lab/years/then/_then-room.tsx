"use client";

import { useEffect, useState } from "react";
import { DelightShell, Seg } from "../../_kit";
import { Then, THEN_CSS, type ThenPair } from "./_then";

export function ThenRoom({ pairs }: { pairs: ThenPair[] }) {
  const [key, setKey] = useState(pairs[0]?.key ?? "");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    /* ?pair=field opens on that pair, for a link and for a scripted shot */
    const q = new URLSearchParams(window.location.search).get("pair");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL after mount so the server and first client render agree
    if (q && pairs.some((p) => p.key === q)) setKey(q);
    setMounted(true);
  }, [pairs]);
  const pair = pairs.find((p) => p.key === key) ?? pairs[0];
  const years = pair ? `${pair.a.year} and ${pair.b.year}` : "";
  return (
    <DelightShell title="The same bench, years apart" lede="One place, two years. Drag the year and hold it anywhere between; press the picture to play it through." css={CSS}>
      <div className="tr-top">
        <Seg options={pairs.map((p) => ({ v: p.key, label: p.title }))} value={key} onChange={setKey} />
        <span className="tr-years">{years}</span>
      </div>
      <div className="tr-stage">{mounted && pair && <Then key={pair.key} pair={pair} />}</div>
      <div className="tr-notes">
        <p>
          These are real pairs from the valley&rsquo;s photographs, matched by the place their captions name: the benches under the SBT in 2009 and 2022, the games field bare in 2021 and green in 2023, the Big Banyan Tree in 2014 and what was left of it in 2017. The earlier photograph lifts off as grains of its own colour, each from where it sat, drifts on a wind, and settles back in the same place carrying the later year. The ground leaves first and lands first, so the new picture prints in from the bottom.
        </p>
        <p>
          Nothing here is a crossfade. Every grain is whole at every moment, so the middle of the transition is a cloud the colour of the place rather than two half-pictures on top of each other. Moving the pointer tilts the cloud while it is in the air; the nearer grains move more.
        </p>
        <p className="tr-where">
          <b>Where it would live:</b> the Collection&rsquo;s viewer, as a small &ldquo;Also 2022&rdquo; chip on a photograph that has a sibling of the same place, and as a strip on the Collection page. Rare by nature: it only exists where a pair exists, and it plays on a press.
        </p>
      </div>
    </DelightShell>
  );
}

const CSS = `
${THEN_CSS}
.tr-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 14px; flex-wrap:wrap; }
.tr-years { font-size:13px; color:var(--ink-soft); }
.tr-stage { height:min(76vh, 780px); min-height:420px; }
.tr-notes { max-width:76ch; margin:22px 2px 0; display:grid; gap:10px; }
.tr-notes p { margin:0; font-size:14.5px; line-height:1.55; }
.tr-where { color:var(--ink-soft); }
@media (max-width:640px) { .tr-stage { height:68vh; min-height:0; } }
`;
