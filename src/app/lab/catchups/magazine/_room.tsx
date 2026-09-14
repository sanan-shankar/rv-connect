"use client";

/* ------------------------------------------------------------------ *
 *  The room: the pages at true size, and how they were decided.
 *
 *  Two passes. The server (and the first client render) lays the pages
 *  out with the engine's estimate, so the page arrives whole. Once the
 *  fonts have loaded the engine runs again with a canvas measurer, so
 *  every block's rows are the rows Chrome will give it; then every
 *  photograph is waited for, and the root says `data-magazine-ready`,
 *  which is what scripts/dev/print-magazine.mjs prints on.
 *
 *  Nothing is scaled (campaign finding F34): an A4 page is 210mm wide
 *  here, on a phone as on a laptop. A page's score sits under it, a
 *  photograph's dpi on it, and a block that overflowed its rows gets a
 *  red edge -- the estimate's error is the finding, not something to
 *  hide.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from "react";
import { DelightShell } from "../../_kit";
import { layoutMagazine } from "@/lib/magazine";
import type { Magazine, MagazineSource } from "@/lib/magazine/types";
import { canvasMeasurer, pageFamilies } from "./_measure";
import { Sheet } from "./_pages";

export function MagazineRoom({ source, title, dataKey, keys, print }: { source: MagazineSource; title: string; dataKey: string; keys: string[]; print: boolean }) {
  const estimated = useMemo(() => layoutMagazine(source), [source]);
  const [measured, setMeasured] = useState<Magazine | null>(null);
  const [ready, setReady] = useState(false);
  const [overflows, setOverflows] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Pass two: the real fonts. */
  useEffect(() => {
    let alive = true;
    (async () => {
      await document.fonts.ready;
      const families = pageFamilies();
      /* Force both faces to load at the sizes the page uses, so the
         measurer never shapes with a fallback (D30). */
      await Promise.all([document.fonts.load(`10.5pt ${families.body}`), document.fonts.load(`600 10.5pt ${families.body}`), document.fonts.load(`24pt ${families.heading}`), document.fonts.load(`italic 16pt ${families.heading}`)]);
      const measure = canvasMeasurer(families);
      if (!alive || !measure) return;
      setMeasured(layoutMagazine(source, { measure }));
    })();
    return () => {
      alive = false;
    };
  }, [source]);

  const magazine = measured ?? estimated;

  /* Overflow, measured off the drawn blocks, and the images waited for. */
  useEffect(() => {
    if (!measured) return;
    let alive = true;
    (async () => {
      const root = rootRef.current;
      if (!root) return;
      const imgs = [...root.querySelectorAll("img")];
      await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); }))));
      if (!alive) return;
      let n = 0;
      for (const el of root.querySelectorAll<HTMLElement>(".mz-block")) {
        /* Half a row: a millimetre of caption margin is not an overflow. */
        const over = el.scrollHeight - el.clientHeight > 10;
        el.dataset.overflow = over ? "1" : "0";
        if (over) n += 1;
      }
      setOverflows(n);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [measured]);

  const scores = magazine.pages.map((p) => p.score);
  const mean = scores.reduce((n, s) => n + s.total, 0) / Math.max(1, scores.length);
  const photos = magazine.pages.flatMap((p) => p.blocks).reduce((n, b) => n + (b.kind === "photo-band" ? b.photos.length : b.kind === "photo-text" ? 1 : b.kind === "gallery" ? b.items.length : b.kind === "wall" ? b.rowsOfPhotos.reduce((m, r) => m + r.shots.length, 0) : b.kind === "opener" && b.lead ? 1 : 0), 0);

  const rootProps = { ref: rootRef, "data-magazine-ready": ready ? "true" : "false", "data-pages": magazine.pages.length, "data-overflows": overflows };

  if (print) {
    return (
      <div {...rootProps}>
        <Sheet m={magazine} print />
      </div>
    );
  }

  return (
    <DelightShell title="Laid out by rules, not by hand" lede="A published Edition as A4 pages, decided by the grammar in src/lib/magazine. Pick an Edition; read the score under each page.">
      <div ref={rootRef} data-magazine-ready={ready ? "true" : "false"} data-pages={magazine.pages.length} data-overflows={overflows}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {keys.map((k) => (
            <a
              key={k}
              href={`?data=${k}`}
              style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, border: "1px solid var(--border, #DFD8CB)", background: k === dataKey ? "#235C49" : "#F5F2EA", color: k === dataKey ? "#fff" : "#5F6359", textDecoration: "none" }}
            >
              {k}
            </a>
          ))}
          <a href={`?print=1&data=${dataKey}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, border: "1px solid #C2622F", color: "#C2622F", textDecoration: "none", marginLeft: "auto" }}>
            Print view
          </a>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.5 }}>
          <b>{title}.</b> {magazine.pages.length} pages, {photos} photographs, mean page score {mean.toFixed(2)}.{" "}
          {measured ? "Measured with the real fonts." : "Estimated; measuring…"}{" "}
          {ready ? (overflows ? `${overflows} block(s) overflowed their rows and are edged red.` : "No block overflowed its rows.") : ""}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#5F6359" }}>
          Templates: {Object.entries(magazine.choices).map(([, t]) => t).join(", ") || "none"}.
          {magazine.notes.length > 0 && <> Notes: {magazine.notes.join(" ")}</>}
        </p>
        <Sheet m={magazine} print={false}>
          {(p) => (
            <div style={{ width: "210mm", fontSize: 11.5, lineHeight: 1.4, color: "#5F6359", fontVariantNumeric: "tabular-nums" }}>
              p{p.number} · {p.used}/{Math.floor((297 - 34) / 5.3)} rows · fill {p.score.fill.toFixed(2)} · image {p.score.image.toFixed(2)} · variety {p.score.variety.toFixed(2)} · coherence {p.score.coherence.toFixed(2)} · <code>{p.signature}</code>
            </div>
          )}
        </Sheet>
      </div>
    </DelightShell>
  );
}
