"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  RouteLink,
  FadeRise,
  Stagger,
  staggerChild,
  SpringPress,
  motion,
} from "./_kit";
import { HoopoeMascot } from "./_hoopoe";

const ROUTES = [
  { href: "/preview/delight/transitions", title: "Navigation & transitions", desc: "The sliding sidebar marker, the seg thumb, content cross-fade between views, the landing to login lateral pass, and a coordinated first paint." },
  { href: "/preview/delight/composer", title: "The composer, reworked", desc: "A slim pill that unfurls. Photo, poll and letter tucked away, no tag walls, bold and italic and underline and strike, click outside to close." },
  { href: "/preview/delight/landing", title: "The living valley", desc: "A calm photo hero, then a living section: leaves with real veins the cursor parts, and cute legged birds that walk, peck and hop between frames." },
  { href: "/preview/delight/feedback", title: "Feedback moments", desc: "A smoother heart, an even bookmark that tucks, share without the wiggle, RSVP, poll bars, the bell dot, fund progress, a better chirp." },
  { href: "/preview/delight/loading", title: "Loading states", desc: "Warm valley shimmer that now loops clean, leaves that settle on hand-off, the Letters draw-on, a bird crossing the skeleton rows." },
  { href: "/preview/delight/loading-ideas", title: "Loading, ideas round 2", desc: "Richer living scenes to choose from before we build: sports-day athletes, foraging birds, one reusable relay, sleepers that wake." },
  { href: "/preview/delight/eggs", title: "Easter eggs & ambient", desc: "Hover the logo for a valley fact (ten of them), the konami valley flash, and an honest note on what we parked." },
  { href: "/preview/delight/hoopoe", title: "The hoopoe mascot", desc: "One resident bird, many poses. Built in a separate session, linked here so the whole cast lives in one place." },
];

export default function DelightIndex() {
  const [fadeKey, setFadeKey] = useState(0);
  const [liked, setLiked] = useState(true);

  return (
    <DelightShell
      title="The delight lab"
      lede="Calm, warm, slightly springy. Frequent things stay quiet; rich things stay rare. One spring feel runs through all of it."
      index
      css={INDEX_CSS}
    >
      {/* hero */}
      <FadeRise>
        <section className="dl-hero v2-card">
          <div className="dl-hero-bird">
            <HoopoeMascot size={130} pose="idle" />
          </div>
          <div className="dl-hero-copy">
            <h2 className="v2-display">A place, not a template.</h2>
            <p>
              Two buckets, one feel. <b>Common</b> motion smooths the snaps you hit every day, kept so small it
              reads as the absence of jank. <b>Signature</b> motion is the resident hoopoe, the living valley
              section, and a few hidden things that reward looking closely.
            </p>
            <p className="dl-hero-note">Everything here animates, all the time, by choice. The controls up top are lab-only. Light mode is home; dark is parked for later.</p>
          </div>
        </section>
      </FadeRise>

      {/* foundation */}
      <h2 className="dl-section v2-display">Foundation</h2>
      <DemoGrid>
        <DemoCard title="One spring, everything" note="Tap the row. The card, the pill and the heart all answer to the same spring, so the whole product moves like one hand made it.">
          <SpringPress as="div" className="dl-swatch-row" {...({ role: "button", tabIndex: 0 } as object)}>
            <div className="dl-swatch-card v2-card">Card</div>
            <div className="v2-btn v2-btn-primary">Pill</div>
            <span className={`dl-heart heartwrap${liked ? " liked" : ""}`} onClick={(e) => { e.stopPropagation(); setLiked((l) => !l); }}>
              <Heart size={34} weight={liked ? "fill" : "regular"} />
            </span>
          </SpringPress>
        </DemoCard>

        <DemoCard title="FadeRise enter" note="The settle spring used for route changes, load choreography and empty states.">
          <div className="dl-stack">
            <FadeRise key={fadeKey} delay={0}><div className="dl-row v2-card">Posts ease up</div></FadeRise>
            <FadeRise key={fadeKey + 100} delay={0.06}><div className="dl-row v2-card">one</div></FadeRise>
            <FadeRise key={fadeKey + 200} delay={0.12}><div className="dl-row v2-card">after another</div></FadeRise>
            <button className="v2-btn v2-btn-ghost sm" onClick={() => setFadeKey((k) => k + 1)}>Replay</button>
          </div>
        </DemoCard>

        <DemoCard title="SpringPress + stagger" note="A clear press on every clickable now (a sink on tap, a small lift on hover), and a one-time stagger on first paint.">
          <Stagger className="dl-chips">
            {["Photo", "Poll", "Letter", "Sighting"].map((c) => (
              <motion.span key={c} variants={staggerChild}>
                <SpringPress as="div" className="v2-chip">{c}</SpringPress>
              </motion.span>
            ))}
          </Stagger>
        </DemoCard>

        <DemoCard title="Decisions locked" note="The calls behind this round, so every room reads the same way." span={3}>
          <div className="dl-decide">
            <div><span className="dl-dot ok" /> Everything animates, all the time. Nothing here gates on the OS reduced-motion setting (your call).</div>
            <div><span className="dl-dot ok" /> Light mode is home. Dark is parked for a later, dedicated pass.</div>
            <div><span className="dl-dot ok" /> The heart is always red. Only transform animates, never colour.</div>
            <div><span className="dl-dot ok" /> Press is intentional: a sink on tap, a lift on hover, one spring across the product.</div>
            <div><span className="dl-dot off" /> The hoopoe mascot is built in a separate session. Slots are left for it here and on the landing.</div>
          </div>
        </DemoCard>
      </DemoGrid>

      {/* routes */}
      <h2 className="dl-section v2-display">Walk the rooms</h2>
      <div className="dl-routes">
        {ROUTES.map((r) => (
          <RouteLink key={r.href} {...r} />
        ))}
      </div>
    </DelightShell>
  );
}

