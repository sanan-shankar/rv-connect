"use client";

/* ------------------------------------------------------------------ *
 *  Six ways to hold a photograph.
 *
 *  The owner asked to decide the crop rule by looking rather than by
 *  reading a list of three options, so this room renders all six answers
 *  against six deliberately awkward photographs, at the three column
 *  widths the app really uses. Whatever he picks becomes the rule for
 *  post-card, the catch-up answer card, the letter page and the
 *  Collection grid, so the maths sits in _policies.ts where it can be
 *  lifted rather than retyped.
 *
 *  Throwaway. Delete this room, its three generated files under
 *  public/lab/crop/ and its registry row once the choice is made. It is
 *  on the close-out list in docs/planning/collection-rework/handover.md.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { DelightShell, DemoCard, Seg } from "../_kit";
import { SPECIMENS } from "./_specimens";
import { justifiedRows } from "./_justified";
import {
  POLICIES,
  WIDTHS,
  frameFor,
  stackHeight,
  type PolicyKey,
  type Specimen,
  type WidthKey,
} from "./_policies";

/* ------------------------------------------------------------------ *
 *  One photograph in one policy's box. Everything below draws this.
 * ------------------------------------------------------------------ */
function Frame({
  photo,
  policy,
  width,
}: {
  photo: Specimen;
  policy: PolicyKey;
  width: number;
}) {
  const f = frameFor(policy, photo, width);
  return (
    <div className="cr-frame" style={{ width, height: f.height }}>
      {f.blurBehind && (
        <img src={photo.src} alt="" aria-hidden className="cr-blur" />
      )}
      <img
        src={photo.src}
        alt={photo.note}
        className="cr-img"
        style={{ objectFit: f.fit, objectPosition: f.position }}
      />
    </div>
  );
}

