"use client";

import { FadeRise } from "@/components/common/motion";
import { ValleyLeaves } from "./valley-leaves";
import { ValleyBirds } from "./valley-birds";

/* ------------------------------------------------------------------ *
 *  The living valley section. Sits BELOW the calm hero on the landing.
 *
 *  It carries the page's most-seen delight: full-bodied leaves drift
 *  and part around the cursor (and the side gutters react too), a quick
 *  scroll leans the field like a gust, clicking flicks a leaf, and cute
 *  warm-palette birds walk, peck, preen, and hop ONLY along the TOP
 *  edges of the product frames. A clearly-labelled slot is reserved for
 *  the hoopoe mascot, which a separate session owns.
 *
 *  Real app tokens only (leaf #1F8A4C, cinnamon #C2622F, sky #3F7CA6,
 *  --muted/--border/--card). All ambient layout lives in a scoped
 *  <style> so globals.css is untouched.
 *
 *  Pointer-events: the leaf canvas is the lowest layer and is the only
 *  pointer surface, so the cursor parts leaves anywhere the content does
 *  not cover (the gutters included). Content sits above it and re-enables
 *  pointer events on its own interactive bits, so links stay clickable.
 *  The bird overlay is pointer-events:none and never blocks a click.
 * ------------------------------------------------------------------ */

const FRAMES = [
  { label: "The Feed", note: "Sightings and notes, on one ruled sheet" },
  { label: "Letters", note: "Long-form, from one batch to another" },
  { label: "The Valley Collection", note: "The photo archive, year by year" },
];

export function ValleySection() {
  return (
    <section className="vl-living" aria-label="A living place to gather">
      <style>{CSS}</style>

      {/* soft warm sky wash + sun shafts behind everything */}
      <div className="vl-sky" aria-hidden />
      <div className="vl-shafts" aria-hidden />

      {/* the leaf field: lowest layer, the pointer surface for the gutters */}
      <ValleyLeaves />

      <div className="vl-inner">
        <FadeRise>
          <header className="vl-head">
            <span className="vl-eyebrow">A living place to gather</span>
            <h2 className="vl-title">
              Everything the valley taught you, kept somewhere it can grow.
            </h2>
            <p className="vl-lede">
              Share a sighting, write a Letter, leaf through the Valley
              Collection. The birds keep you company while you read, and the
              leaves part as you move through them.
            </p>
          </header>
        </FadeRise>

        {/* framed product placeholders. Birds walk the TOP edges and hop
            between them. Replace the placeholder bodies with real shots later. */}
        <div className="vl-frames">
          {FRAMES.map((f, i) => (
            <FadeRise key={f.label} delay={i * 0.06}>
              <figure className="vl-frame">
                <div className="vl-frame-bar">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <div className="vl-frame-body">
                  <div className="vl-frame-lines" />
                  <figcaption>
                    <strong>{f.label}</strong>
                    <span>{f.note}</span>
                  </figcaption>
                </div>
              </figure>
            </FadeRise>
          ))}

          {/* bird overlay reads the frames as perches; pointer-events:none */}
          <ValleyBirds frameSelector=".vl-frame" />
        </div>

        {/* HOOPOE MASCOT SLOT. Built in a separate session. Do not build here. */}
        <div className="vl-hoopoe-slot" data-hoopoe-slot aria-hidden>
          <span>hoopoe mascot slot, built in a separate session</span>
        </div>

        <FadeRise>
          <p className="vl-foot">
            Drag your cursor through the leaves. They part around you and settle
            again, and a quick scroll leans the whole field like a gust. Click a
            leaf to flick it loose.
          </p>
        </FadeRise>
      </div>
    </section>
  );
}

