"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DelightShell, DemoGrid, DemoCard, SpringPress, motion } from "../_kit";
import { HoopoeMascot, type HoopoePose } from "../_hoopoe";

const POSES: { pose: HoopoePose; label: string; gaze?: number }[] = [
  { pose: "idle", label: "idle (blinks)" },
  { pose: "peek", label: "peek" },
  { pose: "covered", label: "covered" },
  { pose: "curious", label: "curious", gaze: 0.8 },
  { pose: "searching", label: "searching", gaze: -0.7 },
  { pose: "point", label: "point", gaze: -1 },
  { pose: "happy", label: "happy" },
  { pose: "sleepy", label: "sleepy" },
];

export default function HoopoeLab() {
  // password
  const [showPw, setShowPw] = useState(false);
  // trivia gaze
  const [answer, setAnswer] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [triviaPose, setTriviaPose] = useState<HoopoePose>("curious");
  // greet + success
  const [greetPose, setGreetPose] = useState<HoopoePose>("idle");
  const [greetGaze, setGreetGaze] = useState(0);
  const [flap, setFlap] = useState(false);
  // sleepy
  const [sleepy, setSleepy] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const after = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const gaze = Math.max(-1, Math.min(1, (answer.length / 14) * 2 - 1));

  function markCorrect() {
    setTriviaPose("happy");
    after(900, () => setTriviaPose("curious"));
  }
  function markWrong() {
    setShakeKey((k) => k + 1);
  }
  function greet() {
    setGreetPose("curious");
    setGreetGaze(0.9);
    after(500, () => setGreetGaze(-0.7));
    after(1000, () => { setGreetGaze(0); setGreetPose("idle"); });
  }
  function bob() {
    setGreetPose("happy");
    after(800, () => setGreetPose("idle"));
  }
  function doFlap() {
    setFlap(true);
    after(800, () => setFlap(false));
  }

  return (
    <DelightShell
      title="The hoopoe mascot"
      lede="One resident bird, threaded through the product. The same wings that cover the password peek into empty states, follow your typing, and flap when something good happens."
      css={CSS}
    >
      <DemoGrid>
        <DemoCard title="Pose library" note="One sprite, swappable poses. Idle blinks on its own. Everything springs, with a little wing bounce." span={3}>
          <div className="dlh-grid">
            {POSES.map((p) => (
              <div key={p.label} className="dlh-cell">
                <div className="dlh-stage"><HoopoeMascot size={92} pose={p.pose} gaze={p.gaze ?? 0} /></div>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </DemoCard>

        <DemoCard title="Password field" note="It keeps its eyes open while the password is hidden, and politely covers them the moment you reveal it.">
          <div className="dlh-pw">
            <HoopoeMascot size={92} pose={showPw ? "covered" : "idle"} />
            <div className="dlh-inputwrap">
              <input className="v2-input" type={showPw ? "text" : "password"} defaultValue="valleybird" aria-label="Password" />
              <button className="dlh-eye" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password">
                {showPw ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Gaze follows your typing" note="On the join quiz the bird leans toward what you write. A wrong answer shakes it; a right one makes it flap.">
          <div className="dlh-trivia">
            <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -7, 6, -4, 0] } : {}} transition={{ duration: 0.45 }}>
              <HoopoeMascot size={88} pose={triviaPose} gaze={triviaPose === "happy" ? 0 : gaze} />
            </motion.div>
            <input
              className="v2-input"
              placeholder="Which house is by the banyan?"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="dlh-row">
              <SpringPress className="v2-btn v2-btn-primary sm" onClick={markCorrect}>Right answer</SpringPress>
              <SpringPress className="v2-btn v2-btn-ghost sm" onClick={markWrong}>Wrong answer</SpringPress>
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Greet and bob" note="A resting bird you can say hello to. It looks around, and bobs happily when tapped.">
          <div className="dlh-col">
            <SpringPress as="div" className="dlh-tap" onClick={bob}>
              <HoopoeMascot size={96} pose={greetPose} gaze={greetGaze} />
            </SpringPress>
            <div className="dlh-row">
              <SpringPress className="v2-btn v2-btn-ghost sm" onClick={greet}>Greet</SpringPress>
              <SpringPress className="v2-btn v2-btn-ghost sm" onClick={bob}>Tap it</SpringPress>
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Success wing-flap" note="A rare celebratory beat for committing actions: a post published, an RSVP confirmed. Never on a like.">
          <div className="dlh-col">
            <HoopoeMascot size={96} pose={flap ? "happy" : "idle"} />
            <SpringPress className="v2-btn v2-btn-primary sm" onClick={doFlap}>Publish</SpringPress>
          </div>
        </DemoCard>

        <DemoCard title="Sleepy after dark" note="Late at night the bird droops and slows. A small touch that only the night owls will ever see.">
          <div className="dlh-col">
            <HoopoeMascot size={96} pose={sleepy ? "sleepy" : "idle"} />
            <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setSleepy((s) => !s)}>
              {sleepy ? "Wake up" : "After 11pm"}
            </SpringPress>
          </div>
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
.dlh-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; width:100%; }
.dlh-cell { display:flex; flex-direction:column; align-items:center; gap:8px; }
.dlh-stage { width:100%; height:118px; display:grid; place-items:center; border-radius:14px;
  background:radial-gradient(120% 120% at 50% 22%, color-mix(in srgb, var(--cinnamon) 9%, var(--surface-2)), var(--surface-2)); }
.dlh-cell span { font-size:11.5px; color:var(--ink-soft); letter-spacing:.02em; }
.dlh-pw { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; }
.dlh-inputwrap { position:relative; width:100%; max-width:260px; }
.dlh-eye { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:34px; height:34px; display:grid; place-items:center;
  border:0; background:transparent; color:var(--ink-soft); cursor:pointer; border-radius:999px; }
.dlh-eye:hover { color:var(--ink); background:var(--surface-2); }
.dlh-trivia { display:flex; flex-direction:column; align-items:center; gap:13px; width:100%; }
.dlh-trivia .v2-input { max-width:280px; text-align:center; }
.dlh-col { display:flex; flex-direction:column; align-items:center; gap:14px; }
.dlh-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
.dlh-tap { cursor:pointer; border-radius:50%; }
@media (max-width:760px){ .dlh-grid{ grid-template-columns:repeat(2,1fr);} }
`;
