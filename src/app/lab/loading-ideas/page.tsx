"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  SPRINGS,
  useValleyMotion,
  motion,
  BirdAvatar,
} from "../_kit";
import { AnimatePresence } from "motion/react";

/* ============================================================ *
 *  Loading states, ideas round 2.
 *
 *  This is a GALLERY of richer, living loading-scene concepts to
 *  choose from. Nothing here is wired into the real app yet. Each
 *  card is a genuine looping, interactive mockup, with a one-line
 *  note on how it would become a single reusable skeleton overlay.
 *
 *  The brief, restated on the page so the constraints stay visible:
 *   - ONE reusable thing, usable on EVERY page (not a per-page scene).
 *   - Enjoyable to watch for 1 to 10 seconds; must never get annoying.
 *   - Appears only after a short delay, so instant pages never show it.
 *   - School-relevant: Rishi Valley birds, the valley, sports day.
 * ============================================================ */

/* small replay / control button shared across demos */
function Ctl({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <SpringPress className="v2-btn v2-btn-ghost sm dli-ctl" onClick={onClick}>
      {children}
    </SpringPress>
  );
}

/* a hairline label for the reusable-overlay mapping note under each scene */
function MapNote({ children }: { children: ReactNode }) {
  return <p className="dli-map"><span>Reusable overlay</span>{children}</p>;
}

/* ============================================================ *
 *  Shared articulated figure parts
 *  Limbs are SVG <g> rotated about an explicit joint. Per the motion
 *  SVG rule, every rotating group sets transformBox:view-box and an
 *  explicit transformOrigin in viewBox px. Limb cycles use 3+ keyframe
 *  arrays, so they are TWEENS (never springs).
 * ============================================================ */

/* ------------------------------------------------------------ *
 * 1. SPORTS DAY: little articulated athletes on a track
 * ------------------------------------------------------------ */

/* a cute rounded runner. Hips at (24,30), shoulders at (24,17). Legs and
   arms swing in opposite phase. transform-only, soft easing, loops forever. */
function Runner({ play }: { play: boolean }) {
  const swing = play ? { duration: 0.62, ease: "easeInOut" as const, repeat: Infinity } : { duration: 0 };
  const bob = play ? { duration: 0.31, ease: "easeInOut" as const, repeat: Infinity } : { duration: 0 };
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" aria-hidden>
      {/* tiny lean forward */}
      <motion.g
        animate={play ? { y: [0, -1.4, 0] } : { y: 0 }}
        transition={bob}
        style={{ transformBox: "view-box", transformOrigin: "24px 40px" }}
      >
        {/* back leg */}
        <motion.g
          animate={play ? { rotate: [26, -30, 26] } : { rotate: 8 }}
          transition={swing}
          style={{ transformBox: "view-box", transformOrigin: "24px 30px" }}
        >
          <rect x="22.4" y="30" width="3.2" height="13" rx="1.6" fill="var(--cinnamon)" />
          <circle cx="24" cy="44" r="2.1" fill="var(--cinnamon)" />
        </motion.g>
        {/* back arm */}
        <motion.g
          animate={play ? { rotate: [-34, 30, -34] } : { rotate: -10 }}
          transition={swing}
          style={{ transformBox: "view-box", transformOrigin: "24px 19px" }}
        >
          <rect x="22.7" y="19" width="2.6" height="10" rx="1.3" fill="color-mix(in srgb, var(--cinnamon) 70%, var(--ink))" />
        </motion.g>
        {/* torso */}
        <rect x="20.5" y="16" width="7" height="15" rx="3.5" fill="var(--primary)" />
        {/* head */}
        <circle cx="24" cy="11" r="5.4" fill="color-mix(in srgb, var(--cinnamon) 38%, #F4E9D6)" />
        {/* front leg */}
        <motion.g
          animate={play ? { rotate: [-30, 26, -30] } : { rotate: -8 }}
          transition={swing}
          style={{ transformBox: "view-box", transformOrigin: "24px 30px" }}
        >
          <rect x="22.4" y="30" width="3.2" height="13" rx="1.6" fill="var(--primary)" />
          <circle cx="24" cy="44" r="2.1" fill="var(--primary)" />
        </motion.g>
        {/* front arm */}
        <motion.g
          animate={play ? { rotate: [30, -34, 30] } : { rotate: 10 }}
          transition={swing}
          style={{ transformBox: "view-box", transformOrigin: "24px 19px" }}
        >
          <rect x="22.7" y="19" width="2.6" height="10" rx="1.3" fill="var(--primary)" />
        </motion.g>
      </motion.g>
    </svg>
  );
}