const CSS = `
.vl-living {
  position: relative;
  margin: 28px auto 0;
  max-width: 72rem;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  border: 1px solid var(--border);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--color-leaf) 8%, var(--card)) 0%,
    color-mix(in srgb, var(--color-cinnamon) 6%, var(--card)) 60%,
    var(--background) 100%);
  box-shadow: 0 1px 2px rgba(20, 40, 24, 0.05), 0 32px 60px -44px rgba(20, 40, 24, 0.55);
}
.vl-sky {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(70% 50% at 70% 4%,
    color-mix(in srgb, var(--color-cinnamon) 20%, transparent), transparent 60%);
}
.vl-shafts {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background: linear-gradient(108deg, transparent 38%,
    color-mix(in srgb, var(--color-cinnamon) 26%, transparent) 42%, transparent 46%,
    transparent 60%, color-mix(in srgb, var(--color-leaf) 18%, transparent) 64%, transparent 68%);
  animation: vlshaft 9s ease-in-out infinite;
}
@keyframes vlshaft { 0%, 100% { opacity: 0.26; } 50% { opacity: 0.46; } }

/* leaf canvas: lowest interactive layer; it is the only pointer surface, so the
   cursor parts leaves anywhere content does not cover (gutters included). */
.vl-canvas { position: absolute; inset: 0; z-index: 1; pointer-events: auto; }

/* content sits above the canvas. The wrapper passes pointer events through to
   the canvas, then interactive children re-enable them so links still work. */
.vl-inner { position: relative; z-index: 2; padding: 36px 28px 30px; pointer-events: none; }
.vl-inner a, .vl-inner button { pointer-events: auto; }

.vl-head { max-width: 60ch; }
.vl-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--color-cinnamon);
}
.vl-title {
  font-family: var(--font-display), Georgia, serif;
  font-size: 27px; line-height: 1.14; letter-spacing: -0.02em;
  margin: 9px 0 10px; max-width: 18ch; color: var(--foreground);
}
.vl-lede {
  font-size: 15px; line-height: 1.65; color: var(--muted-foreground); max-width: 48ch;
}

/* framed placeholders the birds walk along (top edges are the perches) */
.vl-frames {
  position: relative; display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 18px; margin: 44px 0 18px;
}
.vl-frame {
  margin: 0; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border);
  background: var(--card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 26px 44px -34px rgba(20, 40, 24, 0.7);
}
.vl-frame-bar {
  height: 26px; display: flex; align-items: center; gap: 5px; padding: 0 11px;
  background: color-mix(in srgb, var(--sidebar) 90%, transparent);
}
.vl-frame-bar .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: color-mix(in srgb, var(--sidebar-foreground) 55%, transparent);
}
.vl-frame-body { position: relative; height: 128px; padding: 14px; background: var(--muted); }
.vl-frame-lines {
  position: absolute; inset: 0; opacity: 0.4;
  background: repeating-linear-gradient(180deg, transparent 0 21px, var(--border) 21px 22px);
}
.vl-frame-body figcaption { position: relative; display: flex; flex-direction: column; gap: 3px; }
.vl-frame-body strong { font-size: 13.5px; color: var(--foreground); }
.vl-frame-body span { font-size: 11.5px; color: var(--muted-foreground); line-height: 1.4; }

/* bird overlay: pure overlay, never blocks the leaves or clicks underneath */
.vlb-stage { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.vlb-bird { position: absolute; will-change: transform; }

/* hoopoe mascot placeholder slot (a separate session fills this) */
.vl-hoopoe-slot {
  display: flex; align-items: center; justify-content: center; height: 64px; margin: 8px 0 4px;
  border: 1px dashed color-mix(in srgb, var(--color-cinnamon) 50%, var(--border));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-cinnamon) 6%, transparent);
}
.vl-hoopoe-slot span {
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em;
  color: var(--color-cinnamon); opacity: 0.85;
}

.vl-foot {
  margin: 18px auto 0; max-width: 58ch; text-align: center;
  color: var(--muted-foreground); font-size: 13px; line-height: 1.6;
}

@media (max-width: 760px) {
  .vl-living { margin-left: 16px; margin-right: 16px; }
  .vl-inner { padding: 28px 18px 26px; }
  .vl-title { font-size: 22px; }
  .vl-frames { grid-template-columns: 1fr; gap: 30px; margin-top: 32px; }
  .vl-frame-body { height: 108px; }
}
`;
