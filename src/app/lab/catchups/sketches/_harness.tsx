"use client";

/* ------------------------------------------------------------------ *
 *  The room: three views of one reader.
 *
 *    Reader    the phone page, live. Scroll it, tap the strip.
 *    Screens   five 390x844 stills of moments deep in the page.
 *    Laptop    the same page at the window's own width.
 *
 *  NOTHING IS SCALED HERE ANY MORE. The room used to draw at a fixed
 *  width and shrink the result to fit, which silently broke every sticky
 *  element inside it: a sticky box in a `transform: scale(s)` drifts at
 *  (1 - s) of the scroll, so the navigator crawled off the top of the
 *  screen instead of staying put (owner, 2026-09-07: "the in the loop and
 *  the question are supposed to be fixed, but they actually move very
 *  slowly"). Both live views are fluid now, so a phone shows the phone
 *  page at 1:1 and a laptop shows the laptop page at its own size.
 *
 *  Deep links, so a screenshot or a message can name one:
 *    /lab/catchups/sketches?w=reader|screens|laptop
 *    ...&frame=mid|long|a|b|c   one still alone (screens)
 *    ...&bare=1                 no lab chrome, so a capture is the frame
 * ------------------------------------------------------------------ */

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { Reader } from "./_reader";
import { LongQuestionFrame, MidScrollFrame, NavigatorA, NavigatorB, NavigatorC } from "./_frames";
import { PHONE_HEIGHT, VIEWPORT_WIDTH, type SketchRound } from "./_types";

type View = "reader" | "screens" | "laptop";

const VIEWS: Array<{ key: View; label: string }> = [
  { key: "reader", label: "Reader" },
  { key: "screens", label: "Screens" },
  { key: "laptop", label: "Laptop" },
];

const STILLS: Array<{ key: string; caption: string; Draw: (p: { round: SketchRound }) => ReactNode }> =
  [
    {
      key: "mid",
      caption:
        "Deep in the songs question. The strip holds it. The line along its top is how far through the Round you are.",
      Draw: MidScrollFrame,
    },
    {
      key: "long",
      caption: "The longest question the app allows, 300 characters. Three lines, then it stops.",
      Draw: LongQuestionFrame,
    },
    {
      key: "a",
      caption:
        "Navigator, first way: the strip unfolds. The line turns the corner and stops at the question you are in.",
      Draw: NavigatorA,
    },
    {
      key: "b",
      caption:
        "Second way: a sheet from the foot, on paper, no X. Where you are is the app's own selection tint.",
      Draw: NavigatorB,
    },
    { key: "c", caption: "Third way: the whole page becomes the contents.", Draw: NavigatorC },
  ];

const PILL =
  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const PILL_ON = "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const PILL_OFF = "border-border bg-card text-muted-foreground hover:text-foreground";

/** A 390x844 window onto one phone screen. A plain clipped box: no
 *  transform, because a transform is what broke sticky. */
function Still({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius)] border border-border"
      style={{ width: VIEWPORT_WIDTH.phone, height: PHONE_HEIGHT }}
    >
      {children}
    </div>
  );
}

function Harness({ round }: { round: SketchRound }) {
  const router = useRouter();
  const params = useSearchParams();
  const w = params.get("w");
  const view: View = w === "screens" || w === "laptop" ? w : "reader";
  const frame = params.get("frame");
  const bare = params.get("bare") === "1";

  function go(next: View) {
    const q = new URLSearchParams(params.toString());
    q.set("w", next);
    router.replace(`/lab/catchups/sketches?${q.toString()}`, { scroll: false });
  }

  const stills = frame ? STILLS.filter((s) => s.key === frame) : STILLS;

  return (
    <div className="min-h-screen bg-background">
      {!bare && (
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/lab"
              className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PeaksMark size={16} />
              Lab
            </Link>
            <div className="flex items-center gap-2" role="group" aria-label="View">
              {VIEWS.map((v) => (
                <SpringPress
                  key={v.key}
                  as="button"
                  onClick={() => go(v.key)}
                  aria-pressed={v.key === view}
                  className={`${PILL} ${v.key === view ? PILL_ON : PILL_OFF}`}
                >
                  {v.label}
                </SpringPress>
              ))}
            </div>
          </div>
        </header>
      )}

      <div className={bare ? "p-0" : "py-5"}>
        {!bare && (
          <div className="px-4 sm:px-6">
            <h1 className="font-heading text-[1.35rem] leading-tight tracking-[-0.02em]">
              The strip is the navigator
            </h1>
            <p className="mt-1 max-w-[70ch] text-[14px] text-muted-foreground">
              {view === "reader" &&
                "Scroll. Under the green bar, the strip takes each question as its heading leaves, and the line along its top grows. Tap the strip."}
              {view === "screens" &&
                "Five moments from deep in the page, and the navigator drawn three ways."}
              {view === "laptop" &&
                "The same page at this window's width, the questions left open in a rail on the right. Open it on a laptop."}
            </p>
          </div>
        )}

        {view === "reader" && (
          /* The phone page, fluid, capped at a phone's width and centred
             on anything wider. On his phone that is 1:1 and the drawing IS
             the page. */
          <div className={bare ? "" : "mt-5"}>
            <div className="mx-auto w-full max-w-[430px]">
              <Reader round={round} viewport="phone" />
            </div>
          </div>
        )}

        {view === "screens" && (
          <div
            className={
              bare
                ? ""
                : "mt-5 flex flex-wrap items-start justify-center gap-6 px-4 sm:justify-start sm:px-6"
            }
          >
            {stills.map(({ key, caption, Draw }) =>
              bare ? (
                <div key={key} style={{ width: VIEWPORT_WIDTH.phone, height: PHONE_HEIGHT }}>
                  <Draw round={round} />
                </div>
              ) : (
                <figure key={key} className="w-[390px] max-w-full">
                  <Still>
                    <Draw round={round} />
                  </Still>
                  <figcaption className="mt-2 text-[12px] text-muted-foreground">
                    {caption}
                  </figcaption>
                </figure>
              )
            )}
          </div>
        )}

        {view === "laptop" && (
          <div className={bare ? "" : "mt-5"}>
            <Reader round={round} viewport="laptop" />
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
