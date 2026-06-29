"use client";

import { useEffect, useRef, useState } from "react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  FadeRise,
  Stagger,
  staggerChild,
  SPRINGS,
  useValleyMotion,
  motion,
  PeaksMark,
  BirdAvatar,
} from "../_kit";
import { HoopoeMascot } from "../_hoopoe";
import { Heart } from "@phosphor-icons/react";

/* helper: warm valley tint for a given hour (cool midday, amber after 6pm) */
function todTint(hour: number) {
  // deep blue before dawn, soft sky midday, amber/dusk evening
  if (hour < 5) return "#1B2C3A"; // pre-dawn
  if (hour < 8) return "#C8956A"; // dawn warmth
  if (hour < 11) return "#D9C9A8"; // cool morning
  if (hour < 15) return "#E7E1D3"; // neutral midday (base)
  if (hour < 18) return "#E6CFA6"; // golden afternoon
  if (hour < 20) return "#D98F52"; // sunset amber
  if (hour < 22) return "#A8623A"; // dusk
  return "#2A3340"; // night
}
function todWord(hour: number) {
  if (hour < 5) return "before dawn";
  if (hour < 8) return "sunrise";
  if (hour < 11) return "morning";
  if (hour < 15) return "midday";
  if (hour < 18) return "afternoon";
  if (hour < 20) return "sunset";
  if (hour < 22) return "dusk";
  return "night";
}

/* ---------------- 1. Good-evening valley tint ---------------- */
function TintDemo() {
  const [hour, setHour] = useState(13);
  return (
    <div className="dle-tint-wrap">
      <div
        className="dle-tint-shell"
        style={{ ["--tod-tint" as string]: todTint(hour) }}
      >
        <div className="dle-tint-bar">
          <PeaksMark size={18} />
          <span>Rishi Valley</span>
        </div>
        <div className="dle-tint-body">
          <span className="dle-tint-time">
            {String(hour).padStart(2, "0")}:00
          </span>
          <span className="dle-tint-word">{todWord(hour)}</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={23}
        value={hour}
        className="dle-range"
        onChange={(e) => setHour(Number(e.target.value))}
        aria-label="Hour override"
      />
      <p className="dle-hint">Drag to set the hour. The shell warms toward evening.</p>
    </div>
  );
}

/* ---------------- 2. Dawn-chorus greeting ---------------- */
function GreetingDemo() {
  const [run, setRun] = useState(0);
  const words = ["Good", "morning,", "the", "valley", "is", "awake."];
  return (
    <div className="dle-greet">
      <HoopoeMascot size={84} pose="idle" />
      <div className="dle-greet-text">
        {run === 0 ? (
          <span className="dle-greet-rest">Press to greet the day.</span>
        ) : (
          <Stagger key={run} gap={0.08} className="dle-greet-words">
            {words.map((w, i) => (
              <motion.span key={i} variants={staggerChild} className="dle-greet-word">
                {w}{" "}
              </motion.span>
            ))}
          </Stagger>
        )}
      </div>
      <SpringPress className="v2-btn v2-btn-primary sm" onClick={() => setRun((r) => r + 1)}>
        First load today
      </SpringPress>
    </div>
  );
}

/* ---------------- 3. Rishi Konda landmark tooltip ---------------- */
function LandmarkDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="dle-landmark">
      <button
        type="button"
        className="dle-loc-chip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <PeaksMark size={15} /> Rishi Konda
      </button>
      <motion.div
        className="dle-tooltip"
        initial={false}
        animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={SPRINGS.settle}
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
        The sun rises behind Rishi Konda, the granite hill that gives the valley
        its first light. Old students still walk up for it.
      </motion.div>
      <p className="dle-hint">Hover, focus, or tap the chip.</p>
    </div>
  );
}

/* ---------------- 4. Hoopoe corner peek ---------------- */
function CornerPeekDemo() {
  const { reduced } = useValleyMotion();
  const [peek, setPeek] = useState(false);
  function trigger() {
    setPeek(true);
    if (!reduced) setTimeout(() => setPeek(false), 1900);
  }
  return (
    <div className="dle-peekcol">
      <div className="dle-frame">
        <motion.div
          className="dle-corner-bird ambient"
          initial={false}
          animate={
            peek
              ? { x: 0, y: 0, rotate: -8, opacity: 1 }
              : { x: -54, y: -54, rotate: -28, opacity: 0 }
          }
          transition={SPRINGS.gentle}
        >
          <HoopoeMascot size={72} pose="peek" />
        </motion.div>
        <span className="dle-frame-label">a quiet corner</span>
      </div>
      <SpringPress className="v2-btn v2-btn-soft sm" onClick={trigger}>
        Trigger peek
      </SpringPress>
    </div>
  );
}

