"use client";

import { useState } from "react";
import { LayoutGroup } from "motion/react";
import { DelightShell, DemoGrid, DemoCard, Seg } from "../_kit";
import { ChainDemo } from "./_chain-demo";

/* ------------------------------------------------------------------ *
 *  Settings, rebuilt twice.
 *
 *  A delight room, not a second-look room (owner, 2026-08-07: "the
 *  layout of this lab is just so serious ... we used to do labs under
 *  delight and it used to be so much nicer"). So: things to press,
 *  short notes, and no scoreboard.
 *
 *  The two full takes are loaded in iframes rather than rendered
 *  inline, because both read the real viewport. The house panel and
 *  the city picker ask the window how wide it is, and a narrowed div
 *  lies to them. An iframe carries its own window, so 390px in here is
 *  a genuine phone.
 * ------------------------------------------------------------------ */

type Width = "phone" | "desk";

export default function SettingsRoom() {
  return (
    <DelightShell
      title="Settings, twice"
      lede="One page rebuilt two ways. A quiet sheet you type straight into, and your own profile with the pen handed to you. The houses are a chain you build a year at a time."
      css={CSS}
    >
      <DemoGrid>
        <ChainCard />
        <PillCard />
        <PenCard />
        <TakeCard
          title="The profile, with the pen in it"
          note="Your profile is the settings page. Press Done to see it go back to reading."
          take="profile"
        />
      </DemoGrid>
    </DelightShell>
  );
}

/* ---- 1. the chain, on its own stage ---- */
function ChainCard() {
  return (
    <DemoCard
      title="Build your houses, one year at a time"
      note="Tap the grey pill, pick a house, it takes its colour and the next year appears. Same house twice and the two pills become one."
      span={3}
    >
      <div className="dls-stage">
        <ChainDemo />
      </div>
    </DemoCard>
  );
}

/* ---- 2. the pill, before and after ---- */
function PillCard() {
  return (
    <DemoCard
      title="Grey, then not"
      note="An unanswered year is dashed and grey. The year sits where the house name will go, so answering it moves nothing."
    >
      <div className="dls-pills">
        <span className="dls-pill dls-pill-empty">2015-16</span>
        <span className="dls-arrow" aria-hidden>
          becomes
        </span>
        <span className="dls-pill dls-pill-full">
          <b>Raavi</b>
          <i>2015-16</i>
        </span>
      </div>
    </DemoCard>
  );
}

/* ---- 3. the one mark that says "yours to change" ---- */
function PenCard() {
  const [on, setOn] = useState<Width>("phone");
  return (
    <DemoCard
      title="One mark, not fourteen boxes"
      note="A dotted canopy underline at rest. The box only turns up under the pointer and on focus, so the sheet never becomes a form."
    >
      <div className="dls-pen">
        {/* Every Seg in the shared kit animates one thumb keyed `dlSegThumb`.
            With four of them on this page the thumb flew across the room when
            you pressed any of them. LayoutGroup namespaces the id per group,
            which fixes it here without changing the kit for other rooms. */}
        <LayoutGroup id="pen">
          <Seg
            options={[
              { v: "phone" as const, label: "At rest" },
              { v: "desk" as const, label: "Focused" },
            ]}
            value={on}
            onChange={setOn}
          />
        </LayoutGroup>
        <p className={`dls-penline${on === "desk" ? " focused" : ""}`}>
          <span className="dls-penword">Sanan Shankar</span>
        </p>
      </div>
    </DemoCard>
  );
}

/* ---- 4 + 5. the two whole takes ---- */
function TakeCard({ title, note, take }: { title: string; note: string; take: string }) {
  const [w, setW] = useState<Width>("desk");
  return (
    <DemoCard title={title} note={note} span={3} pad={false}>
      <div className="dls-take">
        <div className="dls-take-bar">
          <LayoutGroup id={take}>
            <Seg
              options={[
                { v: "desk" as const, label: "Desktop" },
                { v: "phone" as const, label: "Phone" },
              ]}
              value={w}
              onChange={setW}
            />
          </LayoutGroup>
        </div>
        <div className="dls-frame-wrap">
          {/* 820, not the full card. The app gives settings a centred content
              column, so a frame the width of this room would show the take
              floating in 500px of nothing that the real page never has. */}
          <iframe
            src={`/lab/settings/demo?take=${take}`}
            style={{ width: w === "phone" ? 390 : 820, height: w === "phone" ? 900 : 1080 }}
            className="dls-frame"
            title={title}
          />
        </div>
      </div>
    </DemoCard>
  );
}

const CSS = `
.dls-stage { width:100%; padding:6px 4px; }

/* the two specimen pills */
.dls-pills { display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center; }
.dls-pill { display:inline-flex; align-items:baseline; gap:6px; white-space:nowrap; border-radius:999px;
  border:1px solid; padding:4px 10px; font-size:12.5px; }
.dls-pill-empty { border-style:dashed; border-color:color-mix(in srgb, var(--ink-soft) 45%, transparent);
  background:color-mix(in srgb, var(--ink) 3%, transparent); color:var(--ink-soft);
  font-family:var(--font-display),Georgia,serif; font-weight:700; }
.dls-pill-full { border-color:color-mix(in srgb, var(--primary) 35%, transparent);
  background:color-mix(in srgb, var(--primary) 8%, transparent); color:var(--primary); }
.dls-pill-full b { font-family:var(--font-display),Georgia,serif; font-weight:700; }
.dls-pill-full i { font-style:normal; font-size:10.5px; font-weight:600; opacity:.75; font-variant-numeric:tabular-nums; }
.dls-arrow { font-size:11.5px; color:var(--ink-soft); }

/* the pen mark */
.dls-pen { display:flex; flex-direction:column; align-items:center; gap:18px; }
.dls-penline { margin:0; }
.dls-penword { font-family:var(--font-display),Georgia,serif; font-size:26px; font-weight:700; letter-spacing:-.03em;
  padding:2px 7px; border-radius:9px; border:1px solid transparent;
  text-decoration:underline; text-decoration-style:dotted; text-decoration-thickness:2px; text-underline-offset:5px;
  text-decoration-color:color-mix(in srgb, var(--primary) 40%, transparent);
  transition:background-color .15s var(--ease-spring), border-color .15s var(--ease-spring); }
.dls-penline.focused .dls-penword { border-color:color-mix(in srgb, var(--primary) 45%, transparent);
  background:#FFF; text-decoration-color:transparent; }

/* the two full takes */
.dls-take { width:100%; }
.dls-take-bar { display:flex; justify-content:flex-end; padding:12px 16px; border-bottom:1px solid var(--border); }
.dls-frame-wrap { display:flex; justify-content:center; background:var(--surface-2); padding:0; }
.dls-frame { border:0; display:block; background:transparent; }
`;