/* a long-jumper: a crouch, a spring up and forward, a soft land, repeat. */
function LongJumper({ play }: { play: boolean }) {
  const cycle = play
    ? { duration: 1.9, ease: [0.34, 1.56, 0.64, 1] as const, repeat: Infinity }
    : { duration: 0 };
  return (
    <svg width="52" height="56" viewBox="0 0 52 56" fill="none" aria-hidden>
      <motion.g
        animate={play ? { y: [0, 2, -14, -8, 0], x: [0, -1, 6, 11, 0] } : { y: 0, x: 0 }}
        transition={cycle}
        style={{ transformBox: "view-box", transformOrigin: "26px 40px" }}
      >
        {/* tucked leg */}
        <motion.g
          animate={play ? { rotate: [10, 40, -16, 18, 10] } : { rotate: 10 }}
          transition={cycle}
          style={{ transformBox: "view-box", transformOrigin: "26px 31px" }}
        >
          <rect x="24.4" y="31" width="3.2" height="12.5" rx="1.6" fill="var(--blue)" />
          <circle cx="26" cy="44" r="2.1" fill="var(--blue)" />
        </motion.g>
        {/* trailing arm reach */}
        <motion.g
          animate={play ? { rotate: [-20, -54, 14, -28, -20] } : { rotate: -20 }}
          transition={cycle}
          style={{ transformBox: "view-box", transformOrigin: "26px 20px" }}
        >
          <rect x="24.7" y="20" width="2.6" height="11" rx="1.3" fill="color-mix(in srgb, var(--blue) 70%, var(--ink))" />
        </motion.g>
        <rect x="22.5" y="17" width="7" height="15" rx="3.5" fill="var(--primary)" />
        <circle cx="26" cy="12" r="5.4" fill="color-mix(in srgb, var(--cinnamon) 38%, #F4E9D6)" />
        {/* lead leg */}
        <motion.g
          animate={play ? { rotate: [-8, 28, 30, -22, -8] } : { rotate: -8 }}
          transition={cycle}
          style={{ transformBox: "view-box", transformOrigin: "26px 31px" }}
        >
          <rect x="24.4" y="31" width="3.2" height="12.5" rx="1.6" fill="var(--primary)" />
          <circle cx="26" cy="44" r="2.1" fill="var(--primary)" />
        </motion.g>
        {/* lead arm reach */}
        <motion.g
          animate={play ? { rotate: [22, 58, -10, 30, 22] } : { rotate: 22 }}
          transition={cycle}
          style={{ transformBox: "view-box", transformOrigin: "26px 20px" }}
        >
          <rect x="24.7" y="20" width="2.6" height="11" rx="1.3" fill="var(--primary)" />
        </motion.g>
      </motion.g>
    </svg>
  );
}