/* ---------------- 5. Bell roost ---------------- */
function BellDemo() {
  const { reduced } = useValleyMotion();
  const [perched, setPerched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function dwellStart() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPerched(true), 1200);
  }
  function dwellEnd() {
    if (timer.current) clearTimeout(timer.current);
    setPerched(false);
  }
  function force() {
    setPerched(true);
    if (!reduced) setTimeout(() => setPerched(false), 2200);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <div className="dle-bellcol">
      <div
        className="dle-bellstage"
        onMouseEnter={dwellStart}
        onMouseLeave={dwellEnd}
      >
        <motion.div
          className="dle-roost-bird"
          initial={false}
          animate={perched ? { y: 0, opacity: 1, scale: 1 } : { y: -16, opacity: 0, scale: 0.85 }}
          transition={SPRINGS.gentle}
        >
          <BirdAvatar user={{ id: "roost-bird", name: "Roost" }} size={28} />
        </motion.div>
        <svg width="56" height="58" viewBox="0 0 56 58" aria-hidden className="dle-bell">
          <rect x="26" y="2" width="4" height="10" rx="2" fill="var(--cinnamon)" />
          <path d="M14 48 Q14 18 28 16 Q42 18 42 48 Z" fill="var(--cinnamon)" />
          <ellipse cx="28" cy="48" rx="16" ry="4" fill="color-mix(in srgb, var(--cinnamon) 70%, #000)" />
          <circle cx="28" cy="51" r="3" fill="color-mix(in srgb, var(--cinnamon) 60%, #000)" />
        </svg>
      </div>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={force}>
        Dwell on the bell
      </SpringPress>
      <p className="dle-hint">A bird perches after about 1.2s, then flies off.</p>
    </div>
  );
}

