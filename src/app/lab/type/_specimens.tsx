"use client";

/* ------------------------------------------------------------------ *
 *  Specimens for the type room.
 *
 *  A note on honesty, because it is load-bearing here. next/font emits
 *  `@font-face { font-family: 'Libre Baskerville' }` using the REAL
 *  family name, not a hashed one (see the emitted CSS in
 *  next/dist/compiled/@next/font/dist/google/loader.js, which writes
 *  `font-family: '${fontFamily}'`). So the moment this page loads the
 *  variable file with italics, EVERY element on the page that asks for
 *  Libre Baskerville can reach weight 500 and a real italic, including
 *  the specimen that is supposed to be showing you what ships.
 *
 *  So the shipped side is reproduced deliberately rather than assumed:
 *    - italic  -> skewX(-11.31deg), which is the 20% shear a rasteriser
 *                 applies when no italic face exists. atan(0.2) = 11.31.
 *    - weights -> pinned to 400 or 700 and nothing else, which is
 *                 exactly what CSS font matching resolves to when only
 *                 those two files exist.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import type { Pairing } from "./_fonts";
import { cn } from "@/lib/utils";

/* ---------------- the shared body of copy ---------------- */

const EYEBROW = "The Valley Collection";
const TITLE = "The rains came early this year";
const BODY =
  "The banyan was already old when Krishnamurti walked under it. Somebody photographed it in 1974 with a borrowed camera, and the print sat in a shoebox in Bengaluru for fifty years before it found its way back to the valley, unlabelled and slightly foxed at one corner.";
const SUBHEAD = "Nine people have written in so far";
const SUBBODY = "Round 4 closes on Sunday. Neem house is still one answer short.";
const FIGURES = ["1,284 members", "Batch of '04", "18 Aug 2026", "1974 to 1981", "₹2,290"];

/** the browser's synthetic oblique: a 20% shear, atan(0.2) = 11.31 degrees */
export function Sheared({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block origin-bottom-left [transform:skewX(-11.31deg)]">{children}</span>
  );
}

/* ------------------------------------------------------------------ *
 *  One full type ladder. Every size below is a size the product sets:
 *  30px page title (page-header.tsx:37), 20px section title (text-xl, the
 *  most common heading size at 27 usages), 15px/1.7 body (post-card.tsx:266),
 *  11px uppercase eyebrow (text-[11px], 46 usages, the most common label size).
 * ------------------------------------------------------------------ */