/* a javelin thrower: a wind-up and release of a thin spear that arcs and resets. */
function Javelin({ play }: { play: boolean }) {
  const body = play ? { duration: 2.1, ease: "easeInOut" as const, repeat: Infinity } : { duration: 0 };
  const armSwing = play
    ? { duration: 2.1, ease: [0.34, 1.56, 0.64, 1] as const, repeat: Infinity }
    : { duration: 0 };
  return (
    <svg width="58" height="56" viewBox="0 0 58 56" fill="none" aria-hidden>
      {/* planted legs in a stride */}
      <g>
        <rect x="22.6" y="31" width="3.2" height="12.5" rx="1.6" fill="color-mix(in srgb, var(--cinnamon) 70%, var(--ink))" transform="rotate(16 24 31)" />
        <rect x="24.4" y="31" width="3.2" height="12.5" rx="1.6" fill="var(--primary)" transform="rotate(-16 26 31)" />
      </g>
      {/* slight lean of the torso into the throw */}
      <motion.g
        animate={play ? { rotate: [-6, -10, 8, -6] } : { rotate: -6 }}
        transition={body}
        style={{ transformBox: "view-box", transformOrigin: "25px 31px" }}
      >
        <rect x="21.5" y="17" width="7" height="15" rx="3.5" fill="var(--primary)" />
        <circle cx="25" cy="12" r="5.4" fill="color-mix(in srgb, var(--cinnamon) 38%, #F4E9D6)" />
      </motion.g>
      {/* throwing arm + javelin, pivoting at the shoulder */}
      <motion.g
        animate={play ? { rotate: [54, 64, -42, 54] } : { rotate: 54 }}
        transition={armSwing}
        style={{ transformBox: "view-box", transformOrigin: "25px 19px" }}
      >
        <rect x="23.7" y="9" width="2.6" height="11" rx="1.3" fill="var(--primary)" />
        {/* the javelin, held at the hand end */}
        <line x1="25" y1="9" x2="25" y2="-22" stroke="var(--cinnamon)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="25" cy="-22" r="1.4" fill="var(--cinnamon)" />
      </motion.g>
    </svg>
  );
}

function SportsDay() {
  const { reduced, paused } = useValleyMotion();
  const play = !reduced && !paused;
  return (
    <div className="dli-col">
      <div className="dli-track">
        <div className="dli-track-lanes" aria-hidden />
        <div className="dli-athletes">
          <div className="dli-athlete"><Runner play={play} /><span>Runner</span></div>
          <div className="dli-athlete"><LongJumper play={play} /><span>Long jump</span></div>
          <div className="dli-athlete"><Javelin play={play} /><span>Javelin</span></div>
        </div>
      </div>
      <MapNote>One athlete loops in the corner of any skeleton; the lane stripes are just the page is still being chalked.</MapNote>
    </div>
  );
}

/* ------------------------------------------------------------ *
 * 2. BIRDS FORAGING A GRID, with articulated legs
 * ------------------------------------------------------------ */