/* ---------------- 6. Heart-streak feather + long-idle doze ---------------- */
function MilestoneDemo() {
  const { reduced } = useValleyMotion();
  const [liked, setLiked] = useState(false);
  const [feathers, setFeathers] = useState<number[]>([]);
  function milestone() {
    setLiked(true);
    if (!reduced) {
      const id = Date.now();
      setFeathers((f) => [...f, id]);
      setTimeout(() => setFeathers((f) => f.filter((x) => x !== id)), 2400);
    }
  }
  return (
    <div className={`dle-milestone${liked ? " liked" : ""}`}>
      <div className="dle-heartstage">
        <span className="heartwrap">
          <Heart weight={liked ? "fill" : "regular"} size={34} />
        </span>
        {feathers.map((id) => (
          <motion.span
            key={id}
            className="dle-feather drift"
            initial={{ opacity: 0, y: 6, rotate: -6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -78, rotate: 16 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          >
            <svg width="16" height="22" viewBox="0 0 16 22" aria-hidden>
              <path d="M8 1 Q15 9 8 21 Q1 9 8 1 Z" fill="var(--cinnamon)" opacity="0.9" />
              <line x1="8" y1="3" x2="8" y2="19" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
            </svg>
          </motion.span>
        ))}
      </div>
      <SpringPress className="v2-btn v2-btn-soft sm" onClick={milestone}>
        Milestone like
      </SpringPress>
      <p className="dle-hint">A rare feather drifts up on a streak like.</p>
    </div>
  );
}

function DozeDemo() {
  const { reduced } = useValleyMotion();
  const [awake, setAwake] = useState(false);
  return (
    <div className="dle-dozecol">
      <motion.div
        animate={awake ? { y: [0, -4, 0] } : { y: 0 }}
        transition={awake && !reduced ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
      >
        <HoopoeMascot size={92} pose={awake ? "happy" : "sleepy"} />
      </motion.div>
      <div className="dle-dozebtns">
        <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setAwake(false)}>
          Idle
        </SpringPress>
        <SpringPress className="v2-btn v2-btn-primary sm" onClick={() => setAwake(true)}>
          Activity
        </SpringPress>
      </div>
      <p className="dle-hint">{awake ? "Awake, perked up with a small overshoot." : "Dozing: eyes droop, head dips."}</p>
    </div>
  );
}

/* ---------------- 7. Idle peaks breathing ---------------- */
function PeaksBreathDemo() {
  const { reduced, paused } = useValleyMotion();
  const breathe = !reduced && !paused;
  const [shimmer, setShimmer] = useState(0);
  return (
    <div className="dle-peakscol">
      <div className="dle-peaks-stage">
        <motion.div
          className="ambient"
          style={{ transformOrigin: "center bottom" }}
          animate={breathe ? { scale: [1, 1.012, 1] } : { scale: 1 }}
          transition={breathe ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        >
          <PeaksMark size={72} />
        </motion.div>
        <motion.span
          key={shimmer}
          className="dle-crest-flick"
          initial={{ opacity: 0, x: -30 }}
          animate={shimmer ? { opacity: [0, 0.8, 0], x: 30 } : { opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setShimmer((s) => s + 1)}>
        Crest shimmer
      </SpringPress>
      <p className="dle-hint">The peaks breathe slowly. A rare shimmer flicks across.</p>
    </div>
  );
}

/* ---------------- 8. Theme transitions ---------------- */
function ThemeDemo() {
  const { reduced } = useValleyMotion();
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [style, setStyle] = useState<"dusk" | "morph" | "cross">("dusk");
  const [tick, setTick] = useState(0);
  function flip(s: "dusk" | "morph" | "cross") {
    setStyle(s);
    setMode((m) => (m === "light" ? "dark" : "light"));
    setTick((t) => t + 1);
  }
  const dark = mode === "dark";
  return (
    <div className="dle-themecol">
      <div className={`dle-themecard${dark ? " is-dark" : ""}`}>
        {/* circular dusk reveal */}
        {style === "dusk" && !reduced && (
          <motion.span
            key={tick}
            className="dle-dusk"
            initial={{ clipPath: "circle(0% at 82% 18%)" }}
            animate={{ clipPath: "circle(150% at 82% 18%)" }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            style={{ background: dark ? "#10171A" : "#F6F2E8" }}
          />
        )}
        <div className="dle-theme-row">
          {/* sun-to-moon morph */}
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="dle-celestial">
            <motion.circle
              cx="17" cy="17" r="8"
              animate={{ fill: dark ? "var(--ink-soft)" : "var(--cinnamon)" }}
              transition={{ duration: 0.4 }}
            />
            <motion.circle
              cx="22" cy="13" r="7"
              animate={{ opacity: dark && style === "morph" ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              fill="var(--surface)"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <motion.line
                key={a}
                x1="17" y1="3" x2="17" y2="7"
                stroke="var(--cinnamon)" strokeWidth="2" strokeLinecap="round"
                transform={`rotate(${a} 17 17)`}
                animate={{ opacity: dark ? 0 : style === "morph" ? 1 : 0.6 }}
                transition={{ duration: 0.35 }}
              />
            ))}
          </svg>
          <span className="dle-theme-label">{dark ? "Dusk has fallen" : "Valley daylight"}</span>
        </div>
      </div>
      <div className="dle-themebtns">
        <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => flip("dusk")}>Dusk reveal</SpringPress>
        <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => flip("morph")}>Sun to moon</SpringPress>
        <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => flip("cross")}>Crossfade</SpringPress>
      </div>
    </div>
  );
}

/* ---------------- 9. Konami valley-bird flush ---------------- */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
function KonamiDemo() {
  const { reduced } = useValleyMotion();
  const [flush, setFlush] = useState(0);
  const buf = useRef<string[]>([]);
  function run() {
    setFlush((f) => f + 1);
    if (!reduced) setTimeout(() => {}, 0);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buf.current = [...buf.current, k].slice(-KONAMI.length);
      if (KONAMI.every((v, i) => buf.current[i] === v)) {
        buf.current = [];
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const birds = ["k-a", "k-b", "k-c"];
  return (
    <div className="dle-konamicol">
      <div className="dle-konami-frame">
        {flush > 0 &&
          birds.map((id, i) => (
            <motion.span
              key={`${flush}-${id}`}
              className="dle-fly drift"
              initial={{ x: -70, y: 14 + i * 18, opacity: 0 }}
              animate={{ x: 360, y: -10 + i * 16, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2 + i * 0.25, ease: "easeInOut", delay: i * 0.18 }}
            >
              <BirdAvatar user={{ id, name: "Flush" }} size={26} />
            </motion.span>
          ))}
      </div>
      <code className="dle-code">up up down down left right left right b a</code>
      <SpringPress className="v2-btn v2-btn-soft sm" onClick={run}>
        Run it
      </SpringPress>
      <p className="dle-hint">Type the sequence anywhere, or press the button.</p>
    </div>
  );
}

/* ---------------- 10. Muted-by-default sound + haptics ---------------- */
function SoundHapticsDemo() {
  const [sound, setSound] = useState(false);
  const [buzzed, setBuzzed] = useState(false);
  function haptic() {
    setBuzzed(true);
    setTimeout(() => setBuzzed(false), 600);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(18); } catch { /* ignore */ }
    }
  }
  return (
    <div className="dle-soundcol">
      <button
        type="button"
        className={`dle-toggle${sound ? " on" : ""}`}
        onClick={() => setSound((s) => !s)}
        role="switch"
        aria-checked={sound}
      >
        <span className="dle-toggle-track"><span className="dle-toggle-thumb" /></span>
        Soft sounds {sound ? "on" : "off"}
      </button>
      <p className="dle-hint">
        Off by default. When on, a like would play a soft hoopoe oop. No audio file ships here.
      </p>
      <motion.div animate={buzzed ? { x: [0, -3, 3, -2, 0] } : { x: 0 }} transition={{ duration: 0.45 }}>
        <SpringPress className="v2-btn v2-btn-ghost sm" onClick={haptic}>
          Haptic tap
        </SpringPress>
      </motion.div>
      <p className="dle-hint">Calls navigator.vibrate on supported phones. Quiet on desktop.</p>
    </div>
  );
}

export default function Page() {
  return (
    <DelightShell
      title="Easter eggs & ambient"
      lede="The layer you usually never notice, surfaced here so you can see it. Each one has a force-trigger control."
      css={CSS}
    >
      <DemoGrid>
        <FadeRise>
          <DemoCard title="Good-evening valley tint" note="An hour override warms the shell toward dusk." span={1}>
            <TintDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.04}>
          <DemoCard title="Dawn-chorus greeting" note="First load of the day keys in word by word." span={1}>
            <GreetingDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.08}>
          <DemoCard title="Rishi Konda landmark" note="A location chip reveals a small valley fact." span={1}>
            <LandmarkDemo />
          </DemoCard>
        </FadeRise>

        <FadeRise delay={0.04}>
          <DemoCard title="Hoopoe corner peek" note="The hoopoe peeks in from a corner, then ducks out." span={1}>
            <CornerPeekDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.08}>
          <DemoCard title="Bell roost" note="Linger on the bell and a bird perches briefly." span={1}>
            <BellDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.12}>
          <DemoCard title="Heart-streak feather" note="A rare feather drifts up on a milestone like." span={1}>
            <MilestoneDemo />
          </DemoCard>
        </FadeRise>

        <FadeRise delay={0.04}>
          <DemoCard title="Long-idle doze" note="The hoopoe nods off, then wakes with an overshoot." span={1}>
            <DozeDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.08}>
          <DemoCard title="Idle peaks breathing" note="The peaks breathe slowly, with a rare crest shimmer." span={1}>
            <PeaksBreathDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.12}>
          <DemoCard title="Theme transitions" note="Three ways the valley changes from day to dusk." span={1}>
            <ThemeDemo />
          </DemoCard>
        </FadeRise>

        <FadeRise delay={0.04}>
          <DemoCard title="Konami valley flush" note="An old code sends a few birds across the frame." span={2}>
            <KonamiDemo />
          </DemoCard>
        </FadeRise>
        <FadeRise delay={0.08}>
          <DemoCard title="Sound & haptics" note="Muted by default. Gentle, opt-in, never startling." span={1}>
            <SoundHapticsDemo />
          </DemoCard>
        </FadeRise>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