export function Specimen({ p, shipped = false }: { p: Pairing; shipped?: boolean }) {
  const headFamily = shipped ? "var(--f-libre)" : p.headVar;
  const bodyFamily = shipped ? "var(--f-source)" : p.bodyVar;
  // Only 400 and 700 exist when the family is loaded as two statics, so a
  // request for 600 resolves upward to 700 and a request for 500 resolves
  // down to 400. Pinning it here reproduces that, on a page where the
  // variable file is loaded and would otherwise quietly interpolate.
  const headWeight = shipped ? 700 : p.headWeight;

  const head: React.CSSProperties = {
    fontFamily: headFamily,
    fontWeight: headWeight,
    fontVariationSettings: !shipped && p.headVar2 ? p.headVar2 : undefined,
  };
  const body: React.CSSProperties = { fontFamily: bodyFamily };

  return (
    <div className="rounded-[16px] bg-card p-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-cinnamon" style={body}>
        {EYEBROW}
      </div>

      <h3 className="mt-2.5 text-[30px] leading-[1.06] tracking-[-0.02em] text-foreground" style={head}>
        {TITLE}
      </h3>

      <p className="mt-4 text-[15px] leading-[1.7] text-foreground" style={body}>
        {BODY}
      </p>

      <h4 className="mt-6 text-[20px] leading-[1.25] tracking-[-0.015em] text-foreground" style={head}>
        {SUBHEAD}
      </h4>
      <p className="mt-1.5 text-[15px] leading-[1.7] text-muted-foreground" style={body}>
        {SUBBODY}
      </p>

      <div
        className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-[13px] tabular-nums text-muted-foreground"
        style={body}
      >
        {FIGURES.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>

      <p className="mt-4 text-[15px] leading-[1.7] text-foreground" style={body}>
        {shipped ? (
          <>
            An italic in a post:{" "}
            <Sheared>
              <span style={body}>the light on the hill at four o&apos;clock</span>
            </Sheared>
            .
          </>
        ) : (
          <>
            An italic in a post:{" "}
            <em style={{ ...body, fontStyle: "italic" }}>
              the light on the hill at four o&apos;clock
            </em>
            .
          </>
        )}
      </p>
      <p className="mt-1.5 text-[20px] leading-[1.35] text-foreground" style={head}>
        {shipped ? (
          <Sheared>
            <span style={{ ...head, fontWeight: 700 }}>A Walk Before Breakfast</span>
          </Sheared>
        ) : (
          <span style={{ ...head, fontStyle: "italic" }}>A Walk Before Breakfast</span>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Defect 1: the shear, at a size where you can see the letterforms.
 * ------------------------------------------------------------------ */

export function ItalicBench({ real }: { real: boolean }) {
  const libreStyle: React.CSSProperties = {
    fontFamily: "var(--f-libre)",
    fontWeight: 400,
    fontStyle: real ? "italic" : "normal",
  };
  const sansStyle: React.CSSProperties = {
    fontFamily: "var(--f-source)",
    fontWeight: 400,
    fontStyle: real ? "italic" : "normal",
  };
  const wrap = (node: React.ReactNode) => (real ? node : <Sheared>{node}</Sheared>);

  return (
    <div className="space-y-5 rounded-[16px] bg-card p-6">
      <div>
        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          Source Sans 3, 30px
        </div>
        <p className="text-[30px] leading-[1.3] text-foreground">
          {wrap(<span style={sansStyle}>a fig, a gate</span>)}
        </p>
      </div>
      <div>
        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          Libre Baskerville, 30px
        </div>
        <p className="text-[30px] leading-[1.3] text-foreground">
          {wrap(<span style={libreStyle}>a fig, a gate</span>)}
        </p>
      </div>
      <p className="border-t border-border pt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
        {real
          ? "Drawn letterforms. Single-storey a in both, a g that loses its lower bowl, and in Libre Baskerville an f that descends 260 units below the baseline. Drawn at 15 degrees in Libre Baskerville and 11 in Source Sans 3, read off post.italicAngle."
          : "The upright letters, sheared 11.31 degrees. Two-storey a, a g that keeps both bowls, an f that stops dead at the baseline, and every advance width identical to the roman. This is what every italic in the product is today."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Defect 2: what the weight classes actually resolve to.
 * ------------------------------------------------------------------ */

const WEIGHT_ROWS = [
  { cls: "font-normal", w: 400, resolves: 400, uses: 3 },
  { cls: "font-medium", w: 500, resolves: 400, uses: 6 },
  { cls: "font-semibold", w: 600, resolves: 700, uses: 12 },
  { cls: "font-bold", w: 700, resolves: 700, uses: 57 },
];

export function WeightLadder({ variable }: { variable: boolean }) {
  return (
    <div className="rounded-[16px] bg-card p-5">
      <div className="mb-2 flex items-baseline gap-3 px-3 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        <span className="min-w-0 flex-1">Rendered</span>
        <span className="shrink-0">Class and uses</span>
        <span className="w-[112px] shrink-0 text-right">{variable ? "Weight" : "Asks, gets"}</span>
      </div>
      <div className="space-y-1">
        {WEIGHT_ROWS.map((r) => {
          const shown = variable ? r.w : r.resolves;
          const wrong = !variable && r.w !== r.resolves;
          return (
            <div
              key={r.cls}
              className="flex items-baseline gap-3 rounded-[10px] px-3 py-2 odd:bg-mist/70"
            >
              <span
                className="min-w-0 flex-1 truncate text-[22px] leading-[1.3] text-foreground"
                style={{
                  fontFamily: "var(--f-libre)",
                  fontWeight: shown,
                }}
              >
                Signs of life
              </span>
              <span className="shrink-0 text-[11.5px] text-muted-foreground">
                <code>{r.cls}</code>
                <span className="ml-1.5 tabular-nums opacity-70">{r.uses}x</span>
              </span>
              <span
                className={cn(
                  "w-[112px] shrink-0 text-right text-[12px] font-semibold tabular-nums",
                  wrong ? "text-heart" : "text-leaf",
                )}
              >
                {wrong ? `${r.w} to ${r.resolves}` : `${shown}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Defect 3: proportional figures in the heading face.
 *  These are five real admission numbers, all five characters long.
 * ------------------------------------------------------------------ */

const STAMPS: { n: string; libre: number; sans: number }[] = [
  { n: "1,284", libre: 52.96, sans: 46.54 },
  { n: "7,061", libre: 52.86, sans: 46.54 },
  { n: "9,900", libre: 62.4, sans: 46.54 },
  { n: "1,117", libre: 41.72, sans: 46.54 },
  { n: "4,448", libre: 57.78, sans: 46.54 },
];

export function DigitJitter({ face }: { face: "libre" | "source" }) {
  const isLibre = face === "libre";
  const family = isLibre ? "var(--f-libre)" : "var(--f-source)";
  return (
    <div className="rounded-[16px] bg-card p-6">
      <div className="space-y-2">
        {STAMPS.map((s) => (
          <div key={s.n} className="flex items-center gap-4">
            <span
              className="text-[20px] leading-none tabular-nums text-cinnamon"
              style={{ fontFamily: family, fontWeight: isLibre ? 700 : 600 }}
            >
              {s.n}
            </span>
            <span className="h-3 w-px shrink-0 bg-heart/70" />
            <span className="text-[11.5px] tabular-nums text-muted-foreground">
              {(isLibre ? s.libre : s.sans).toFixed(2)}px
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
        {isLibre
          ? "Five 5-character numbers at 20px, all left aligned. The red ticks are the right edge. Spread: 41.72px to 62.40px, a 20.68px swing. tabular-nums is already on these and does nothing, because Libre Baskerville has no tnum feature to switch on."
          : "The same five numbers at 20px in Source Sans 3. All exactly 46.54px, with no CSS at all: its ten digits are one width at every weight, 497 units at 400 and 513 at 600."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The optical size axis, doing its job. Same face, same 30px, same
 *  weight, four points on the axis.
 * ------------------------------------------------------------------ */

export const OPSZ_STEPS = [
  { k: "6" as const, label: "opsz 6", note: "the caption drawing", width: 498.3, contrast: 1.57 },
  {
    k: "16" as const,
    label: "opsz 16",
    note: "the file default, and what you get if you forget the axes option",
    width: 398.5,
    contrast: 2.36,
  },
  {
    k: "30" as const,
    label: "opsz 30",
    note: "what the browser picks on its own at 30px",
    width: 388.9,
    contrast: 3.12,
  },
  { k: "72" as const, label: "opsz 72", note: "the poster drawing", width: 424.7, contrast: 5.11 },
];

export function OpticalDemo() {
  const [k, setK] = useState<(typeof OPSZ_STEPS)[number]["k"]>("30");
  const step = OPSZ_STEPS.find((s) => s.k === k)!;

  return (
    <div className="rounded-[16px] bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {OPSZ_STEPS.map((s) => (
          <button
            key={s.k}
            type="button"
            onClick={() => setK(s.k)}
            aria-pressed={k === s.k}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
              k === s.k
                ? "border-transparent bg-[#235C49] text-white hover:bg-[#1E5040]"
                : "state-layer border-border bg-mist text-muted-foreground hover:border-leaf/30 hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p
        className="text-[30px] leading-[1.12] tracking-[-0.02em] text-foreground"
        style={{
          fontFamily: "var(--f-newsreader)",
          fontWeight: 600,
          fontVariationSettings: `"opsz" ${k}`,
        }}
      >
        The rains came early this year
      </p>

      <p
        className="mt-3 text-[30px] leading-[1.12] tracking-[-0.02em] text-muted-foreground/60"
        style={{ fontFamily: "var(--f-libre)", fontWeight: 700 }}
      >
        The rains came early this year
      </p>

      <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[12.5px] leading-[1.55] text-muted-foreground">
        <p>
          <b className="font-semibold text-foreground">Newsreader 600 at {step.label}</b>,{" "}
          {step.note}: <b className="font-semibold tabular-nums text-foreground">{step.width}px</b>{" "}
          wide, contrast{" "}
          <b className="font-semibold tabular-nums text-foreground">{step.contrast}</b>.
        </p>
        <p>
          <b className="font-semibold text-foreground">Libre Baskerville 700</b>, greyed:{" "}
          <b className="font-semibold tabular-nums text-foreground">473.9px</b> wide, contrast{" "}
          <b className="font-semibold tabular-nums text-foreground">2.69</b>, at every size forever.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  A two-column fact list for narrow columns. Same visual language as
 *  the kit's Tell stats (hairline rules, no box), because a 560px-wide
 *  Ledger does not fit a 340px rail.
 * ------------------------------------------------------------------ */

export function FactList({
  rows,
}: {
  rows: { k: string; v: string; tone?: "good" | "bad" }[];
}) {
  return (
    <dl className="divide-y divide-border border-y border-border">
      {rows.map((r) => (
        <div key={r.k} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-[13.5px] leading-[1.4] text-foreground">{r.k}</dt>
          <dd
            className={cn(
              "shrink-0 text-right text-[13px] font-semibold",
              r.tone === "bad" ? "text-heart" : r.tone === "good" ? "text-leaf" : "text-muted-foreground",
            )}
          >
            {r.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 *  The optical size axis, proved rather than asserted.
 *
 *  Set the same line at 12px and again at 60px and divide the rendered
 *  widths. A face with one drawing scales linearly and returns exactly
 *  5.000. A face with a working opsz axis returns less, because the
 *  browser hands the 60px request a tighter drawing than five of the
 *  12px one. Nothing here is hard-coded: it measures in your browser,
 *  after document.fonts.load has resolved for each family.
 * ------------------------------------------------------------------ */

/* The real family name, not the CSS variable: next/font emits
   `@font-face { font-family: 'Fraunces' }` under the true name (confirmed in
   the emitted stylesheet), and the offscreen measuring node lives on
   document.body, outside the element that carries the --f-* variables. */
const RATIO_FACES = [
  { family: "Fraunces", axis: "opsz 9 to 144" },
  { family: "Newsreader", axis: "opsz 6 to 72" },
  { family: "Literata", axis: "opsz 7 to 72" },
  { family: "Libre Baskerville", axis: "no axis" },
  { family: "Instrument Serif", axis: "no axis" },
];

const RATIO_LINE = "The rains came early this year";

export function OpticalRatio() {
  const [rows, setRows] = useState<{ k: string; v: string; tone?: "good" | "bad" }[] | null>(null);

  useEffect(() => {
    let live = true;
    const host = document.createElement("div");
    host.style.cssText =
      "position:absolute;left:-99999px;top:0;white-space:nowrap;visibility:hidden;pointer-events:none";
    document.body.appendChild(host);

    const width = (family: string, size: number) => {
      const s = document.createElement("span");
      s.style.fontFamily = `"${family}"`;
      s.style.fontWeight = "600";
      s.style.fontSize = `${size}px`;
      s.textContent = RATIO_LINE;
      host.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };

    (async () => {
      const out: { k: string; v: string; tone?: "good" | "bad" }[] = [];
      for (const f of RATIO_FACES) {
        await Promise.all([
          document.fonts.load(`600 12px "${f.family}"`),
          document.fonts.load(`600 60px "${f.family}"`),
        ]).catch(() => undefined);
        const loaded = document.fonts.check(`600 12px "${f.family}"`);
        const ratio = width(f.family, 60) / width(f.family, 12);
        out.push({
          k: `${f.family}, ${f.axis}`,
          v: loaded ? ratio.toFixed(3) : "not loaded",
          tone: loaded && ratio < 4.99 ? "good" : "bad",
        });
      }
      host.remove();
      if (live) setRows(out);
    })();

    return () => {
      live = false;
      host.remove();
    };
  }, []);

  if (!rows) {
    return (
      <div className="space-y-2 border-y border-border py-2.5" aria-live="polite">
        {RATIO_FACES.map((f) => (
          <div key={f.family} className="flex items-baseline justify-between gap-4">
            <span className="text-[13.5px] text-muted-foreground">{f.family}</span>
            <span className="h-3 w-14 animate-pulse rounded-full bg-mist" />
          </div>
        ))}
      </div>
    );
  }

  return <FactList rows={rows} />;
}

/* ------------------------------------------------------------------ *
 *  The system stack, rendered live. On your machine this is SF.
 * ------------------------------------------------------------------ */

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", sans-serif';

export function SystemStackDemo() {
  return (
    <div className="space-y-4 rounded-[16px] bg-card p-6">
      <div>
        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          The system stack, live in your browser
        </div>
        <p className="text-[24px] leading-[1.3] text-foreground" style={{ fontFamily: SYSTEM_STACK }}>
          The rains came early this year
        </p>
        <p
          className="mt-2 text-[15px] leading-[1.65] text-muted-foreground"
          style={{ fontFamily: SYSTEM_STACK }}
        >
          On a Mac this is SF. On Windows it is Segoe UI. On Android it is Roboto. On a Linux
          desktop it is whatever that distribution installed. Four brands, one CSS rule.
        </p>
      </div>
      <div className="rounded-[10px] bg-mist p-4">
        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          The same line in Source Sans 3
        </div>
        <p
          className="text-[24px] leading-[1.3] text-foreground"
          style={{ fontFamily: "var(--f-source)" }}
        >
          The rains came early this year
        </p>
      </div>
    </div>
  );
}
