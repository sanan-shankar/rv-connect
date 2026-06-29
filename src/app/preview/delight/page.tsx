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
  AmbientLayer,
  motion,
  PeaksMark,
} from "./_kit";
import { HoopoeMascot } from "./_hoopoe";

const ROUTES = [
  { href: "/preview/delight/transitions", title: "Navigation & transitions", desc: "Sliding sidebar marker, seg and tab thumbs, content cross-rise, the landing to login lateral pass." },
  { href: "/preview/delight/hoopoe", title: "The hoopoe mascot", desc: "One resident bird, many poses: password cover and peek, gaze-follow, wing-flap, sleepy, point." },
  { href: "/preview/delight/landing", title: "The living valley", desc: "Canvas leaf-fall the cursor parts, scroll breeze, parallax ridges, a bird that hops the screenshots." },
  { href: "/preview/delight/loading", title: "Loading states", desc: "Warm valley shimmer, a hoopoe hopping the skeleton rows, leaves that settle on hand-off." },
  { href: "/preview/delight/feedback", title: "Feedback moments", desc: "Heart pop with leaf flecks, bookmark ribbon, focus ring bloom, composer unfurl, report blur-in." },
  { href: "/preview/delight/eggs", title: "Easter eggs & ambient", desc: "Good-evening tint, the logo draw-on, a corner peek, theme sun-sweep, the rare drifting feather." },
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
              hero, and a few hidden things that reward looking closely.
            </p>
            <p className="dl-hero-note">Use the controls up top to flip light or dark and to feel reduced motion freeze the big ambient effects while the micro-delights keep their character.</p>
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

        <DemoCard title="SpringPress + stagger" note="Press depth on every clickable, and a one-time stagger on first paint.">
          <Stagger className="dl-chips">
            {["Photo", "Poll", "Letter", "Sighting"].map((c) => (
              <motion.span key={c} variants={staggerChild}>
                <SpringPress as="div" className="v2-chip">{c}</SpringPress>
              </motion.span>
            ))}
          </Stagger>
        </DemoCard>

        <DemoCard title="AmbientLayer (scroll)" note="Scroll-linked drift for the faint banyan background and the ridge layers. Freezes under reduced motion." span={2}>
          <div className="dl-ambient-window">
            <AmbientLayer factor={0.12} className="parallax">
              <PeaksMark size={54} variant="light" />
            </AmbientLayer>
            <span className="dl-hint">scroll the page; the ridge drifts</span>
          </div>
        </DemoCard>

        <DemoCard title="Reduced-motion contract" note="Tier 1 (large ambient) freezes. Tier 2 (hoopoe, like-pop, bell) stays on, by choice.">
          <div className="dl-tier">
            <div><span className="dl-dot ok" /> Tier 2 micro stays: <b>kept</b></div>
            <div><span className="dl-dot off" /> Tier 1 ambient: <b>frozen</b></div>
            <p>Toggle Reduced motion in the top bar to compare.</p>
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
.dl-routes { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
@media (max-width:960px){ .dl-routes{grid-template-columns:repeat(2,1fr);} .dl-hero{flex-direction:column; text-align:center;} }
@media (max-width:640px){ .dl-routes{grid-template-columns:1fr;} }
`;