.delight .dle-hint { font-size:11.5px; color:var(--ink-soft); margin:0; text-align:center; line-height:1.4; max-width:30ch; }

/* 1. tint */
.dle-tint-wrap { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; }
.dle-tint-shell { width:100%; border-radius:14px; border:1px solid var(--border); overflow:hidden;
  background-color:var(--tod-tint); transition:background-color 700ms var(--ease-spring); }
.dle-tint-bar { display:flex; align-items:center; gap:7px; padding:9px 12px; font-size:12px; font-weight:600;
  color:#fff; background:rgba(20,30,24,.28); }
.dle-tint-body { padding:18px 14px 22px; display:flex; flex-direction:column; align-items:center; gap:2px; }
.dle-tint-time { font-size:26px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.35); font-family:var(--font-display),serif; }
.dle-tint-word { font-size:12px; color:rgba(255,255,255,.85); text-transform:capitalize; letter-spacing:.02em; }
.dle-range { -webkit-appearance:none; appearance:none; width:100%; height:5px; border-radius:999px; background:var(--surface-2); outline:none; }
.dle-range::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--cinnamon); cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.25); }
.dle-range::-moz-range-thumb { width:16px; height:16px; border:0; border-radius:50%; background:var(--cinnamon); cursor:pointer; }

/* 2. greeting */
.dle-greet { display:flex; flex-direction:column; align-items:center; gap:10px; }
.dle-greet-text { min-height:24px; text-align:center; }
.dle-greet-words { font-size:16px; font-family:var(--font-display),serif; color:var(--ink); }
.dle-greet-word { display:inline-block; }
.dle-greet-rest { font-size:13px; color:var(--ink-soft); }