const INDEX_CSS = `
.dl-hero { display:flex; align-items:center; gap:26px; padding:26px 28px; margin-bottom:34px; }
.dl-hero-bird { flex:0 0 auto; display:grid; place-items:center; width:150px; height:150px; border-radius:20px;
  background:radial-gradient(120% 120% at 50% 20%, color-mix(in srgb, var(--cinnamon) 12%, var(--surface-2)), var(--surface-2)); }
.dl-hero-copy h2 { font-size:26px; margin:0 0 10px; }
.dl-hero-copy p { font-size:14.5px; line-height:1.65; color:var(--ink); margin:0 0 10px; max-width:62ch; }
.dl-hero-note { font-size:13px !important; color:var(--ink-soft) !important; }
.dl-section { font-size:15px; letter-spacing:.02em; margin:6px 2px 14px; color:var(--ink-soft); text-transform:uppercase; }
.dl-swatch-row { display:flex; gap:16px; align-items:center; justify-content:center; cursor:pointer; outline:none; }
.dl-heart { display:inline-grid; place-items:center; width:60px; height:60px; border-radius:16px; background:var(--surface-2); color:var(--ink-soft); cursor:pointer; }
.dl-heart.liked { color:var(--heart); }
.dl-heart.liked svg { animation:dlpop .4s var(--ease-pop); }
@keyframes dlpop { 0%{transform:scale(1)} 45%{transform:scale(1.4)} 100%{transform:scale(1)} }
.dl-stack { display:flex; flex-direction:column; gap:8px; width:100%; align-items:flex-start; }
.dl-row { width:100%; padding:10px 14px; font-size:13px; color:var(--ink-soft); }
.dl-chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
.dl-ambient-window { position:relative; width:100%; height:130px; border-radius:14px; overflow:hidden; background:var(--surface-2); display:grid; place-items:center; }
.dl-hint, .dl-tier p { font-size:11.5px; color:var(--ink-soft); }
.dl-hint { position:absolute; bottom:8px; right:12px; }
.dl-tier { display:flex; flex-direction:column; gap:8px; font-size:13px; }
.dl-tier b { font-weight:700; }
.dl-tier p { margin:6px 0 0; }
.dl-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:7px; vertical-align:middle; }
.dl-dot.ok { background:var(--primary); } .dl-dot.off { background:var(--ink-soft); opacity:.5; }
.dl-decide { display:grid; grid-template-columns:1fr 1fr; gap:11px 26px; font-size:13px; line-height:1.5; color:var(--ink); width:100%; }
.dl-decide > div { padding-right:6px; }
@media (max-width:640px){ .dl-decide{ grid-template-columns:1fr; } }
.dl-routes { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
@media (max-width:960px){ .dl-routes{grid-template-columns:repeat(2,1fr);} .dl-hero{flex-direction:column; text-align:center;} }
@media (max-width:640px){ .dl-routes{grid-template-columns:1fr;} }
`;
