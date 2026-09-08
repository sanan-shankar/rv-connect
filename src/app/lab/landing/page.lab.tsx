"use client";

import { ChevronDown, Mountain } from "lucide-react";
import {
  DelightShell,
  SpringPress,
  FadeRise,
  Stagger,
  staggerChild,
  motion,
  PeaksMark,
  useValleyMotion,
} from "../_kit";
import { LeafCanvas } from "../_leaves";
import { BirdField } from "../_birds";

/* ------------------------------------------------------------------ *
 *  The living valley landing.
 *
 *  STRUCTURE (per owner): a CALM photo hero at the very top (a quiet
 *  placeholder band, no leaves on it), then the living "describe the
 *  site" section below it. That second section is the most-seen part
 *  of the page, so it carries everything: leaves drifting and parting
 *  around the cursor, articulated birds walking and hopping along a
 *  row of framed product-screenshot placeholders, and a slot reserved
 *  for the hoopoe mascot (built in a separate session).
 * ------------------------------------------------------------------ */

export default function LandingDemo() {
  const { reduced } = useValleyMotion();
  return (
    <DelightShell
      title="The living valley"
      lede="A calm photo hero up top, then the part that describes the site comes alive: leaves drift and part around your cursor, little birds walk and hop along the screenshots, and a quick scroll leans the whole field like a gust. Move your mouse through the leaves, click one to flick it, and scroll to feel the breeze."
      css={CSS}
    >
      {/* ============================================================ *
       *  1. CALM HERO. A quiet first-photo band. No leaves, no birds.
       * ============================================================ */}
      <section className="dll-hero" aria-label="Hero photograph">
        <div className="dll-hero-photo">
          {/* placeholder for the real hero photograph of the valley */}
          <div className="dll-photo-tag">
            <Mountain size={15} />
            <span>Hero photograph of Rishi Valley</span>
          </div>
          <div className="dll-hero-vignette" />
        </div>
        <div className="dll-herocopy">
          <Stagger gap={0.08}>
            <motion.div variants={staggerChild}>
              <span className="dll-eyebrow">Rishi Valley Alumni</span>
            </motion.div>
            <motion.h2 variants={staggerChild} className="v2-display">
              Come back to the valley.
            </motion.h2>
            <motion.p variants={staggerChild}>
              Find the people you grew up under the same trees with.
            </motion.p>
            <motion.div variants={staggerChild} className="dll-cta">
              <SpringPress className="v2-btn v2-btn-primary">Request an invite</SpringPress>
              <SpringPress className="v2-btn v2-btn-ghost">Sign in</SpringPress>
            </motion.div>
          </Stagger>
        </div>
        <motion.div
          className="dll-scrollcue"
          animate={reduced ? {} : { y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        >
          <ChevronDown size={22} />
        </motion.div>
      </section>

      {/* ============================================================ *
       *  2. THE LIVING SECTION. The most-seen part of the page.
       *     Leaves fall, birds move, the ridge breathes behind the
       *     framed screenshot placeholders the birds walk along.
       * ============================================================ */}
      <section className="dll-living" aria-label="What you can do here">
        {/* breathing ridge backdrop */}
        <div className="dll-sky parallax" aria-hidden />
        <div className={`dll-shafts ambient${reduced ? " still" : ""}`} aria-hidden />
        <div className="dll-ridges" aria-hidden>
          <motion.div
            className="dll-ridge r3 parallax"
            style={{ color: "#cdd9c4" }}
            animate={reduced ? {} : { y: [0, -4, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            <PeaksMark size={170} variant="solid" />
          </motion.div>
          <motion.div
            className="dll-ridge r2 parallax"
            style={{ color: "#9bb59a" }}
            animate={reduced ? {} : { y: [0, -7, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <PeaksMark size={196} variant="solid" />
          </motion.div>
          <div className="dll-ridge r1" style={{ color: "#5b7e63" }}>
            <PeaksMark size={224} variant="solid" />
          </div>
        </div>

        {/* the leaf field receives pointer math across the WHOLE section, so
            the side gutters react too, not just the band above and below copy */}
        <LeafCanvas />

        <div className="dll-living-inner">
          <FadeRise>
            <header className="dll-living-head">
              <span className="dll-eyebrow">A living place to gather</span>
              <h3 className="v2-display">
                Everything the valley taught you, kept somewhere it can grow.
              </h3>
              <p>
                Share a sighting, write a Letter, leaf through the Valley Collection. The birds keep
                you company while you read.
              </p>
            </header>
          </FadeRise>

          {/* framed product-screenshot placeholders. Birds walk the top edges
              of these frames and hop between them. */}
          <div className="dll-frames">
            {SHOTS.map((s, i) => (
              <FadeRise key={s.label} delay={i * 0.06}>
                <figure className="dll-frame">
                  <div className="dll-frame-bar">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <div className="dll-frame-body">
                    <div className="dll-frame-lines" />
                    <figcaption>
                      <strong>{s.label}</strong>
                      <span>{s.note}</span>
                    </figcaption>
                  </div>
                </figure>
              </FadeRise>
            ))}

            {/* birds overlay the frame row; they read its frames as perches */}
            <BirdField frameSelector=".dll-frame" />
          </div>

          {/* HOOPOE MASCOT SLOT. Built in a separate session. Do not build here. */}
          <div className="dll-hoopoe-slot" aria-hidden>
            <span>hoopoe mascot slot, built in a separate session</span>
          </div>

          <FadeRise>
            <p className="dll-living-foot">
              Scroll up and drag your cursor through the leaves. They part around you and settle
              again, and a quick scroll leans the whole field like a gust.
            </p>
          </FadeRise>
        </div>
      </section>
    </DelightShell>
  );
}

const SHOTS = [
  { label: "The feed", note: "Sightings and notes, on a ruled sheet" },
  { label: "Letters", note: "Long-form, from one batch to another" },
  { label: "The Valley Collection", note: "The photo archive, year by year" },
];

const CSS = `
/* ---------- 1. calm hero ---------- */
.dll-hero { position:relative; height:430px; border-radius:var(--r-card); overflow:hidden; margin-bottom:26px; }
.dll-hero-photo { position:absolute; inset:0;
  background:
    radial-gradient(120% 80% at 72% 12%, rgba(255,239,205,.55), transparent 60%),
    linear-gradient(180deg, #b9c9b0 0%, #94ad8f 42%, #6f8e72 100%); }
.delight.dark .dll-hero-photo { background:
    radial-gradient(120% 80% at 72% 12%, rgba(120,150,130,.22), transparent 60%),
    linear-gradient(180deg, #1a2a23 0%, #16241e 60%, #101a17 100%); }
.dll-hero-vignette { position:absolute; inset:0; background:linear-gradient(180deg, rgba(20,30,22,.04) 40%, rgba(20,30,22,.42)); }
.dll-photo-tag { position:absolute; top:14px; left:14px; z-index:2; display:inline-flex; align-items:center; gap:7px;
  padding:6px 11px; border-radius:999px; background:color-mix(in srgb, var(--surface) 78%, transparent);
  backdrop-filter:blur(6px); border:1px solid var(--border); color:var(--ink-soft); font-size:11.5px; font-weight:600; }
.dll-herocopy { position:absolute; z-index:3; left:0; right:0; bottom:34px; text-align:center; padding:0 24px; pointer-events:none; }
.dll-herocopy > div { pointer-events:auto; }
.dll-eyebrow { font-size:11px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--cinnamon); }
.dll-herocopy h2 { font-size:46px; margin:10px 0 10px; line-height:1.02; color:#16241b; }
.delight.dark .dll-herocopy h2 { color:#eaf2ec; }
.dll-herocopy p { max-width:42ch; margin:0 auto; font-size:15.5px; line-height:1.6; color:#22321f; }
.delight.dark .dll-herocopy p { color:#c5d2c6; }
.dll-cta { display:flex; gap:10px; justify-content:center; margin-top:18px; }
.dll-scrollcue { position:absolute; z-index:3; bottom:12px; left:50%; transform:translateX(-50%); color:#33492f; opacity:.85; }
.delight.dark .dll-scrollcue { color:#9db5a2; }

/* ---------- 2. living section ---------- */
.dll-living { position:relative; border-radius:var(--r-card); overflow:hidden;
  background:linear-gradient(180deg, #e7eedd 0%, #efe7d6 60%, var(--bg) 100%);
  border:1px solid var(--border); padding-bottom:8px; }
.delight.dark .dll-living { background:linear-gradient(180deg, #14201b 0%, #111a17 60%, var(--bg) 100%); }
.dll-sky { position:absolute; inset:0; background:radial-gradient(70% 50% at 70% 4%, rgba(255,238,205,.5), transparent 60%); }
.delight.dark .dll-sky { background:radial-gradient(70% 50% at 70% 4%, rgba(120,150,130,.16), transparent 60%); }
.dll-shafts { position:absolute; inset:0; pointer-events:none; opacity:.45;
  background:linear-gradient(108deg, transparent 38%, rgba(255,244,214,.5) 42%, transparent 46%, transparent 60%, rgba(255,244,214,.34) 64%, transparent 68%);
  animation:dllshaft 9s ease-in-out infinite; }
.dll-shafts.still { animation:none; }
@keyframes dllshaft { 0%,100%{opacity:.28} 50%{opacity:.52} }
.dll-ridges { position:absolute; left:0; right:0; bottom:0; height:250px; pointer-events:none; opacity:.85; }
.dll-ridge { position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); display:flex; justify-content:center; }
.dll-ridge.r1 { bottom:-18px; } .dll-ridge.r2 { bottom:6px; opacity:.9; } .dll-ridge.r3 { bottom:24px; opacity:.78; }
.dll-canvas { position:absolute; inset:0; z-index:2; }

.dll-living-inner { position:relative; z-index:3; padding:34px 26px 30px; }
.dll-living-head { max-width:60ch; }
.dll-living-head h3 { font-size:27px; line-height:1.14; margin:9px 0 10px; color:#1d2a20; max-width:18ch; }
.delight.dark .dll-living-head h3 { color:#eaf2ec; }
.dll-living-head p { font-size:15px; line-height:1.6; color:#33422f; max-width:46ch; }
.delight.dark .dll-living-head p { color:#c5d2c6; }

/* framed screenshot placeholders the birds walk along */
.dll-frames { position:relative; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin:42px 0 18px; }
.dll-frame { margin:0; border-radius:14px; overflow:hidden; border:1px solid var(--border);
  background:var(--surface); box-shadow:0 1px 2px rgba(0,0,0,.05), 0 26px 44px -34px rgba(20,40,24,.7); }
.dll-frame-bar { height:26px; display:flex; align-items:center; gap:5px; padding:0 11px;
  background:color-mix(in srgb, var(--sidebar) 90%, transparent); }
.dll-frame-bar .dot { width:7px; height:7px; border-radius:50%; background:color-mix(in srgb, var(--sidebar-ink) 55%, transparent); }
.dll-frame-body { position:relative; height:128px; padding:14px; background:var(--surface-2); }
.dll-frame-lines { position:absolute; inset:0; opacity:.4;
  background:repeating-linear-gradient(180deg, transparent 0 21px, var(--border) 21px 22px); }
.dll-frame-body figcaption { position:relative; display:flex; flex-direction:column; gap:3px; }
.dll-frame-body strong { font-size:13.5px; color:var(--ink); }
.dll-frame-body span { font-size:11.5px; color:var(--ink-soft); line-height:1.4; }

/* bird overlay: pure overlay, never blocks the leaves underneath */
.dlb-stage { position:absolute; inset:0; z-index:4; pointer-events:none; }
.dlb-bird { position:absolute; will-change:transform; }

/* hoopoe mascot placeholder */
.dll-hoopoe-slot { display:flex; align-items:center; justify-content:center; height:64px; margin:8px 0 4px;
  border:1px dashed color-mix(in srgb, var(--cinnamon) 50%, var(--border)); border-radius:14px;
  background:color-mix(in srgb, var(--cinnamon) 6%, transparent); }
.dll-hoopoe-slot span { font-size:11.5px; font-weight:600; letter-spacing:.04em; color:var(--cinnamon); opacity:.85; }

.dll-living-foot { margin:18px auto 0; max-width:58ch; text-align:center; color:var(--ink-soft); font-size:13px; line-height:1.6; }

@media (max-width:760px){
  .dll-hero { height:380px; }
  .dll-herocopy h2 { font-size:33px; }
  .dll-living-head h3 { font-size:22px; }
  .dll-frames { grid-template-columns:1fr; gap:30px; margin-top:30px; }
  .dll-frame-body { height:108px; }
  .dll-ridges { height:200px; }
}
`;
