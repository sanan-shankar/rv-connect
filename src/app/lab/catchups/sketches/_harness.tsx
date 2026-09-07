"use client";

/* ------------------------------------------------------------------ *
 *  The room: Catch-ups as one thing you can walk through.
 *
 *    Phone     the whole spine at 390: the list, a Catch-up's home in
 *              every state, and the reader. Tap through it.
 *    Laptop    the same spine at this window's width.
 *    Screens   five 390x844 stills, and the navigator drawn three ways.
 *
 *  It is navigable rather than a set of pictures because the thing being
 *  judged is the relationship between the pages, not the pages. His, on
 *  2026-09-07: "more importantly, the structures between, behind these
 *  pages. How they relate, how you access everything. The entire logic of
 *  this entire concept."
 *
 *  NOTHING IS SCALED HERE. The room used to draw at a fixed width and
 *  shrink the result to fit, which silently broke every sticky element
 *  inside it: a sticky box in a `transform: scale(s)` drifts at (1 - s)
 *  of the scroll, so the navigator crawled off the top of the screen
 *  instead of staying put ("the in the loop and the question are supposed
 *  to be fixed, but they actually move very slowly"). Both live views are
 *  fluid, so a phone shows the phone page at 1:1.
 *
 *  Deep links, so a screenshot or a message can name one:
 *    /lab/catchups/sketches?w=phone|laptop|screens
 *    ...&at=list|home|reader   where in the spine to start
 *    ...&state=answering       which home state (see _shelf homeVariants)
 *    ...&frame=mid|long|a|b|c  one still alone (screens)
 *    ...&bare=1                no lab chrome, so a capture is the frame
 *    ...&data=pressure         the invented corpus instead of the real Round
 * ------------------------------------------------------------------ */

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { Reader, GUTTER } from "./_reader";
import { DesktopShell, PhoneBar, PhoneShell } from "./_shell";
import { List } from "./_list";
import { Home } from "./_home";
import { buildShelf, homeVariants, type SketchCatchup } from "./_shelf";
import { LongQuestionFrame, MidScrollFrame, NavigatorA, NavigatorB, NavigatorC } from "./_frames";
import { PHONE_HEIGHT, VIEWPORT_WIDTH, type SketchRound } from "./_types";

type View = "phone" | "laptop" | "screens";

const VIEWS: Array<{ key: View; label: string }> = [
  { key: "phone", label: "Phone" },
  { key: "laptop", label: "Laptop" },
  { key: "screens", label: "Screens" },
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
/** The jump row's pills: smaller, because they are chrome over a phone. */
const JUMP =
  "shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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

/* ── the spine ─────────────────────────────────────────────────────── *
 *  One piece of state, and it is the architecture: you are on the list,
 *  inside a Catch-up, or inside a Round. Every move between them is the
 *  one the design says it is -- the panel, the cover, the name at the top
 *  -- so a fault in the relationship shows up here as a dead end rather
 *  than as a paragraph in a document. */
type Where = { at: "list" } | { at: "home"; c: SketchCatchup } | { at: "reader" };

/** How many Catch-ups the list shows. Three is the real number -- "I
 *  don't think one person will be in too many catch-ups" (para 1) -- and
 *  it is what the page is designed for. Six is every state at once, which
 *  is a room's job and not a member's page. */
const REAL_SHELF = 3;
/* How many the list draws, and the room cycles through them. ONE is the case
   he says most members are in -- "at least 60% are only going to have their
   batch catch-up" -- and it is the one a two-column grid handles worst, so it
   is a state the room has to be able to show. */
const SHELF_STEPS = [1, 3, 6] as const;
const SHELF_LABEL: Record<number, string> = { 1: "Just one", 3: "Three", 6: "Every state" };

function Spine({
  round,
  shelf,
  phone,
  start,
  startState,
}: {
  round: SketchRound;
  shelf: SketchCatchup[];
  phone: boolean;
  start: string | null;
  startState: string | null;
}) {
  const variants = homeVariants(shelf);
  const startVariant = variants.find((v) => v.key === startState) ?? variants[4];
  const [howMany, setHowMany] = useState(REAL_SHELF);
  const [where, setWhere] = useState<Where>(
    start === "reader"
      ? { at: "reader" }
      : start === "home"
        ? { at: "home", c: startVariant.c }
        : { at: "list" },
  );

  /* Every cover in the room opens the one real Round there is on this
     database. On a Catch-up whose Rounds are invented, that is a lie the
     room tells on purpose: the point of the move is that the cover is the
     door, not which Round is behind it. */
  const open = (c: SketchCatchup) =>
    setWhere(c.state === "published" ? { at: "reader" } : { at: "home", c });

  const published = shelf.find((c) => c.state === "published") ?? shelf[0];
  const page =
    where.at === "reader" ? (
      <Reader
        round={round}
        viewport={phone ? "phone" : "laptop"}
        onHome={() => setWhere({ at: "home", c: published })}
      />
    ) : (
      <Framed phone={phone}>
        {where.at === "list" ? (
          <List shelf={shelf.slice(0, howMany)} onOpen={open} phone={phone} />
        ) : (
          <Home c={where.c} phone={phone} onRead={() => setWhere({ at: "reader" })} />
        )}
      </Framed>
    );

  return (
    <>
      {/* The room's own controls, never the design's. One scrolling row,
          because on a phone this is chrome sitting on top of the thing
          being judged and it must not take a third of the screen. */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setWhere({ at: "list" })}
          className={`${JUMP} ${where.at === "list" ? PILL_ON : PILL_OFF}`}
        >
          The list
        </button>
        {variants.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setWhere({ at: "home", c: v.c })}
            className={`${JUMP} ${
              where.at === "home" && where.c.id === v.c.id ? PILL_ON : PILL_OFF
            }`}
          >
            {v.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setWhere({ at: "reader" })}
          className={`${JUMP} ${where.at === "reader" ? PILL_ON : PILL_OFF}`}
        >
          The reader
        </button>
        {where.at === "list" && (
          <button
            type="button"
            onClick={() =>
              setHowMany((n) => SHELF_STEPS[(SHELF_STEPS.indexOf(n as 1 | 3 | 6) + 1) % SHELF_STEPS.length])
            }
            className={`${JUMP} ${howMany === REAL_SHELF ? PILL_OFF : PILL_ON}`}
          >
            {SHELF_LABEL[howMany]}
          </button>
        )}
      </div>
      {phone ? <div className="mx-auto w-full max-w-[430px]">{page}</div> : page}
    </>
  );
}

/** The list and the home are ordinary pages, so they get the ordinary
 *  shell: the green bar and the wordmark on a phone, the sidebar and the
 *  page's own p-10 gutter on a laptop. The reader draws its own, because
 *  its bar carries the Catch-up's name instead of the wordmark. */
function Framed({ children, phone }: { children: ReactNode; phone: boolean }) {
  if (!phone) return <DesktopShell>{children}</DesktopShell>;
  return (
    <PhoneShell>
      <PhoneBar position="sticky" />
      <div className="pb-16 pt-6" style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}>
        {children}
      </div>
    </PhoneShell>
  );
}

