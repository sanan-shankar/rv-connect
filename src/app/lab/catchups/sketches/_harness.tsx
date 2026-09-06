"use client";

/* ------------------------------------------------------------------ *
 *  The switcher: direction across the top, phone or laptop beside it.
 *
 *  Deep links, so a screenshot agent or a message to him can name one:
 *    /lab/catchups/sketches?d=<slug>&w=phone
 *    /lab/catchups/sketches?d=<slug>&w=laptop
 *    ...&full=1   the laptop drawing unscaled, for pinching into on a phone
 *  Unknown or missing keys fall back to the first direction and the phone.
 *  Picking a tab rewrites the URL so the address bar always says what is
 *  on screen (the landings and profiles rooms do the same).
 *
 *  Only the active direction renders: a tall page of the real Round is
 *  forty-odd cards with photographs, and ten of them at once would make
 *  the cull slow on exactly the device it is for.
 * ------------------------------------------------------------------ */

import { Fragment, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { ScaledFrame } from "./_frame";
import { DIRECTIONS } from "./_directions";
import { PHONE_HEIGHT, VIEWPORT_WIDTH, type SketchRound, type SketchViewport } from "./_types";

const PILL =
  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const PILL_ON = "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const PILL_OFF = "border-border bg-card text-muted-foreground hover:text-foreground";

function Harness({ round }: { round: SketchRound }) {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("d");
  const direction = DIRECTIONS.find((d) => d.slug === slug) ?? DIRECTIONS[0];
  const viewport: SketchViewport = params.get("w") === "laptop" ? "laptop" : "phone";
  const full = params.get("full") === "1";
  /* For screenshots: `frame=mid|nav|reader` draws one phone frame alone, and
     `bare=1` drops the lab chrome, so a 390x844 capture is the frame itself. */
  const frame = params.get("frame");
  const bare = params.get("bare") === "1";
  const show = (key: "mid" | "nav" | "reader") => !frame || frame === key;

  function go(next: { d?: string; w?: SketchViewport; full?: boolean }) {
    const q = new URLSearchParams(params.toString());
    q.set("d", next.d ?? direction.slug);
    q.set("w", next.w ?? viewport);
    if (next.full) q.set("full", "1");
    else q.delete("full");
    router.replace(`/lab/catchups/sketches?${q.toString()}`, { scroll: false });
  }

  const { Reader, MidScroll, NavigatorOpen } = direction;

  return (
    <div className="min-h-screen bg-background">
      {/* Two rows on a phone (the directions scroll sideways, the viewport
          toggle sits under them), one row on a laptop. Ten direction names
          wrapping into a wall of pills is what this avoids. */}
      {!bare && (
      <header className="glass sticky top-0 z-[var(--z-elevated)] border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/lab"
            className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PeaksMark size={16} />
            Lab
          </Link>
          <nav
            className="-mx-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Direction"
          >
            {DIRECTIONS.map((d, i) => (
              <Fragment key={d.slug}>
                {/* The seam between the two passes. The first pass sits to
                    the right of it, dimmed, so it is reachable without
                    reading as a live option. */}
                {d.earlier && !DIRECTIONS[i - 1]?.earlier && (
                  <span className="ml-1 mr-2 shrink-0 whitespace-nowrap border-l border-border pl-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    First pass
                  </span>
                )}
                <SpringPress
                  as="button"
                  onClick={() => go({ d: d.slug })}
                  aria-pressed={d.slug === direction.slug}
                  className={`${PILL} shrink-0 whitespace-nowrap ${
                    d.slug === direction.slug ? PILL_ON : PILL_OFF
                  } ${d.earlier && d.slug !== direction.slug ? "opacity-60" : ""}`}
                >
                  {d.name}
                </SpringPress>
              </Fragment>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex" role="group" aria-label="Viewport">
            {(["phone", "laptop"] as const).map((w) => (
              <SpringPress
                key={w}
                as="button"
                onClick={() => go({ w })}
                aria-pressed={w === viewport}
                className={`${PILL} ${w === viewport ? PILL_ON : PILL_OFF}`}
              >
                {w === "phone" ? "Phone" : "Laptop"}
              </SpringPress>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 sm:hidden" role="group" aria-label="Viewport">
          {(["phone", "laptop"] as const).map((w) => (
            <SpringPress
              key={w}
              as="button"
              onClick={() => go({ w })}
              aria-pressed={w === viewport}
              className={`${PILL} ${w === viewport ? PILL_ON : PILL_OFF}`}
            >
              {w === "phone" ? "Phone" : "Laptop"}
            </SpringPress>
          ))}
        </div>
      </header>
      )}

      <div className={bare ? "p-0" : "px-0 py-5 sm:px-6"}>
        {!bare && (
        <div className="px-4 sm:px-0">
          <h1 className="font-heading text-[1.35rem] leading-tight tracking-[-0.02em]">{direction.name}</h1>
          <p className="mt-1 max-w-[70ch] text-[14px] text-muted-foreground">{direction.thesis}</p>
          {direction.earlier && (
            <p className="mt-2 max-w-[70ch] rounded-[8px] border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
              From the first pass, kept so its ideas can be taken rather than remembered. The
              stretched background is fixed here, since the shell is shared. Everything else is as
              it was: the batch line under each name, the counts, &ldquo;2 comments&rdquo; written
              out instead of the icon.
            </p>
          )}
          <p className="mt-1 text-[12px] text-muted-foreground">
            {round.catchupName}, Round {round.number}: {round.contributors.length} wrote in, {round.questions.length} questions.
            The first three questions are drawn in full.
            {viewport === "laptop" && !full && (
              <>
                {" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => go({ full: true })}>
                  Open at full size
                </button>
              </>
            )}
            {full && (
              <>
                {" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => go({ full: false })}>
                  Fit to screen
                </button>
              </>
            )}
          </p>
        </div>
        )}

        {viewport === "phone" ? (
          <div className={bare ? "" : "mt-5 flex flex-wrap items-start justify-center gap-6 sm:justify-start"}>
            {show("mid") && (
              <figure className="w-[390px] max-w-full">
                <ScaledFrame width={VIEWPORT_WIDTH.phone} height={PHONE_HEIGHT} className={bare ? "" : "rounded-[var(--radius)] border border-border"}>
                  <MidScroll round={round} />
                </ScaledFrame>
                {!bare && <figcaption className="mt-2 px-4 text-[12px] text-muted-foreground sm:px-0">Deep in question 5. What stays on screen.</figcaption>}
              </figure>
            )}
            {show("nav") && (
              <figure className="w-[390px] max-w-full">
                <ScaledFrame width={VIEWPORT_WIDTH.phone} height={PHONE_HEIGHT} className={bare ? "" : "rounded-[var(--radius)] border border-border"}>
                  <NavigatorOpen round={round} />
                </ScaledFrame>
                {!bare && <figcaption className="mt-2 px-4 text-[12px] text-muted-foreground sm:px-0">The navigator, open.</figcaption>}
              </figure>
            )}
            {show("reader") && (
              <figure className="w-[390px] max-w-full">
                <ScaledFrame width={VIEWPORT_WIDTH.phone} className={bare ? "" : "rounded-[var(--radius)] border border-border"}>
                  <Reader round={round} viewport="phone" />
                </ScaledFrame>
                {!bare && <figcaption className="mt-2 px-4 text-[12px] text-muted-foreground sm:px-0">From the top, as a page.</figcaption>}
              </figure>
            )}
          </div>
        ) : (
          <div className={`${bare ? "" : "mt-5"} ${full ? "overflow-x-auto" : ""}`}>
            <ScaledFrame width={VIEWPORT_WIDTH.laptop} full={full} className={bare ? "" : "rounded-[var(--radius)] border border-border"}>
              <Reader round={round} viewport="laptop" />
            </ScaledFrame>
          </div>
        )}
      </div>
    </div>
  );
}

export function SketchHarness({ round }: { round: SketchRound }) {
  // useSearchParams needs a Suspense boundary in a client component.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Harness round={round} />
    </Suspense>
  );
}
