"use client";

/* ------------------------------------------------------------------ *
 *  The instrument. Two recorders, both passive, neither of which the
 *  viewer knows about.
 *
 *  1. THE FINGER. A capture-phase listener on `window` for pointerdown
 *     and pointerup. Capture phase, so it sees the event before the
 *     viewer's own handler does and cannot be stopped by it; passive, so
 *     it cannot change what the gesture does. It records where the
 *     finger landed, where it left, how far it travelled and how long it
 *     was down.
 *
 *  2. THE PHOTOGRAPH. A rAF loop reading the `currentSrc` of whichever
 *     image the viewer currently has on screen, and writing a line every
 *     time it changes. This is deliberately NOT a hook into the viewer's
 *     `step`: a hook would need the shipped component changed, and the
 *     thing being measured is what actually reached the glass.
 *
 *  Both stop when the viewer closes. The log stays on the page, so the
 *  way to read it is: open, swipe back once from the last photograph,
 *  close, read.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { LazyImageViewer, preloadImageViewer, useImageViewer } from "@/components/common/lazy-image-viewer";
import { Button } from "@/components/ui/button";

type Line = { t: number; kind: "finger" | "photo"; text: string };

/** The file name, which is all that distinguishes one photograph from another here. */
const nameOf = (src: string) => src.match(/\/([^/]+)\.webp/)?.[1]?.slice(0, 8) ?? "?";

export function SwipeTrace({ photos }: { photos: string[] }) {
  const viewer = useImageViewer();
  const [lines, setLines] = useState<Line[]>([]);
  const started = useRef(0);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  const write = useCallback((kind: Line["kind"], text: string) => {
    setLines((was) => [...was, { t: Math.round(performance.now() - started.current), kind, text }]);
  }, []);

  /* The finger. */
  useEffect(() => {
    if (viewer.at === null) return;
    const onDown = (e: PointerEvent) => {
      down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      write("finger", `down at ${Math.round(e.clientX)}, ${Math.round(e.clientY)}`);
    };
    const onUp = (e: PointerEvent) => {
      const from = down.current;
      down.current = null;
      if (!from) {
        write("finger", "up with no down before it");
        return;
      }
      const dx = Math.round(e.clientX - from.x);
      const dy = Math.round(e.clientY - from.y);
      const ms = Math.round(performance.now() - from.t);
      const way = dx > 0 ? "back" : dx < 0 ? "forward" : "nowhere";
      write("finger", `up after ${ms}ms, ${dx > 0 ? "+" : ""}${dx}px across and ${dy}px down, so ${way}`);
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onUp, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
    };
  }, [viewer.at, write]);

  /* The photograph. */
  useEffect(() => {
    if (viewer.at === null) return;
    let frame = 0;
    let last = "";
    const tick = () => {
      const dialog = document.querySelector('[role="dialog"]');
      const shown = dialog
        ? [...dialog.querySelectorAll("img")]
            .filter((i) => i.getBoundingClientRect().width > 50)
            .map((i) => nameOf(i.currentSrc || i.src))
        : [];
      /* The last one in the DOM is the incoming frame: AnimatePresence keeps
         both mounted through the 220ms cross, so during a step this reads two
         and the one that stays is the one at the end of the list. */
      const now = shown[shown.length - 1] ?? "";
      if (now && now !== last) {
        write("photo", last ? `${last} became ${now}` : `showing ${now}`);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [viewer.at, write]);

  const fingers = lines.filter((l) => l.kind === "finger" && l.text.startsWith("up")).length;
  const changes = lines.filter((l) => l.kind === "photo" && l.text.includes("became")).length;

  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-8">
      <h1 className="font-heading text-[30px] leading-[1.15] tracking-[-0.02em] text-foreground">
        The swipe that goes back two
      </h1>

      <p className="mt-4 text-[15px] leading-[1.7] text-foreground">
        Six attempts on a development machine could not make this happen. A finger can. Open the
        photographs, go to the last one, then swipe back once, the way you did when you found it.
        Close the viewer and the trace is here.
      </p>

      <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
        One swipe should be one line saying <em>up</em> and one line saying <em>became</em>. Two{" "}
        <em>became</em> lines from one <em>up</em> is the bug, caught.
      </p>

      {photos.length < 3 ? (
        <p className="mt-6 text-[15px] leading-[1.7] text-cinnamon">
          No published answer on this database carries three photographs, so there is nothing to
          swipe. That is a data problem, not a bug.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onPointerEnter={preloadImageViewer}
              onFocus={preloadImageViewer}
              onClick={() => {
                started.current = performance.now();
                setLines([]);
                viewer.open(photos.length - 1);
              }}
            >
              Open at the last photograph
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLines([])}
              disabled={lines.length === 0}
            >
              Clear the trace
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                onPointerEnter={preloadImageViewer}
                onClick={() => {
                  started.current = performance.now();
                  setLines([]);
                  viewer.open(i);
                }}
                className="h-24 w-auto cursor-pointer rounded-[var(--radius-sm)] border border-border object-cover"
              />
            ))}
          </div>

          <div className="mt-8 rounded-[var(--radius-md)] border border-border bg-card p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              The trace
            </p>
            {lines.length === 0 ? (
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
                Nothing yet.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[15px] leading-[1.7] text-foreground">
                  {fingers} swipe{fingers === 1 ? "" : "s"}, {changes} change
                  {changes === 1 ? "" : "s"} of photograph.
                  {fingers > 0 && changes > fingers ? " That is the bug." : ""}
                </p>
                <ol className="mt-3 space-y-1">
                  {lines.map((l, i) => (
                    <li
                      key={i}
                      className="font-mono text-[12.5px] leading-[1.6] text-foreground"
                    >
                      <span className="text-muted-foreground">
                        {String(l.t).padStart(5)}ms{" "}
                      </span>
                      <span className={l.kind === "photo" ? "text-canopy" : ""}>{l.text}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </>
      )}

      {viewer.mounted && (
        <LazyImageViewer
          open={viewer.at !== null}
          images={photos.map((src) => ({ src }))}
          initialIndex={viewer.at ?? 0}
          onClose={viewer.close}
        />
      )}
    </div>
  );
}
