"use client";

import { useEffect, useRef, useState } from "react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  Stagger,
  staggerChild,
  SPRINGS,
  useValleyMotion,
  motion,
  BirdAvatar,
} from "../_kit";
import { HoopoeMascot } from "../_hoopoe";
import { AnimatePresence } from "motion/react";

/* small replay button used across demos */
function Replay({ onClick, label = "Replay", busy }: { onClick: () => void; label?: string; busy?: boolean }) {
  return (
    <SpringPress className="v2-btn v2-btn-ghost sm dll-replay" onClick={onClick}>
      {busy ? "Loading…" : label}
    </SpringPress>
  );
}

/* ============================================================ *
 * 1. Warm valley shimmer vs gray pulse
 * ============================================================ */
function ShimmerVsPulse() {
  const [run, setRun] = useState(0);
  return (
    <div className="dll-col">
      <div className="dll-compare">
        <div className="dll-side">
          <span className="dll-side-tag">Valley warm</span>
          <div key={`w${run}`} className="dll-bar dll-bar-warm ambient" />
          <div key={`w2${run}`} className="dll-bar dll-bar-warm dll-short ambient" />
        </div>
        <div className="dll-side">
          <span className="dll-side-tag">Plain gray</span>
          <div key={`g${run}`} className="dll-bar dll-bar-gray" />
          <div key={`g2${run}`} className="dll-bar dll-bar-gray dll-short" />
        </div>
      </div>
      <Replay label="Replay" onClick={() => setRun((r) => r + 1)} />
    </div>
  );
}

/* ============================================================ *
 * 2. Brand-hue skeleton + ruled lines draw in
 * ============================================================ */