function Harness({ round, pressure }: { round: SketchRound; pressure: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const w = params.get("w");
  const view: View = w === "screens" || w === "laptop" ? w : "phone";
  const frame = params.get("frame");
  const bare = params.get("bare") === "1";
  const shelf = buildShelf(round);

  function url(key: string, value: string | null) {
    const q = new URLSearchParams(params.toString());
    if (value === null) q.delete(key);
    else q.set(key, value);
    return `/lab/catchups/sketches?${q.toString()}`;
  }
  /** For the view pills, which only move client state. */
  function set(key: string, value: string | null) {
    router.replace(url(key, value), { scroll: false });
  }
  /* Which corpus is read by the SERVER component (page.tsx picks the loader
     off `searchParams.data`), so a client-side `router.replace` changed the
     address bar and nothing else -- the Pressure pill lit up and the page kept
     drawing the real Round. His, 2026-09-07: "pressure button does literally
     nothing." It is a full navigation now, because the thing it switches is
     decided before any of this renders. */
  function reload(key: string, value: string | null) {
    window.location.assign(url(key, value));
  }
  const go = (next: View) => set("w", next);

  const stills = frame ? STILLS.filter((s) => s.key === frame) : STILLS;

  return (
    <div className="min-h-screen bg-background">
      {/* The room's own chrome scrolls rather than pushing the page wider. At
          390 this row of pills measured 449px, so the DOCUMENT was 59px wider
          than the window and the whole drawing sat in a horizontally scrolling
          page -- which is why a list card looked as though it did not reach the
          right margin. It always did: the cards run 20 to 370 inside a 390
          viewport. The room was the thing that was too wide. */}
      {!bare && (
        <header className="border-b border-border py-3">
          <div className="flex items-center gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
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
            {/* Which corpus. Its own group, away from the view pills,
                because it changes WHAT is drawn rather than where you are
                standing. On, it is cinnamon rather than canopy: a page of
                invented answers must never be mistaken for members' words
                at a glance. */}
            <SpringPress
              as="button"
              onClick={() => reload("data", pressure ? null : "pressure")}
              aria-pressed={pressure}
              className={`${PILL} ${
                pressure
                  ? "border-transparent bg-cinnamon text-white shadow-[0_5px_13px_-12px_var(--color-cinnamon)]"
                  : PILL_OFF
              }`}
            >
              Pressure
            </SpringPress>
          </div>
        </header>
      )}

      <div className={bare ? "p-0" : "py-5"}>
        {!bare && (
          <div className="mb-3.5 px-4 sm:px-6">
            <h1 className="font-heading text-[1.15rem] leading-tight tracking-[-0.02em] sm:text-[1.35rem]">
              The shape of the whole thing
            </h1>
            <p className="mt-1 max-w-[70ch] text-[13px] text-muted-foreground sm:text-[14px]">
              {pressure
                ? "The pressure corpus: invented people, invented words. Forty answers under one question, a twenty-four photograph wall, an answer over the character cap, a hundred names in the rail, links nobody has a resolver for."
                : view === "screens"
                  ? "Five moments from deep in a Round, and the navigator drawn three ways."
                  : "The list, a Catch-up's home in every state, and the reader, joined up. Tap a Catch-up; tap a cover; the name at the top is the way back."}
            </p>
          </div>
        )}

        {view === "screens" ? (
          <div
            className={
              bare
                ? ""
                : "flex flex-wrap items-start justify-center gap-6 px-4 sm:justify-start sm:px-6"
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
        ) : (
          <Spine
            round={round}
            shelf={shelf}
            phone={view === "phone"}
            start={params.get("at")}
            startState={params.get("state")}
          />
        )}
      </div>
    </div>
  );
}

export function SketchHarness({
  round,
  pressure = false,
}: {
  round: SketchRound;
  pressure?: boolean;
}) {
  // useSearchParams needs a Suspense boundary in a client component.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Harness round={round} pressure={pressure} />
    </Suspense>
  );
}
