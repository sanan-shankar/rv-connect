"use client";

import { useEffect, useRef, useState } from "react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  FadeRise,
  SPRINGS,
  motion,
  PeaksMark,
  BirdAvatar,
} from "../_kit";

/* ------------------------------------------------------------------ *
 *  Easter eggs & ambient.
 *  An HONEST set: two eggs we are actually shipping, built well, plus
 *  clearly labeled notes for the ones parked or deferred to another
 *  session. Nothing invisible, nothing broken, nothing pretending to
 *  work that does not.
 * ------------------------------------------------------------------ */

/* ---------------- Logo fact: hover the peaks for a school fact ---------------- */

// Ten made-up but plausible Rishi Valley facts. One is chosen per page load and
// stays fixed for the session; a reload picks a different one.
const VALLEY_FACTS = [
  "The valley is a recognised bird sanctuary. Patient watchers have logged more than two hundred species along the same dry-stream paths the children walk to class.",
  "There are no bells. Lessons begin and end by a shared sense of time, an idea Krishnamurti held to so that attention was never summoned by a ringing.",
  "Three hills frame the school: Bodikonda to the west, Middle Peak in the centre, and Rishikonda to the east, the granite ridge that gives the valley its first light.",
  "The great banyan is old enough that its dropped roots have become trunks of their own, so a single tree now shelters whole classes sitting in its shade.",
  "Asthachal, the sunset-watching place, is kept in silence. Students gather at dusk to watch the light leave the hills and say nothing at all.",
  "The open-air amphitheatre is cut into a slope, so an unamplified voice on the stone floor carries cleanly to the back row.",
  "Jiddu Krishnamurti founded the school in 1926 with the wish that learning happen without fear, reward, or comparison between one child and the next.",
  "Decades of careful planting turned eroded scrubland back into woodland, and the returning birds were the first sign that the valley had healed.",
  "The houses are named for trees and hills of the valley, so a student's first address is also a small lesson in what grows around them.",
  "Rain is read, not forecast. Old students still tell which hill the clouds will break over by the way the wind turns through the three peaks.",
];

function LogoFactDemo() {
  // Pick ONE fact index once, on mount, so it is stable across every hover for
  // this page load and differs on reload. useState initializer would run on the
  // server too (hydration mismatch with Math.random), so we gate to the client
  // with useEffect and render a calm resting state until it is set.
  const [factIndex, setFactIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Picks a random fact on the client only. Randomising during render is exactly what would desync the server and client markup.
    setFactIndex(Math.floor(Math.random() * VALLEY_FACTS.length));
  }, []);

  const ready = factIndex !== null;
  const fact = ready ? VALLEY_FACTS[factIndex] : "";

  return (
    <div className="dle-logocol">
      <div className="dle-logostage">
        <button
          type="button"
          className="dle-logobtn"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen((o) => !o)}
          aria-label="Rishi Valley, reveal a school fact"
          aria-expanded={open && ready}
        >
          <PeaksMark size={30} />
        </button>

        <motion.div
          className="dle-factcard"
          initial={false}
          animate={
            open && ready
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 9 }
          }
          transition={SPRINGS.settle}
          style={{ pointerEvents: open && ready ? "auto" : "none" }}
          role="tooltip"
        >
          <span className="dle-fact-kicker">Did you know</span>
          <p className="dle-fact-body">{fact}</p>
        </motion.div>
      </div>

      <p className="dle-hint">
        Hover, focus, or tap the peaks. One fact per visit, held steady while you
        read. Reload the page for a different one.
      </p>
    </div>
  );
}

/* ---------------- Konami valley flush ---------------- */

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const FLUSH_BIRDS = ["k-pitta", "k-bee-eater", "k-roller", "k-hoopoe"];