/** The "you lost this much" readout. A number that is doing work. */
function Kept({ kept }: { kept: number }) {
  const pct = Math.round(kept * 100);
  if (pct >= 100) return <span className="cr-kept whole">whole frame</span>;
  return (
    <span className={`cr-kept${pct < 60 ? " bad" : pct < 90 ? " warn" : ""}`}>
      {pct}% of the frame
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  Mode one: one photograph, all six policies, stacked at true size.
 * ------------------------------------------------------------------ */
function SixWays({ photo, width }: { photo: Specimen; width: number }) {
  return (
    <div className="cr-stack">
      {POLICIES.map((p) => {
        const f = frameFor(p.key, photo, width);
        return (
          <div key={p.key} className="cr-row">
            <div className="cr-row-head" style={{ width }}>
              <div>
                <h4>{p.name}</h4>
                <p>{p.line}</p>
              </div>
              <div className="cr-row-nums">
                <span className="cr-h">{Math.round(f.height)}px tall</span>
                <Kept kept={f.kept} />
              </div>
            </div>
            <Frame photo={photo} policy={p.key} width={width} />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Mode two: a whole feed under one policy, so the scroll can be felt.
 *  This is the mode that answers "definitely don't want some huge ass
 *  pictures to keep scrolling past".
 * ------------------------------------------------------------------ */
function ScrollIt({ policy, width }: { policy: PolicyKey; width: number }) {
  const [screens, setScreens] = useState<number | null>(null);
  const total = stackHeight(policy, SPECIMENS, width);

  useEffect(() => {
    setScreens(total / window.innerHeight);
  }, [total]);

  return (
    <div>
      <div className="cr-scrollbar-note" style={{ width }}>
        <strong>{Math.round(total).toLocaleString()}px</strong> of photograph for six posts
        {screens !== null && <span>, about {screens.toFixed(1)} screenfuls on this monitor</span>}
      </div>
      <div className="cr-feed">
        {SPECIMENS.map((photo) => (
          <article key={photo.key} className="cr-card" style={{ width }}>
            <header>
              <span className="cr-dot" />
              <span className="cr-who">Anita Rao</span>
              <span className="cr-when">2 days ago</span>
            </header>
            <p className="cr-body">{photo.note}</p>
            <Frame photo={photo} policy={policy} width={width} />
            <footer>
              <span>12 loves</span>
              <span>3 replies</span>
              <span className="cr-tag">{photo.label}</span>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Mode three: more than one photograph at a time. Today's grid against
 *  the reference gallery's justified rows.
 * ------------------------------------------------------------------ */
const GAP = 8;

function TodaysGrid({ photos, width }: { photos: Specimen[]; width: number }) {
  const cols = photos.length === 1 ? 1 : 2;
  const cell = (width - GAP * (cols - 1)) / cols;
  return (
    <div className="cr-grid" style={{ width, gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}>
      {photos.map((p, i) => {
        /* post-card.tsx: three photos put the first across both columns,
           and the height caps are 384 / 256 / 192 by count. */
        const span = photos.length === 3 && i === 0;
        const h = photos.length === 1 ? 384 : span ? 256 : 192;
        return (
          <div
            key={p.key}
            className="cr-frame"
            style={{ height: h, gridColumn: span ? "span 2" : undefined, width: span ? width : cell }}
          >
            <img src={p.src} alt="" className="cr-img" style={{ objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

function Justified({
  photos,
  width,
  target,
}: {
  photos: Specimen[];
  width: number;
  target: number;
}) {
  const rows = justifiedRows(photos, width, target, GAP);
  return (
    <div className="cr-just" style={{ width, gap: GAP }}>
      {rows.map((row, ri) => (
        <div key={ri} className="cr-just-row" style={{ gap: GAP }}>
          {row.map((placed) => (
            <div
              key={placed.item.key}
              className="cr-frame"
              style={{ width: placed.width, height: placed.height }}
            >
              <img src={placed.item.src} alt="" className="cr-img" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Today's Collection grid: CSS columns, which is why its rows never line up. */
function Masonry({ photos, width }: { photos: Specimen[]; width: number }) {
  return (
    <div className="cr-masonry" style={{ width }}>
      {photos.map((p) => (
        <div key={p.key} className="cr-mas-item">
          <img src={p.src} alt="" className="cr-img-flow" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Mode = "six" | "scroll" | "many";

export default function CropRoom() {
  const [mode, setMode] = useState<Mode>("six");
  const [widthKey, setWidthKey] = useState<WidthKey>("laptop");
  const [photoKey, setPhotoKey] = useState(SPECIMENS[0].key);
  const [policy, setPolicy] = useState<PolicyKey>("bounds");
  const [count, setCount] = useState<"2" | "3" | "4" | "6">("3");
  const stageRef = useRef<HTMLDivElement>(null);

  /* Every control is in the URL, so a particular comparison can be linked,
     screenshotted and argued about rather than described. Same trick the
     shell already uses for ?theme and ?reduced. Read after mount: doing it
     during render would make the first client paint disagree with the
     server's. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const m = q.get("mode");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reads the URL query after mount, the same way DelightShell reads ?theme. Doing it during render would make the first client render disagree with the server's.
    if (m === "six" || m === "scroll" || m === "many") setMode(m);
    const w = q.get("w");
    if (w && w in WIDTHS) setWidthKey(w as WidthKey);
    const ph = q.get("photo");
    if (ph && SPECIMENS.some((s) => s.key === ph)) setPhotoKey(ph);
    const po = q.get("policy");
    if (po && POLICIES.some((p) => p.key === po)) setPolicy(po as PolicyKey);
    const c = q.get("n");
    if (c === "2" || c === "3" || c === "4" || c === "6") setCount(c);
  }, []);

  const width = WIDTHS[widthKey].px;
  const photo = SPECIMENS.find((s) => s.key === photoKey) ?? SPECIMENS[0];
  const many = SPECIMENS.slice(0, Number(count));

  return (
    <DelightShell
      title="Six ways to hold a photograph"
      lede="The same awkward photo, six crop rules, at the three widths this app really uses."
      css={CSS}
    >
      <DemoCard
        title="The controls"
        note="Width first. Most of what looks wrong only looks wrong on a wide screen."
        pad
      >
        <div className="cr-panel cr-controls">
          <label className="cr-ctl">
            <span>Column</span>
            <Seg
              options={(Object.keys(WIDTHS) as WidthKey[]).map((k) => ({
                v: k,
                label: `${WIDTHS[k].label} · ${WIDTHS[k].px}px`,
              }))}
              value={widthKey}
              onChange={setWidthKey}
            />
          </label>
          <p className="cr-ctl-note">{WIDTHS[widthKey].note}</p>

          <label className="cr-ctl">
            <span>Looking at</span>
            <Seg
              options={[
                { v: "six" as Mode, label: "One photo, six ways" },
                { v: "scroll" as Mode, label: "Scroll a feed" },
                { v: "many" as Mode, label: "Several at once" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </label>
        </div>
      </DemoCard>

      {mode === "six" && (
        <DemoCard
          title="One photograph, six rules"
          note="Pick an awkward one. The percentage is how much of the photographer's frame survives."
          pad={false}
        >
          <div className="cr-panel">
          <div className="cr-picker">
            {SPECIMENS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`cr-thumb${s.key === photoKey ? " on" : ""}`}
                onClick={() => setPhotoKey(s.key)}
              >
                <img src={s.src} alt="" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <p className="cr-caption">{photo.note}</p>
          <div className="cr-stage" ref={stageRef}>
            <SixWays photo={photo} width={width} />
          </div>
          </div>
        </DemoCard>
      )}

      {mode === "scroll" && (
        <DemoCard
          title="Scroll a feed of six"
          note="The one that answers whether a rule makes the feed a chore. Switch rules and scroll each."
          pad={false}
        >
          <div className="cr-panel">
          <div className="cr-picker wrap">
            {POLICIES.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`cr-pill${p.key === policy ? " on" : ""}`}
                onClick={() => setPolicy(p.key)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="cr-stage">
            <ScrollIt policy={policy} width={width} />
          </div>
          </div>
        </DemoCard>
      )}

      {mode === "many" && (
        <DemoCard
          title="Several photographs at once"
          note="What a post with more than one photo does, and what the Collection grid does."
          pad={false}
        >
          <div className="cr-panel">
          <div className="cr-picker wrap">
            {(["2", "3", "4", "6"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`cr-pill${c === count ? " on" : ""}`}
                onClick={() => setCount(c)}
              >
                {c} photos
              </button>
            ))}
          </div>
          <div className="cr-stage">
            <h4 className="cr-h4">Justified rows, the same photographs</h4>
            <p className="cr-caption">
              Every frame whole, gutters even, rows level. This is the reference gallery&rsquo;s
              layout, and the arithmetic is one line.
            </p>
            <Justified photos={many} width={width} target={width / 3.2} />

            <h4 className="cr-h4">What a post does today</h4>
            <p className="cr-caption">
              Fixed square-ish cells with a hard pixel cap. The 9:16 phone photo is the one to look at.
            </p>
            <TodaysGrid photos={many} width={width} />

            <h4 className="cr-h4">The Collection grid today, for comparison</h4>
            <p className="cr-caption">
              CSS columns. Nothing is cropped, which is right, but the rows never line up, which is
              the difference he noticed.
            </p>
            <Masonry photos={many} width={width} />
          </div>
          </div>
        </DemoCard>
      )}
    </DelightShell>
  );
}

const CSS = `
.cr-panel { width: 100%; display: block; }
.cr-controls { display: flex; flex-direction: column; gap: var(--space-s, 12px); }
.cr-ctl { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.cr-ctl > span { font-size: 12.5px; font-weight: 600; opacity: .62; min-width: 78px; }
.cr-ctl-note { font-size: 12.5px; opacity: .55; margin: -4px 0 4px 92px; }

.cr-picker { display: flex; gap: 8px; padding: 14px 18px 4px; overflow-x: auto; }
.cr-picker.wrap { flex-wrap: wrap; overflow: visible; }
.cr-thumb {
  position: relative; flex: 0 0 auto; width: 62px; height: 62px; padding: 0;
  border-radius: 10px; overflow: hidden; border: 2px solid transparent;
  background: none; cursor: pointer; opacity: .55;
  transition: opacity 160ms ease, border-color 160ms ease;
}
.cr-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cr-thumb span {
  position: absolute; inset: auto 0 0 0; font-size: 10px; font-weight: 700;
  color: #fff; background: rgba(24,25,20,.66); padding: 2px 0;
}
.cr-thumb:hover { opacity: .85; }
.cr-thumb.on { opacity: 1; border-color: var(--leaf, #235C49); }
.cr-thumb:focus-visible, .cr-pill:focus-visible { outline: 2px solid var(--ring, #235C49); outline-offset: 2px; }

.cr-pill {
  border-radius: 999px; padding: 6px 13px; font-size: 12.5px; font-weight: 600;
  border: 1px solid rgba(30,28,22,.16); background: transparent; cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}
.cr-pill:active { transform: scale(.97); }
.cr-pill.on { background: var(--leaf, #235C49); color: #fff; border-color: transparent; }

.cr-caption { font-size: 13px; opacity: .62; padding: 6px 18px 12px; max-width: 62ch; }
.cr-h4 { font-size: 15px; font-weight: 700; padding: 22px 18px 0; }
.cr-stage { padding: 4px 18px 22px; overflow-x: auto; }

.cr-stack { display: flex; flex-direction: column; gap: 26px; }
.cr-row-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 7px; }
.cr-row-head h4 { font-size: 14px; font-weight: 700; }
.cr-row-head p { font-size: 12px; opacity: .58; max-width: 46ch; }
.cr-row-nums { display: flex; gap: 10px; align-items: baseline; flex: 0 0 auto; }
.cr-h { font-size: 12px; opacity: .58; font-variant-numeric: tabular-nums; }
.cr-kept { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.cr-kept.whole { color: var(--leaf, #235C49); }
.cr-kept.warn { color: #9A6A18; }
.cr-kept.bad { color: #A33A2A; }

.cr-frame {
  position: relative; overflow: hidden; border-radius: 10px;
  border: 1px solid rgba(30,28,22,.12); background: var(--mist, #F0EDE6); flex: 0 0 auto;
}
.cr-img { width: 100%; height: 100%; display: block; position: relative; z-index: 1; }
.cr-img-flow { width: 100%; height: auto; display: block; border-radius: 10px; }
.cr-blur {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  transform: scale(1.12); filter: blur(26px) brightness(.68) saturate(1.1); z-index: 0;
}

.cr-feed { display: flex; flex-direction: column; gap: 14px; }
.cr-card {
  border: 1px solid rgba(30,28,22,.12); border-radius: 14px; padding: 14px;
  background: var(--paper, #FBF9F4);
}
.cr-card header { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.cr-dot { width: 26px; height: 26px; border-radius: 999px; background: var(--leaf, #235C49); opacity: .8; }
.cr-who { font-weight: 700; }
.cr-when { opacity: .5; }
.cr-body { font-size: 14px; margin: 9px 0 11px; }
.cr-card footer { display: flex; gap: 14px; font-size: 12px; opacity: .55; padding-top: 10px; }
.cr-tag { margin-left: auto; font-weight: 700; opacity: .8; }
.cr-scrollbar-note {
  font-size: 13px; opacity: .7; padding-bottom: 12px;
}

.cr-grid { display: grid; }
.cr-just { display: flex; flex-direction: column; }
.cr-just-row { display: flex; }
.cr-masonry { columns: 3; column-gap: 8px; }
.cr-mas-item { break-inside: avoid; margin-bottom: 8px; }
`;