/* 3. landmark */
.dle-landmark { display:flex; flex-direction:column; align-items:center; gap:10px; position:relative; }
.dle-loc-chip { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:var(--primary);
  background:color-mix(in srgb, var(--primary) 10%, var(--surface)); border:1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
  padding:8px 13px; border-radius:999px; cursor:pointer; }
.dle-tooltip { position:absolute; top:46px; left:50%; transform:translateX(-50%); width:min(240px, 88%);
  background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:11px 13px;
  font-size:12px; line-height:1.5; color:var(--ink); box-shadow:0 12px 30px -18px rgba(0,0,0,.6); z-index:5; }

/* 4. corner peek */
.dle-peekcol { display:flex; flex-direction:column; align-items:center; gap:12px; }
.dle-frame { position:relative; width:170px; height:108px; border-radius:14px; overflow:hidden;
  background:var(--surface-2); border:1px solid var(--border); }
.dle-corner-bird { position:absolute; top:6px; left:6px; }
.dle-frame-label { position:absolute; bottom:9px; right:11px; font-size:11px; color:var(--ink-soft); }

/* 5. bell */
.dle-bellcol { display:flex; flex-direction:column; align-items:center; gap:11px; }
.dle-bellstage { position:relative; width:90px; height:96px; display:grid; place-items:end center; padding-bottom:8px; }
.dle-roost-bird { position:absolute; top:0; left:50%; transform:translateX(-50%); }
.dle-bell { display:block; }

/* 6. milestone + doze */
.dle-milestone { display:flex; flex-direction:column; align-items:center; gap:11px; }
.dle-heartstage { position:relative; width:60px; height:96px; display:grid; place-items:end center; padding-bottom:6px; }
.dle-feather { position:absolute; bottom:34px; left:50%; transform:translateX(-50%); }
.dle-dozecol { display:flex; flex-direction:column; align-items:center; gap:10px; }
.dle-dozebtns { display:flex; gap:8px; }

/* 7. peaks */
.dle-peakscol { display:flex; flex-direction:column; align-items:center; gap:11px; }
.dle-peaks-stage { position:relative; display:grid; place-items:center; padding:6px 30px; overflow:hidden; }
.dle-crest-flick { position:absolute; top:8px; left:0; width:24px; height:36px;
  background:linear-gradient(100deg, transparent, rgba(255,255,255,.75), transparent); filter:blur(2px); pointer-events:none; }

/* 8. theme */
.dle-themecol { display:flex; flex-direction:column; align-items:center; gap:11px; width:100%; }
.dle-themecard { position:relative; width:100%; height:96px; border-radius:14px; overflow:hidden; border:1px solid var(--border);
  background:var(--surface-2); transition:background-color .45s ease, color .45s ease; }
.dle-themecard.is-dark { background:#10171A; color:#E8EDE7; }
.dle-dusk { position:absolute; inset:0; z-index:1; }
.dle-theme-row { position:relative; z-index:2; height:100%; display:flex; align-items:center; justify-content:center; gap:11px; }
.dle-theme-label { font-size:13px; font-weight:600; font-family:var(--font-display),serif; }
.dle-themebtns { display:flex; gap:7px; flex-wrap:wrap; justify-content:center; }

/* 9. konami */
.dle-konamicol { display:flex; flex-direction:column; align-items:center; gap:11px; width:100%; }
.dle-konami-frame { position:relative; width:100%; height:84px; border-radius:14px; overflow:hidden;
  background:var(--surface-2); border:1px solid var(--border); }
.dle-fly { position:absolute; top:18px; left:0; }
.dle-code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:var(--ink-soft);
  background:var(--surface-2); border:1px solid var(--border); border-radius:8px; padding:6px 10px; }

/* 10. sound + haptics */
.dle-soundcol { display:flex; flex-direction:column; align-items:center; gap:10px; }
.dle-toggle { display:inline-flex; align-items:center; gap:9px; font-size:13px; font-weight:600; color:var(--ink);
  background:transparent; border:0; cursor:pointer; font-family:inherit; }
.dle-toggle-track { width:38px; height:22px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border);
  position:relative; transition:background-color .15s ease; }
.dle-toggle-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--ink-soft);
  transition:transform .18s var(--ease-pop), background-color .15s ease; }
.dle-toggle.on .dle-toggle-track { background:color-mix(in srgb, var(--primary) 30%, var(--surface-2)); }
.dle-toggle.on .dle-toggle-thumb { transform:translateX(16px); background:var(--primary); }
`;