/* a small foraging bird with two thin articulated legs and a peck tilt. */
function ForageBird({ pecking }: { pecking: boolean }) {
  const peck = pecking
    ? { duration: 0.7, ease: "easeInOut" as const, repeat: Infinity }
    : { duration: 0.3, ease: "easeInOut" as const };
  const legA = pecking
    ? { duration: 0.7, ease: "easeInOut" as const, repeat: Infinity }
    : { duration: 0 };
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      {/* legs, two thin segments, a little shuffle while pecking */}
      <motion.g
        animate={pecking ? { rotate: [0, 5, 0] } : { rotate: 0 }}
        transition={legA}
        style={{ transformBox: "view-box", transformOrigin: "15px 22px" }}
      >
        <line x1="15" y1="22" x2="13.5" y2="29" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="13.5" y1="29" x2="11.5" y2="30.5" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="13.5" y1="29" x2="15" y2="30.8" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
      </motion.g>
      <motion.g
        animate={pecking ? { rotate: [0, -5, 0] } : { rotate: 0 }}
        transition={legA}
        style={{ transformBox: "view-box", transformOrigin: "19px 22px" }}
      >
        <line x1="19" y1="22" x2="20.5" y2="29" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="20.5" y1="29" x2="22.5" y2="30.5" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="20.5" y1="29" x2="19" y2="30.8" stroke="var(--cinnamon)" strokeWidth="1.3" strokeLinecap="round" />
      </motion.g>
      {/* the body pivots down at the chest to peck */}
      <motion.g
        animate={pecking ? { rotate: [0, 34, 0, 0] } : { rotate: 0 }}
        transition={peck}
        style={{ transformBox: "view-box", transformOrigin: "16px 22px" }}
      >
        {/* tail */}
        <path d="M22 14 L30 11 L24 17 Z" fill="color-mix(in srgb, var(--primary) 60%, var(--ink))" />
        {/* body */}
        <ellipse cx="15" cy="15" rx="9" ry="7.2" fill="var(--primary)" />
        {/* wing */}
        <path d="M15 11 Q22 12 20 18 Q15 18 13 15 Z" fill="color-mix(in srgb, var(--primary) 72%, var(--ink))" />
        {/* head */}
        <circle cx="8" cy="11" r="4.4" fill="color-mix(in srgb, var(--primary) 86%, #fff)" />
        <circle cx="6.6" cy="10.4" r="1" fill="var(--ink)" />
        {/* beak */}
        <path d="M4 11.2 L-1 12 L4 13 Z" fill="var(--cinnamon)" />
      </motion.g>
    </svg>
  );
}

const FG_COLS = 3;
const FG_ROWS = 2;
const FG_TILE = 56;
const FG_GAP = 10;
function ForagingGrid() {
  const { reduced } = useValleyMotion();
  const [cell, setCell] = useState(0);
  const [pecking, setPecking] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced) return;
    // hop, peck a beat, then hop on. one bird, never two in the same cell.
    timer.current = setTimeout(() => {
      setPecking(false);
      setCell((c) => {
        let next = Math.floor(Math.random() * FG_COLS * FG_ROWS);
        if (next === c) next = (next + 1) % (FG_COLS * FG_ROWS);
        return next;
      });
      setTimeout(() => setPecking(true), 360);
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cell, reduced]);

  const col = cell % FG_COLS;
  const row = Math.floor(cell / FG_COLS);
  const bx = col * (FG_TILE + FG_GAP) + (FG_TILE - 34) / 2;
  const by = row * (FG_TILE + FG_GAP) + (FG_TILE - 34) / 2 - 4;

  return (
    <div className="dli-col">
      <div className="dli-fgwrap">
        <div className="dli-fggrid">
          {Array.from({ length: FG_COLS * FG_ROWS }).map((_, i) => (
            <div className={`dli-fgtile ambient${i === cell ? " peck" : ""}`} key={i} />
          ))}
        </div>
        <motion.div
          className="dli-forager"
          animate={reduced ? { x: bx, y: by } : { x: bx, y: by, scale: [1, 0.94, 1] }}
          transition={{
            x: SPRINGS.gentle,
            y: SPRINGS.gentle,
            scale: { duration: 0.42, ease: [0.34, 1.56, 0.64, 1] },
          }}
        >
          <ForageBird pecking={pecking && !reduced} />
        </motion.div>
      </div>
      <MapNote>The same bird walks whatever cells exist; pass it the skeleton cell rects and it forages the real grid.</MapNote>
    </div>
  );
}

/* ------------------------------------------------------------ *
 * 3. ONE REUSABLE RELAY: a flock travels across any rows
 * ------------------------------------------------------------ */