function RuledSkeleton() {
  const [run, setRun] = useState(1);
  const lines = [0, 1, 2];
  return (
    <div className="dll-col">
      <div key={run} className="dll-feedrow">
        <motion.div
          className="dll-disc"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRINGS.gentle}
        />
        <div className="dll-lines">
          {lines.map((i) => (
            <motion.div
              key={i}
              className={`dll-rule ambient ${i === 2 ? "dll-rule-short" : ""}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ ...SPRINGS.settle, delay: 0.1 + i * 0.12 }}
              style={{ transformOrigin: "left center" }}
            />
          ))}
        </div>
      </div>
      <Replay onClick={() => setRun((r) => r + 1)} />
    </div>
  );
}

/* ============================================================ *
 * 3. Hoopoe hops the skeleton rows, then real rows FadeRise
 * ============================================================ */
const HOP_ROWS = [0, 1, 2];
const ROW_H = 46;
function HoopoeHops() {
  const { reduced } = useValleyMotion();
  const [loaded, setLoaded] = useState(false);
  const [perch, setPerch] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded || reduced) return;
    timer.current = setTimeout(() => {
      setPerch((p) => (p + 1) % HOP_ROWS.length);
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [perch, loaded, reduced]);

  const replay = () => {
    setLoaded(false);
    setPerch(0);
  };

  return (
    <div className="dll-col dll-col-wide">
      <div className="dll-rowstack">
        {/* hopping hoopoe perched on the discs */}
        <AnimatePresence>
          {!loaded && (
            <motion.div
              className="dll-perch"
              initial={{ opacity: 0 }}
              animate={
                reduced
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, y: perch * ROW_H, x: [0, 6, 0] }
              }
              exit={{ opacity: 0, y: perch * ROW_H }}
              transition={{ y: SPRINGS.gentle, x: { duration: 0.5 }, opacity: { duration: 0.2 } }}
            >
              <HoopoeMascot size={26} pose="curious" gaze={0.4} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* skeleton vs loaded content */}
        {!loaded ? (
          HOP_ROWS.map((i) => (
            <div className="dll-srow" key={i}>
              <div className="dll-sdisc" />
              <div className="dll-slines">
                <div className="dll-srule" />
                <div className="dll-srule dll-srule-short" />
              </div>
            </div>
          ))
        ) : (
          <Stagger className="dll-loadedrows" gap={0.08}>
            {HOP_ROWS.map((i) => (
              <motion.div className="dll-lrow" key={i} variants={staggerChild}>
                <BirdAvatar user={{ id: `hop-${i}` }} size={34} />
                <div className="dll-lmeta">
                  <strong>{["Asha", "Devi", "Rahul"][i]}</strong>
                  <span>{["planted a sapling", "shared a Letter", "posted to the Valley"][i]}</span>
                </div>
              </motion.div>
            ))}
          </Stagger>
        )}
      </div>
      <Replay
        label={loaded ? "Replay" : "Loaded"}
        onClick={loaded ? replay : () => setLoaded(true)}
      />
    </div>
  );
}

/* ============================================================ *
 * 4. Foraging bird hops a 3x2 grid while loading
 * ============================================================ */
const TILE_COLS = 3;
const TILE_ROWS = 2;
const TILE = 52;
const GAP = 8;
function ForagingBird() {
  const { reduced } = useValleyMotion();
  const [loaded, setLoaded] = useState(false);
  const [cell, setCell] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded || reduced) return;
    timer.current = setTimeout(() => {
      setCell((c) => {
        let next = Math.floor(Math.random() * TILE_COLS * TILE_ROWS);
        if (next === c) next = (next + 1) % (TILE_COLS * TILE_ROWS);
        return next;
      });
    }, 850);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cell, loaded, reduced]);

  const col = cell % TILE_COLS;
  const row = Math.floor(cell / TILE_COLS);
  const bx = col * (TILE + GAP) + (TILE - 30) / 2;
  const by = row * (TILE + GAP) + (TILE - 30) / 2;

  return (
    <div className="dll-col">
      <div className="dll-tilewrap">
        <div className="dll-tilegrid">
          {Array.from({ length: TILE_COLS * TILE_ROWS }).map((_, i) => (
            <div className={`dll-tile ${!loaded ? "dll-tile-skel ambient" : "dll-tile-done"}`} key={i} />
          ))}
        </div>
        {!loaded && (
          <motion.div
            className="dll-forager"
            animate={
              reduced
                ? { x: bx, y: by }
                : { x: bx, y: [by - 14, by], scale: [1, 0.96, 1] }
            }
            transition={{ x: SPRINGS.snappy, y: SPRINGS.gentle, scale: { duration: 0.4 } }}
          >
            <BirdAvatar user={{ id: "forager" }} size={30} />
          </motion.div>
        )}
      </div>
      <Replay
        label={loaded ? "Replay" : "Loaded"}
        onClick={loaded ? () => setLoaded(false) : () => setLoaded(true)}
      />
    </div>
  );
}

/* ============================================================ *
 * 5. Leaves settle on hand-off
 * ============================================================ */
const LEAVES = [
  { x: -22, rot: -18, delay: 0 },
  { x: 8, rot: 12, delay: 0.18 },
  { x: 30, rot: -8, delay: 0.34 },
];
function LeafSvg({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 3C9 3 3 9 3 21c12 0 18-6 18-18Z"
        fill={color}
        opacity="0.9"
      />
      <path d="M7 17C11 13 15 9 18 6" stroke="rgba(0,0,0,.18)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function LeavesSettle() {
  const { reduced } = useValleyMotion();
  const [show, setShow] = useState(false);
  return (
    <div className="dll-col">
      <div className="dll-leafcard v2-card">
        <strong className="dll-leafcard-title">Valley Collection</strong>
        <span className="dll-leafcard-sub">A quiet afternoon by the banyan.</span>
        <AnimatePresence>
          {show &&
            !reduced &&
            LEAVES.map((l, i) => (
              <motion.div
                key={i}
                className="dll-leaf drift"
                initial={{ opacity: 0, y: -34, x: l.x, rotate: l.rot }}
                animate={{ opacity: [0, 1, 0.9, 0], y: 30, x: l.x + 6, rotate: l.rot + 22 }}
                transition={{ duration: 2.1, delay: l.delay, ease: "easeIn" }}
              >
                <LeafSvg color={i === 1 ? "var(--cinnamon)" : "var(--primary)"} />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
      <Replay
        label="Hand off"
        onClick={() => {
          setShow(false);
          requestAnimationFrame(() => setTimeout(() => setShow(true), 30));
        }}
      />
    </div>
  );
}

/* ============================================================ *
 * 6. Global loading loop + Letters feather first-run
 * ============================================================ */
function GlobalLoadLoop() {
  const { reduced, paused } = useValleyMotion();
  const [tilt, setTilt] = useState(0);
  const [quill, setQuill] = useState(0);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setTilt((t) => (t === 0 ? 1 : t === 1 ? -1 : 0)), 1300);
    return () => clearInterval(id);
  }, [reduced, paused]);

  const gaze = tilt === 1 ? 0.8 : tilt === -1 ? -0.8 : 0;

  return (
    <div className="dll-loadsplit">
      <div className="dll-loadside">
        <motion.div
          animate={reduced ? {} : { rotate: tilt * 5 }}
          transition={SPRINGS.gentle}
          style={{ transformOrigin: "center bottom" }}
        >
          <HoopoeMascot size={62} pose="curious" gaze={gaze} />
        </motion.div>
        <span className="dll-loadlabel">One moment, fetching the valley.</span>
      </div>

      <div className="dll-loadside dll-letters">
        <span className="dll-letters-eyebrow">Letters</span>
        <div key={quill} className="dll-letters-line">
          <span className="dll-letters-word">Dear friend</span>
          <motion.span
            className="dll-quill-underline"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ ...SPRINGS.settle, delay: 0.15 }}
            style={{ transformOrigin: "left center" }}
          />
          <motion.span
            className="dll-feather"
            initial={{ rotate: -8, opacity: 0 }}
            animate={{ rotate: [-8, 9, -3, 0], opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <FeatherSvg />
          </motion.span>
        </div>
        <Replay label="Draw" onClick={() => setQuill((q) => q + 1)} />
      </div>
    </div>
  );
}
function FeatherSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 4c-7 0-12 4-13 12l-2 4 4-2c8-1 12-6 11-14Z"
        fill="var(--cinnamon)"
        opacity="0.92"
      />
      <path d="M16 7C12 9 9 12 7 16" stroke="rgba(255,255,255,.6)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================ *
 * 7. Skeleton-to-card cross-settle
 * ============================================================ */
const CROSS = [0, 1, 2];
function CrossSettle() {
  const [loaded, setLoaded] = useState(false);
  const { reduced } = useValleyMotion();
  const replay = () => {
    setLoaded(false);
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 650));
  };
  useEffect(() => {
    // run once on mount so the demo is pre-warmed
    const id = setTimeout(() => setLoaded(true), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="dll-col dll-col-wide">
      <div className="dll-crossstack">
        {CROSS.map((i) => (
          <div className="dll-crosswrap" key={i}>
            <AnimatePresence>
              {!loaded && (
                <motion.div
                  className="dll-crossskel ambient"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <div className="dll-sdisc" />
                  <div className="dll-slines">
                    <div className="dll-srule" />
                    <div className="dll-srule dll-srule-short" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {loaded && (
              <motion.div
                className="dll-crosscard v2-card"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.settle, delay: i * 0.07 }}
              >
                <BirdAvatar user={{ id: `cross-${i}` }} size={32} />
                <div className="dll-lmeta">
                  <strong>{["Old Boys cricket", "Banyan reading", "Hilltop walk"][i]}</strong>
                  <span>{["Sat 4pm", "Sun morning", "Daily at dawn"][i]}</span>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
      <Replay label="Replay" onClick={replay} />
    </div>
  );
}

/* ============================================================ */
export default function Page() {
  return (
    <DelightShell
      title="Loading states"
      lede="Waiting should feel like the valley breathing, not a spinner stalling. Each tile loads, then hands off to real content."
      css={CSS}
    >
      <DemoGrid>
        <DemoCard title="Warm shimmer vs gray pulse" note="Same skeleton, two moods. The warm sheen reads as patient, the gray as clinical." span={1}>
          <ShimmerVsPulse />
        </DemoCard>

        <DemoCard title="Ruled lines draw in" note="A brand-hue avatar with ruled lines that wipe left to right, then shimmer." span={1}>
          <RuledSkeleton />
        </DemoCard>

        <DemoCard title="Hoopoe hops the rows" note="The hoopoe perches and hops down the skeleton, then real rows rise in." span={1}>
          <HoopoeHops />
        </DemoCard>

        <DemoCard title="A bird forages the grid" note="While the Valley Collection loads, a small bird hops tile to tile." span={1}>
          <ForagingBird />
        </DemoCard>

        <DemoCard title="Leaves settle on hand-off" note="When content arrives, a few leaves drift down and fade. Never loops." span={1}>
          <LeavesSettle />
        </DemoCard>

        <DemoCard title="Cross-settle to cards" note="Skeleton fades as the real card rises a few pixels into place." span={1}>
          <CrossSettle />
        </DemoCard>

        <DemoCard title="One moment, and a Letters first run" note="A gentle global look-around loop, beside a quill drawing an underline with a feather wobble." span={3}>
          <GlobalLoadLoop />
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
/* shared column layout for a demo + its replay button */
.dll-col { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; }
.dll-col-wide { align-items:stretch; }
.dll-replay { align-self:center; }

/* --- 1. shimmer vs pulse --- */
.dll-compare { display:flex; gap:18px; width:100%; }
.dll-side { flex:1; display:flex; flex-direction:column; gap:9px; }
.dll-side-tag { font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--ink-soft); }
.dll-bar { height:14px; border-radius:7px; }
.dll-short { width:62%; }
.dll-bar-warm {
  background:linear-gradient(100deg,
    var(--surface-2) 0%,
    color-mix(in srgb, var(--cinnamon) 14%, var(--surface-2)) 45%,
    color-mix(in srgb, #fff 30%, var(--surface-2)) 52%,
    var(--surface-2) 60%);
  background-size:280% 100%;
  animation:dllSheen 2.4s ease-in-out infinite;
}
.dll-bar-gray { background:#cfcabd; animation:dllPulse 1.1s ease-in-out infinite; }
.delight.dark .dll-bar-gray { background:#3a423d; }
@keyframes dllSheen { 0%{ background-position:120% 0; } 100%{ background-position:-120% 0; } }
@keyframes dllPulse { 0%,100%{ opacity:.5; } 50%{ opacity:.95; } }

/* --- 2. ruled skeleton --- */
.dll-feedrow { display:flex; gap:14px; align-items:center; width:100%; padding:4px 2px; }
.dll-disc { width:46px; height:46px; border-radius:50%; flex:none;
  background:color-mix(in srgb, var(--primary) 16%, var(--surface-2)); }
.dll-lines { flex:1; display:flex; flex-direction:column; gap:10px; }
.dll-rule { height:13px; border-radius:7px;
  background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, #fff 26%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dllSheen 2.6s ease-in-out infinite; }
.dll-rule-short { width:55%; }

/* --- skeleton row primitives reused by 3 and 7 --- */
.dll-sdisc { width:34px; height:34px; border-radius:50%; flex:none;
  background:color-mix(in srgb, var(--primary) 14%, var(--surface-2)); }
.dll-slines { flex:1; display:flex; flex-direction:column; gap:8px; }
.dll-srule { height:10px; border-radius:6px;
  background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, #fff 24%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dllSheen 2.8s ease-in-out infinite; }
.dll-srule-short { width:52%; }

/* --- 3. hoopoe hops --- */
.dll-rowstack { position:relative; width:100%; display:flex; flex-direction:column; gap:12px; min-height:140px; }
.dll-srow { display:flex; gap:12px; align-items:center; height:34px; }
.dll-perch { position:absolute; left:4px; top:2px; z-index:3; pointer-events:none; }
.dll-loadedrows { display:flex; flex-direction:column; gap:12px; }
.dll-lrow { display:flex; gap:12px; align-items:center; }
.dll-lmeta { display:flex; flex-direction:column; line-height:1.3; }
.dll-lmeta strong { font-size:13px; }
.dll-lmeta span { font-size:11.5px; color:var(--ink-soft); }

/* --- 4. foraging bird --- */
.dll-tilewrap { position:relative; width:${TILE_COLS * TILE + (TILE_COLS - 1) * GAP}px; height:${TILE_ROWS * TILE + (TILE_ROWS - 1) * GAP}px; }
.dll-tilegrid { display:grid; grid-template-columns:repeat(${TILE_COLS}, ${TILE}px); gap:${GAP}px; }
.dll-tile { width:${TILE}px; height:${TILE}px; border-radius:10px; }
.dll-tile-skel { background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, var(--primary) 9%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dllSheen 3s ease-in-out infinite; }
.dll-tile-done { background:color-mix(in srgb, var(--primary) 13%, var(--surface-2)); border:1px solid var(--border); }
.dll-forager { position:absolute; left:0; top:0; z-index:2; pointer-events:none; }

/* --- 5. leaves --- */
.dll-leafcard { position:relative; width:100%; min-height:96px; padding:16px 18px; overflow:hidden;
  display:flex; flex-direction:column; gap:5px; }
.dll-leafcard-title { font-size:14px; }
.dll-leafcard-sub { font-size:12px; color:var(--ink-soft); }
.dll-leaf { position:absolute; top:0; left:50%; z-index:2; }

/* --- 6. global loop + Letters --- */
.dll-loadsplit { display:flex; gap:28px; width:100%; align-items:stretch; flex-wrap:wrap; }
.dll-loadside { flex:1; min-width:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
  padding:18px; border-radius:14px; background:var(--surface-2); border:1px solid var(--border); }
.dll-loadlabel { font-size:12.5px; color:var(--ink-soft); }
.dll-letters { align-items:flex-start; }
.dll-letters-eyebrow { font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--cinnamon); }
.dll-letters-line { position:relative; display:inline-flex; align-items:center; gap:8px; padding-bottom:10px; }
.dll-letters-word { font-family:var(--font-display),Georgia,serif; font-size:19px; color:var(--ink); }
.dll-quill-underline { position:absolute; left:0; bottom:0; height:2px; width:96px; border-radius:2px;
  background:linear-gradient(90deg, var(--cinnamon), color-mix(in srgb, var(--cinnamon) 40%, transparent)); }
.dll-feather { display:inline-flex; }

/* --- 7. cross-settle --- */
.dll-crossstack { display:flex; flex-direction:column; gap:10px; width:100%; }
.dll-crosswrap { position:relative; min-height:48px; }
.dll-crossskel { position:absolute; inset:0; display:flex; gap:12px; align-items:center; }
.dll-crosscard { display:flex; gap:12px; align-items:center; padding:8px 12px; }
`;