function KonamiDemo() {
  const [flush, setFlush] = useState(0);
  const buf = useRef<string[]>([]);

  function run() {
    setFlush((f) => f + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buf.current = [...buf.current, k].slice(-KONAMI.length);
      if (
        buf.current.length === KONAMI.length &&
        KONAMI.every((v, i) => buf.current[i] === v)
      ) {
        buf.current = [];
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Falling leaves accompany the birds. Keyed off `flush` so every trigger
  // mounts a fresh, fully replayed set.
  const leaves = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="dle-konamicol">
      <div className="dle-konami-frame">
        {flush > 0 && (
          <>
            {leaves.map((i) => (
              <motion.span
                key={`${flush}-leaf-${i}`}
                className="dle-leaf drift"
                style={{ left: `${6 + i * 13}%` }}
                initial={{ y: -18, opacity: 0, rotate: -20 }}
                animate={{
                  y: 130,
                  opacity: [0, 1, 1, 0],
                  rotate: [-20, 14, -8, 10],
                }}
                transition={{
                  duration: 2.1 + (i % 3) * 0.3,
                  ease: "easeInOut",
                  delay: i * 0.09,
                }}
                aria-hidden
              >
                <svg width="14" height="16" viewBox="0 0 14 16">
                  <path
                    d="M7 1 C12 5 12 12 7 15 C2 12 2 5 7 1 Z"
                    fill="var(--primary)"
                    opacity="0.85"
                  />
                  <line
                    x1="7"
                    y1="3"
                    x2="7"
                    y2="14"
                    stroke="#fff"
                    strokeOpacity="0.45"
                    strokeWidth="0.8"
                  />
                </svg>
              </motion.span>
            ))}
            {FLUSH_BIRDS.map((id, i) => (
              <motion.span
                key={`${flush}-${id}`}
                className="dle-fly drift"
                initial={{ x: -80, y: 12 + i * 17, opacity: 0 }}
                animate={{
                  x: 520,
                  y: -8 + i * 15,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2 + i * 0.22,
                  ease: "easeInOut",
                  delay: i * 0.16,
                }}
                aria-hidden
              >
                <BirdAvatar user={{ photoUrl: null, id, name: "Flush" }} size={28} />
              </motion.span>
            ))}
          </>
        )}
        <span className="dle-konami-watermark" aria-hidden>
          <PeaksMark size={40} />
        </span>
      </div>

      <p className="dle-konami-lede">
        Type the Konami sequence anywhere on this page:
      </p>
      <code className="dle-code">up up down down left right left right b a</code>
      <SpringPress className="v2-btn v2-btn-soft sm" onClick={run}>
        Or trigger it here
      </SpringPress>
      <p className="dle-hint">
        A small flock crosses the frame and a few leaves drift down. The buffer
        ignores typing inside text fields.
      </p>
    </div>
  );
}

/* ---------------- Parked / deferred notes ---------------- */

function ParkedNote({
  status,
  title,
  body,
}: {
  status: "parked" | "deferred" | "candidate";
  title: string;
  body: string;
}) {
  const label =
    status === "deferred"
      ? "Deferred"
      : status === "candidate"
        ? "Candidate"
        : "Parked";
  return (
    <div className={`dle-parked dle-parked-${status}`}>
      <span className="dle-parked-tag">{label}</span>
      <h4 className="dle-parked-title">{title}</h4>
      <p className="dle-parked-body">{body}</p>
    </div>
  );
}

function ParkedDemo() {
  return (
    <div className="dle-parkedcol">
      <ParkedNote
        status="deferred"
        title="Hoopoe corner peek"
        body="A hoopoe mascot peeking in from a corner belongs with the rest of the hoopoe work. Deferred to the hoopoe session; nothing is built here."
      />
      <ParkedNote
        status="candidate"
        title="School-bell chime"
        body="A hidden chime keyed to the valley's no-bell ethos could be a quiet, opt-in surprise, distinct from the notification bell. Pending owner go. No sound is built."
      />
      <ParkedNote
        status="parked"
        title="Theme sun-sweep"
        body="A day-to-dusk sweep is parked with dark mode. The app is light-mode-first and ships a single static background, so it has no home yet."
      />
      <ParkedNote
        status="parked"
        title="Removed: ambient experiments"
        body="The hour-tint background, the dawn greeting, the heart-streak feather, and the idle peaks breathing were cut. Each was either invisible in practice or redundant with effects that already live elsewhere."
      />
    </div>
  );
}

export default function Page() {
  return (
    <DelightShell
      title="Easter eggs & ambient"
      lede="The hidden layer, surfaced so you can see it. Two eggs we are shipping, built for real, plus an honest list of what is parked or handed to another session."
      css={CSS}
    >
      <DemoGrid>
        <FadeRise>
          <DemoCard
            title="Logo fact"
            note="Hover the peaks mark for a Rishi Valley fact. One per visit, steady while you read."
            span={1}
          >
            <LogoFactDemo />
          </DemoCard>
        </FadeRise>

        <FadeRise delay={0.04}>
          <DemoCard
            title="Konami valley flush"
            note="The old code sends a small flock and a few leaves across the frame."
            span={2}
          >
            <KonamiDemo />
          </DemoCard>
        </FadeRise>

        <FadeRise delay={0.08}>
          <DemoCard
            title="Parked & deferred"
            note="Everything we considered and chose not to ship here, with the reason."
            span={3}
          >
            <ParkedDemo />
          </DemoCard>
        </FadeRise>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
.delight .dle-hint { font-size:11.5px; color:var(--ink-soft); margin:0; text-align:center; line-height:1.45; max-width:34ch; }

/* logo fact */
.dle-logocol { display:flex; flex-direction:column; align-items:center; gap:18px; width:100%; padding-top:6px; }
.dle-logostage { position:relative; display:flex; flex-direction:column; align-items:center; }
.dle-logobtn { display:inline-flex; align-items:center; justify-content:center; padding:14px 18px; border-radius:16px;
  border:1px solid var(--border); background:var(--surface-2); color:var(--primary); cursor:pointer;
  transition:transform .16s var(--ease-pop), border-color .15s ease; }
.dle-logobtn:hover { border-color:color-mix(in srgb, var(--primary) 32%, var(--border)); background-image:linear-gradient(color-mix(in srgb, var(--ink) 6%, transparent), color-mix(in srgb, var(--ink) 6%, transparent)); }
.dle-logobtn:active { transform:scale(.97); }
.dle-logobtn:focus-visible { outline:2px solid color-mix(in srgb, var(--primary) 55%, transparent); outline-offset:3px; }
.dle-factcard { position:absolute; top:calc(100% + 12px); left:50%; transform:translateX(-50%); width:min(280px, 84vw); z-index:6;
  background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:13px 15px 14px;
  box-shadow:0 1px 2px rgba(0,0,0,.05), 0 18px 38px -22px rgba(0,0,0,.55); text-align:left; }
.dle-fact-kicker { display:block; font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  color:var(--cinnamon); margin-bottom:6px; }
.dle-fact-body { font-size:12.5px; line-height:1.55; color:var(--ink); margin:0; }

/* konami */
.dle-konamicol { display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; }
.dle-konami-frame { position:relative; width:100%; height:128px; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, color-mix(in srgb, var(--blue) 9%, var(--surface-2)), var(--surface-2));
  border:1px solid var(--border); }
.dle-fly { position:absolute; top:8px; left:0; }
.dle-leaf { position:absolute; top:0; }
.dle-konami-watermark { position:absolute; right:14px; bottom:10px; color:var(--ink-soft); opacity:.18; pointer-events:none; }
.dle-konami-lede { font-size:12px; color:var(--ink-soft); margin:2px 0 0; }
.dle-code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:var(--ink-soft);
  background:var(--surface-2); border:1px solid var(--border); border-radius:8px; padding:6px 10px; }

/* parked / deferred */
.dle-parkedcol { display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; width:100%; }
.dle-parked { position:relative; background:var(--surface-2); border:1px dashed var(--border); border-radius:14px;
  padding:14px 15px 15px; }
.dle-parked-tag { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
  padding:3px 8px; border-radius:999px; margin-bottom:9px;
  background:color-mix(in srgb, var(--ink-soft) 16%, var(--surface)); color:var(--ink-soft); }
.dle-parked-deferred .dle-parked-tag { background:color-mix(in srgb, var(--blue) 16%, var(--surface)); color:var(--blue); }
.dle-parked-candidate .dle-parked-tag { background:color-mix(in srgb, var(--cinnamon) 16%, var(--surface)); color:var(--cinnamon); }
.dle-parked-title { font-size:13px; font-weight:700; margin:0 0 5px; color:var(--ink); }
.dle-parked-body { font-size:12px; line-height:1.5; color:var(--ink-soft); margin:0; }
@media (max-width:640px){ .dle-parkedcol { grid-template-columns:1fr; } }
`;