const RELAY_ROWS = [0, 1, 2, 3];
const RELAY_RH = 30;
function ReusableRelay() {
  const { reduced } = useValleyMotion();
  const [rows, setRows] = useState(4);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced) return;
    timer.current = setInterval(() => setTick((t) => t + 1), 2600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const visible = RELAY_ROWS.slice(0, rows);
  // three birds in a loose skein, each lands on a row in turn
  const flock = [0, 1, 2];

  return (
    <div className="dli-col dli-col-wide">
      <div className="dli-relaywrap">
        <div className="dli-relayrows">
          {visible.map((i) => (
            <div className="dli-relayrow" key={i}>
              <div className="dli-relaydot" />
              <div className="dli-relaylines">
                <div className="dli-relayline ambient" />
                <div className="dli-relayline ambient short" />
              </div>
            </div>
          ))}
        </div>
        {flock.map((f) => {
          const landRow = (tick + f) % rows;
          const ly = landRow * RELAY_RH - 8;
          const lx = 8 + f * 5;
          return (
            <motion.div
              key={f}
              className="dli-relaybird"
              animate={reduced ? { x: lx, y: ly } : { x: [-26, lx, lx], y: [ly, ly, ly] }}
              transition={{
                x: { duration: 1.1, delay: f * 0.18, ease: [0.34, 1.4, 0.64, 1] },
                y: { duration: 0.9, delay: f * 0.18, ease: "easeInOut" as const },
              }}
            >
              <BirdAvatar user={{ id: `relay-${f}` }} size={22} />
            </motion.div>
          );
        })}
      </div>
      <div className="dli-relayctls">
        <Ctl onClick={() => setRows((r) => (r >= 4 ? 2 : r + 1))}>Rows: {rows}</Ctl>
        <span className="dli-hint">add or drop rows; the same flock adapts</span>
      </div>
      <MapNote>One component, any layout. Hand it the count of skeleton rows and the flock distributes itself across them.</MapNote>
    </div>
  );
}

/* ------------------------------------------------------------ *
 * 4. SLEEPING BIRDS that wake when content loads
 * ------------------------------------------------------------ */
function SleepingBird({ awake, delay }: { awake: boolean; delay: number }) {
  return (
    <svg width="36" height="30" viewBox="0 0 36 30" fill="none" aria-hidden>
      {/* perch */}
      <line x1="2" y1="26" x2="34" y2="26" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
      {/* a little hop up on wake */}
      <motion.g
        animate={awake ? { y: [0, -4, 0] } : { y: 0 }}
        transition={awake ? { duration: 0.5, delay, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3 }}
        style={{ transformBox: "view-box", transformOrigin: "18px 24px" }}
      >
        {/* feet */}
        <line x1="16" y1="22" x2="16" y2="26" stroke="var(--cinnamon)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="20" y1="22" x2="20" y2="26" stroke="var(--cinnamon)" strokeWidth="1.2" strokeLinecap="round" />
        {/* body, fluffed when asleep */}
        <motion.ellipse
          cx="18" cy="16" rx="9" ry="7.5"
          fill="var(--blue)"
          animate={awake ? { scaleY: 1 } : { scaleY: 1.06 }}
          transition={{ duration: 0.4 }}
          style={{ transformBox: "view-box", transformOrigin: "18px 18px" }}
        />
        {/* head: tucked into the wing when asleep, lifted and turned when awake */}
        <motion.g
          animate={awake ? { rotate: 0, x: 0, y: 0 } : { rotate: -42, x: 3, y: 2 }}
          transition={awake ? { ...SPRINGS.gentle, delay } : SPRINGS.gentle}
          style={{ transformBox: "view-box", transformOrigin: "18px 14px" }}
        >
          <circle cx="11" cy="12" r="4.6" fill="color-mix(in srgb, var(--blue) 86%, #fff)" />
          {/* eye: a closed dash asleep, an open dot awake */}
          {awake ? (
            <circle cx="9.4" cy="11.4" r="1" fill="var(--ink)" />
          ) : (
            <line x1="8" y1="11.4" x2="11" y2="11.4" stroke="var(--ink)" strokeWidth="1" strokeLinecap="round" />
          )}
          <path d="M6.5 12.4 L1.5 13 L6.5 14 Z" fill="var(--cinnamon)" />
        </motion.g>
      </motion.g>
      {/* a tiny floating Z while asleep */}
      <AnimatePresence>
        {!awake && (
          <motion.text
            x="27" y="9" fontSize="7" fontWeight="700" fill="var(--ink-soft)"
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: [0, 1, 0], y: 3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" as const }}
          >
            z
          </motion.text>
        )}
      </AnimatePresence>
    </svg>
  );
}

function SleepingBirds() {
  const [loaded, setLoaded] = useState(false);
  const birds = [0, 1, 2];
  return (
    <div className="dli-col dli-col-wide">
      <div className="dli-sleepstage">
        <div className="dli-sleeprow">
          {birds.map((b) => (
            <SleepingBird key={b} awake={loaded} delay={b * 0.12} />
          ))}
        </div>
        <div className="dli-sleepbody">
          {!loaded ? (
            birds.map((b) => (
              <div className="dli-srow" key={b}>
                <div className="dli-sdisc" />
                <div className="dli-slines">
                  <div className="dli-sline ambient" />
                  <div className="dli-sline ambient short" />
                </div>
              </div>
            ))
          ) : (
            birds.map((b) => (
              <motion.div
                className="dli-lrow"
                key={b}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.settle, delay: 0.12 + b * 0.07 }}
              >
                <BirdAvatar user={{ id: `sleep-${b}` }} size={30} />
                <div className="dli-lmeta">
                  <strong>{["Meera", "Arun", "Lata"][b]}</strong>
                  <span>{["posted a sighting", "shared a Roundup", "added to the Collection"][b]}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      <Ctl onClick={() => setLoaded((l) => !l)}>{loaded ? "Reset to loading" : "Load content"}</Ctl>
      <MapNote>The perched birds doze over the skeleton; on the data event they wake and the rows fade up underneath them.</MapNote>
    </div>
  );
}

/* ------------------------------------------------------------ *
 * 5. PAC-MAN BIRD TRAIL (verdict only, owner asked: too cringe?)
 * ------------------------------------------------------------ */
const PAC_DOTS = 7;
function PacBird() {
  const { reduced } = useValleyMotion();
  const [eaten, setEaten] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced) return;
    timer.current = setInterval(() => setEaten((e) => (e + 1) % (PAC_DOTS + 2)), 520);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const step = 30;
  const birdX = Math.min(eaten, PAC_DOTS) * step;

  return (
    <div className="dli-col">
      <span className="dli-cringe">Verdict needed, owner asked: is this too cringe?</span>
      <div className="dli-pacwrap">
        <div className="dli-pacdots">
          {Array.from({ length: PAC_DOTS }).map((_, i) => (
            <span key={i} className={`dli-pacdot${i < eaten ? " gone" : ""}`} />
          ))}
        </div>
        <motion.div
          className="dli-pacbird"
          animate={reduced ? { x: 0 } : { x: birdX }}
          transition={{ x: SPRINGS.snappy }}
        >
          {/* a bird whose open beak chomps the row of dots */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <circle cx="14" cy="14" r="11" fill="var(--cinnamon)" />
            <motion.path
              d="M14 14 L27 8 L27 20 Z"
              fill="var(--surface)"
              animate={reduced ? { rotate: 0 } : { rotate: [0, -14, 0] }}
              transition={{ duration: 0.52, ease: "easeInOut" as const, repeat: Infinity }}
              style={{ transformBox: "view-box", transformOrigin: "14px 14px" }}
            />
            <circle cx="11" cy="9" r="1.5" fill="var(--ink)" />
          </svg>
        </motion.div>
      </div>
      <MapNote>It would eat the skeleton dots left to right. Honest read: cute, but the arcade reference is off-brand for the valley.</MapNote>
    </div>
  );
}

/* ============================================================ */
export default function Page() {
  return (
    <DelightShell
      title="Loading states, ideas round 2"
      lede="Richer living loading scenes to choose from, before we build the real one. Each is a real looping mockup, not a still."
      css={CSS}
    >
      {/* the brief, kept visible so every concept is judged against it */}
      <section className="dli-brief v2-card">
        <h2 className="v2-display">What the chosen scene has to do</h2>
        <ul>
          <li><b>One reusable thing</b>, usable on every page. Not a different scene per page; it overlays any skeleton shape.</li>
          <li><b>Enjoyable for 1 to 10 seconds.</b> It loops calmly and never tips into annoying.</li>
          <li><b>Delay-gated.</b> It only appears after a short wait, so pages that load instantly never show it.</li>
          <li><b>School-relevant.</b> Rishi Valley birds, the valley, and sports day.</li>
        </ul>
      </section>

      <DemoGrid>
        <DemoCard title="Sports day" note="Tiny rounded athletes loop on a chalked track: a runner mid-stride, a long-jumper, a javelin thrower. Articulated limbs, transform only." span={3}>
          <SportsDay />
        </DemoCard>

        <DemoCard title="Birds foraging a grid" note="A small bird with articulated legs hops cell to cell and pecks, the way the Valley Collection thumbnails would fill in." span={2}>
          <ForagingGrid />
        </DemoCard>

        <DemoCard title="One reusable relay" note="A loose skein of birds lands across whatever rows exist. Add or drop rows and the same flock adapts." span={1}>
          <ReusableRelay />
        </DemoCard>

        <DemoCard title="Sleeping birds wake on load" note="Birds doze on a perch over the skeleton. Press Load and they wake, then the real rows rise underneath." span={2}>
          <SleepingBirds />
        </DemoCard>

        <DemoCard title="Pac-Man bird trail" note="Here only for a verdict. Owner asked whether the arcade reference is too cringe for the valley." span={1}>
          <PacBird />
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
/* shared layout */
.dli-col { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; }
.dli-col-wide { align-items:stretch; }
.dli-ctl { align-self:center; }
.dli-hint { font-size:11px; color:var(--ink-soft); }

/* the brief banner */
.dli-brief { padding:18px 22px; margin-bottom:22px; }
.dli-brief h2 { font-size:17px; margin:0 0 10px; }
.dli-brief ul { margin:0; padding-left:18px; display:grid; gap:7px; }
.dli-brief li { font-size:13px; line-height:1.5; color:var(--ink); }
.dli-brief b { font-weight:700; }

/* reusable-overlay mapping note */
.dli-map { font-size:11.5px; line-height:1.45; color:var(--ink-soft); margin:0; max-width:46ch; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:5px; }
.dli-map span { font-size:9.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--primary);
  padding:2px 8px; border-radius:999px; background:color-mix(in srgb, var(--primary) 10%, transparent); }
.dli-col-wide .dli-map { text-align:left; align-items:flex-start; }

/* --- 1. sports day --- */
.dli-track { position:relative; width:100%; max-width:520px; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, color-mix(in srgb, var(--blue) 7%, var(--surface-2)), var(--surface-2)); padding:14px 0 0; }
.dli-track-lanes { position:absolute; inset:0; pointer-events:none;
  background:repeating-linear-gradient(90deg, transparent 0 36px, color-mix(in srgb, #fff 40%, transparent) 36px 38px); opacity:.5; }
.dli-athletes { position:relative; display:flex; justify-content:space-around; align-items:flex-end; }
.dli-athlete { display:flex; flex-direction:column; align-items:center; gap:2px; padding-bottom:18px; }
.dli-athlete span { font-size:10px; font-weight:600; color:var(--ink-soft); }
.dli-athletes::after { content:""; position:absolute; left:6%; right:6%; bottom:14px; height:3px; border-radius:2px;
  background:color-mix(in srgb, var(--cinnamon) 55%, var(--surface)); }

/* --- 2. foraging grid --- */
.dli-fgwrap { position:relative; width:${FG_COLS * FG_TILE + (FG_COLS - 1) * FG_GAP}px; height:${FG_ROWS * FG_TILE + (FG_ROWS - 1) * FG_GAP}px; }
.dli-fggrid { display:grid; grid-template-columns:repeat(${FG_COLS}, ${FG_TILE}px); gap:${FG_GAP}px; }
.dli-fgtile { width:${FG_TILE}px; height:${FG_TILE}px; border-radius:11px;
  background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, var(--primary) 9%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dliSheen 3s ease-in-out infinite; }
.dli-fgtile.peck { box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--primary) 35%, transparent); }
.dli-forager { position:absolute; left:0; top:0; z-index:2; pointer-events:none; }
@keyframes dliSheen { 0%{ background-position:120% 0; } 100%{ background-position:-120% 0; } }

/* --- skeleton row primitives reused by 3 and 4 --- */
.dli-sdisc { width:30px; height:30px; border-radius:50%; flex:none; background:color-mix(in srgb, var(--blue) 14%, var(--surface-2)); }
.dli-slines { flex:1; display:flex; flex-direction:column; gap:7px; }
.dli-sline { height:10px; border-radius:6px;
  background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, #fff 24%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dliSheen 2.8s ease-in-out infinite; }
.dli-sline.short { width:54%; }
.dli-srow { display:flex; gap:12px; align-items:center; }
.dli-lrow { display:flex; gap:12px; align-items:center; }
.dli-lmeta { display:flex; flex-direction:column; line-height:1.3; }
.dli-lmeta strong { font-size:13px; }
.dli-lmeta span { font-size:11.5px; color:var(--ink-soft); }

/* --- 3. reusable relay --- */
.dli-relaywrap { position:relative; width:100%; min-height:${RELAY_ROWS.length * RELAY_RH}px; }
.dli-relayrows { display:flex; flex-direction:column; gap:0; }
.dli-relayrow { display:flex; gap:10px; align-items:center; height:${RELAY_RH}px; }
.dli-relaydot { width:18px; height:18px; border-radius:50%; flex:none; background:color-mix(in srgb, var(--primary) 14%, var(--surface-2)); }
.dli-relaylines { flex:1; display:flex; flex-direction:column; gap:5px; }
.dli-relayline { height:7px; border-radius:5px;
  background:linear-gradient(100deg, var(--surface-2), color-mix(in srgb, #fff 22%, var(--surface-2)) 50%, var(--surface-2));
  background-size:240% 100%; animation:dliSheen 2.9s ease-in-out infinite; }
.dli-relayline.short { width:48%; }
.dli-relaybird { position:absolute; left:0; top:0; z-index:3; pointer-events:none; }
.dli-relayctls { display:flex; align-items:center; gap:12px; align-self:center; }

/* --- 4. sleeping birds --- */
.dli-sleepstage { display:flex; flex-direction:column; gap:14px; width:100%; }
.dli-sleeprow { display:flex; gap:24px; justify-content:center; padding:6px 0 0; }
.dli-sleepbody { display:flex; flex-direction:column; gap:12px; }

/* --- 5. pac-man --- */
.dli-cringe { font-size:10.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--cinnamon);
  padding:4px 10px; border-radius:999px; background:color-mix(in srgb, var(--cinnamon) 12%, transparent); }
.dli-pacwrap { position:relative; width:240px; height:30px; display:flex; align-items:center; }
.dli-pacdots { position:absolute; inset:0; display:flex; align-items:center; gap:0; padding-left:30px; }
.dli-pacdot { width:30px; display:inline-flex; justify-content:center; }
.dli-pacdot::before { content:""; width:7px; height:7px; border-radius:50%; background:color-mix(in srgb, var(--primary) 45%, var(--surface-2)); transition:opacity .2s var(--ease-pop); }
.dli-pacdot.gone::before { opacity:0; }
.dli-pacbird { position:absolute; left:0; top:1px; z-index:2; }
`;
