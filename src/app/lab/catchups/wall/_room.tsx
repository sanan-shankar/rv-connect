"use client";

/* ------------------------------------------------------------------ *
 *  The room: a wall of photographs, read three ways.
 *
 *  Pick a shape, pick a wall, look at it. Then change the wall under the
 *  same shape, which is where two of the three fall over.
 *
 *  IT IS DRAWN INSIDE A PAGE, not on a stage. A wall question sits
 *  between two ordinary questions in an Edition, so there is a question
 *  above it and a question with two answers below it. His rule for the
 *  whole thing, brief 16: it "needs to be modular and work with
 *  everything else." A shape that only looks right with nothing around it
 *  has not answered that.
 *
 *  NOTHING IS SCALED (campaign finding F34). The phone view is a real 390
 *  and the laptop view is this window. A `position: sticky` element inside
 *  a `transform: scale(s)` drifts by (1 - s) of the scroll, which is the
 *  fault he opened 2026-09-07 with, and the frame that caused it is gone
 *  for good.
 *
 *  THE ROOM'S OWN CHROME SCROLLS rather than pushing the page wider
 *  (F44): at 390 a row of eleven pills is wider than the window, the
 *  document scrolls sideways, and the drawing looks as though it does not
 *  reach the right margin when it always did. He has reported that once
 *  as a design fault.
 * ------------------------------------------------------------------ */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { PhoneBar, PhoneShell, DesktopShell } from "../sketches/_shell";
import { WALLS, type WallKey } from "./_corpus";
import { Run, Drift, Stack, wallCountLine, type ShapeProps } from "./_shapes";

/* The reader's own numbers, so the wall is judged at the width it will
   really have. GUTTER and the reading column come from `_reader.tsx`:
   20px page gutter on a phone, and at 1512 the reading column is 856
   (1512 window, 248 sidebar, 40+40 page gutter, 48 gutter, 280 rail). */
const GUTTER = 20;
const READING = 856;

type ShapeKey = "run" | "drift" | "stack";

const SHAPES: Array<{
  key: ShapeKey;
  label: string;
  draw: (p: ShapeProps) => React.ReactNode;
  /** What it is, then what it costs. Under the drawing, never above it. */
  says: string[];
}> = [
  {
    key: "run",
    label: "A run",
    draw: (p) => <Run {...p} />,
    says: [
      "One band, every photograph at its own width, moving sideways off the right edge. In a 300px band the widest photograph the app owns is 505px across and the tallest is 200px, and nothing is cropped to match anything else.",
      "It is the cheapest of the three and the least surprising: it is what an answer's photographs already do, one row up. Somebody who sent three photographs gets three frames 3px apart under one name, so the wall is still about people.",
      "What it gives up is words. There is nowhere in a band to set a caption, so anything anybody wrote lives in the viewer. On the live Edition five photographs in fourteen carry words.",
      "At two hundred it does not break. The page is 2,104px whether the wall holds three photographs or two hundred, and the strip is 65,566px long, which is 77 screens of sideways travel that nobody will make. The hairline under it is the only thing that admits that.",
    ],
  },
  {
    key: "drift",
    label: "A drift",
    draw: (p) => <Drift {...p} />,
    says: [
      "Photographs down the column at three measures, and which one a photograph gets is a fact about the photograph. Landscape takes the full column because it is short. Square takes the middle measure. Portrait takes the small one, alternating sides.",
      "The margin each one leaves is where its bird, its name and its words go. That is the answer to the tile being 85% empty: the emptiness is the caption's home rather than a gap the layout could not fill.",
      "Three portraits in a row get paired two across, because a wall where everybody used a phone is otherwise fourteen towers down one column. Two, never three.",
      "It is the hardest of the three to keep from looking ragged and the most likely to be beautiful. It is also the one that gets long: 11,826px at twenty-four photographs and 116,321px at two hundred, which is 118 screens of one question.",
    ],
  },
  {
    key: "stack",
    label: "A stack",
    draw: (p) => <Stack {...p} />,
    says: [
      "One photograph at a time, the full column, the person underneath with room for a whole caption. You move with a swipe, the two chevrons, or by pressing anywhere on the rail.",
      "The frame tweens its shape across the step instead of snapping to it, which is the fix that shipped in the viewer after he called the snap jarring. Stepping from the widest photograph to the tallest moves the box from 856 by 508 to 413 by 620, and the eye should not see that happen a frame before the pixels do. Nothing here is ever cropped: a tall one gets narrower rather than shorter.",
      "It is the only one of the three that is the same object at one photograph and at two hundred: the page is 2,345px and 2,393px, a difference of 48. The rail is pressable for exactly that reason: without it, reaching photograph 150 is 149 taps and the claim is not true.",
      "What it gives up is the wall. You never see the group at once, which is the thing a wall question is for.",
    ],
  },
];

const PILL =
  "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ON =
  "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const OFF =
  "border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground";

/* Deep links, so a screenshot or a message can name one state:
     /lab/catchups/wall?w=phone|laptop&shape=run|drift|stack
     ...&wall=one|three|real|portrait|flood
   Every one of them is client state, so `router.replace` is the right tool
   here and F43 does not apply: nothing on the server reads these. The trap
   F43 names is a switch the SERVER reads, which `?data=pressure` in the
   sketches room is and none of these are. */
function Room() {
  const router = useRouter();
  const params = useSearchParams();

  const view: "phone" | "laptop" = params.get("w") === "laptop" ? "laptop" : "phone";
  const shape = (SHAPES.find((s) => s.key === params.get("shape"))?.key ??
    "run") as ShapeKey;
  const wall = (params.get("wall") ?? "real") as WallKey;
  const wallKey: WallKey = wall in WALLS ? wall : "real";

  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, value);
    router.replace(`/lab/catchups/wall?${q.toString()}`, { scroll: false });
  };
  const setView = (v: "phone" | "laptop") => set("w", v);
  const setShape = (v: ShapeKey) => set("shape", v);
  const setWall = (v: WallKey) => set("wall", v);

  const phone = view === "phone";
  const current = SHAPES.find((s) => s.key === shape) ?? SHAPES[0];
  const shots = WALLS[wallKey].shots;
  const props: ShapeProps = { shots, phone, gutter: GUTTER };

  const drawing = (
    <div style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}>
      <div style={phone ? undefined : { width: READING, maxWidth: "100%" }}>
        <QuestionHead
          text="Put up a photograph from this year."
          asker="Meera Raghavan"
          count={wallCountLine(shots)}
        />
        <div className="mt-5">{current.draw(props)}</div>
        <NextQuestion phone={phone} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border py-3">
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          <Link
            href="/lab"
            className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PeaksMark size={16} />
            Lab
          </Link>
          <div className="flex shrink-0 gap-1.5" role="group" aria-label="Viewport">
            {(["phone", "laptop"] as const).map((v) => (
              <SpringPress
                key={v}
                as="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`${PILL} ${view === v ? ON : OFF}`}
              >
                {v === "phone" ? "Phone" : "Laptop"}
              </SpringPress>
            ))}
          </div>
          <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
          <div className="flex shrink-0 gap-1.5" role="group" aria-label="Shape">
            {SHAPES.map((s) => (
              <SpringPress
                key={s.key}
                as="button"
                onClick={() => setShape(s.key)}
                aria-pressed={shape === s.key}
                className={`${PILL} ${shape === s.key ? ON : OFF}`}
              >
                {s.label}
              </SpringPress>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 sm:px-6">
        <h1 className="font-heading text-[1.15rem] leading-tight tracking-[-0.02em] sm:text-[1.35rem]">
          A wall is not a contact sheet
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
          Three ways to read a wall of photographs. Flick between them, then change how many are on it.
        </p>
      </div>

      {/* How big the wall is. Its own row, and cinnamon rather than canopy,
          because it changes WHAT is drawn rather than how. */}
      <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {(Object.keys(WALLS) as WallKey[]).map((k) => (
          <SpringPress
            key={k}
            as="button"
            onClick={() => setWall(k)}
            aria-pressed={wallKey === k}
            className={`${PILL} ${
              wallKey === k
                ? "border-transparent bg-cinnamon text-white shadow-[0_5px_13px_-12px_var(--color-cinnamon)]"
                : OFF
            }`}
          >
            {WALLS[k].label}
          </SpringPress>
        ))}
      </div>
      <p className="mt-2 max-w-[74ch] px-4 text-[13px] leading-[1.55] text-muted-foreground sm:px-6">
        {WALLS[wallKey].note}
      </p>

      <div className="mt-5">
        {phone ? (
          <div className="mx-auto w-full max-w-[430px]">
            <PhoneShell>
              <PhoneBar title="In the loop" position="sticky" />
              <div className="pb-14 pt-7">{drawing}</div>
            </PhoneShell>
          </div>
        ) : (
          <>
            <p className="mb-2 px-4 text-[12.5px] text-muted-foreground sm:px-6">
              The reading column at 856, the width the reader gives it at 1512. The rail that
              sits in the space on the right is the navigator, and it is not drawn here.
            </p>
            <DesktopShell>
              <div className="pb-16">{drawing}</div>
            </DesktopShell>
          </>
        )}
      </div>

      {/* The argument for whatever is on screen, under it, where he can
          look at the thing while reading about it. */}
      <div className="mx-auto max-w-[74ch] px-4 py-9 sm:px-6">
        {/* The numbers ARE the finding here, which is the only reason they
            are on the page: how long the question gets is the thing that
            separates these three, and it is the thing you cannot see by
            looking at any one of them. Measured at 1512, page height in
            pixels. */}
        <h2 className="font-heading text-[1.05rem] tracking-[-0.02em]">
          How long the question gets
        </h2>
        <div className="mt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[420px] text-[13.5px] tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 text-left font-medium">&nbsp;</th>
                <th className="pb-2 text-right font-medium">3</th>
                <th className="pb-2 text-right font-medium">24</th>
                <th className="pb-2 text-right font-medium">200</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["A run", "2,104", "2,104", "2,104"],
                ["A drift", "2,904", "11,826", "116,321"],
                ["A stack", "2,393", "2,393", "2,393"],
              ].map(([name, a, b, c]) => (
                <tr key={name} className="border-t border-border">
                  <td className="py-2 font-medium text-foreground">{name}</td>
                  <td className="py-2 text-right text-muted-foreground">{a}</td>
                  <td className="py-2 text-right text-muted-foreground">{b}</td>
                  <td className="py-2 text-right text-muted-foreground">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          The run pays nothing for a bigger wall because it spends the room sideways instead:
          its strip is 7,938px long at twenty-four and 65,566px at two hundred. The stack pays
          nothing either, and shows you one photograph. The drift is the only one where the
          size of the wall is the size of the page, which is both the reason it feels like a
          wall and the reason two hundred is 118 screens.
        </p>

        <h2 className="mt-10 font-heading text-[1.05rem] tracking-[-0.02em]">{current.label}</h2>
        {current.says.map((line, i) => (
          <p key={i} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
            {line}
          </p>
        ))}

        <h2 className="mt-10 font-heading text-[1.05rem] tracking-[-0.02em]">
          How many photographs one person may put up
        </h2>
        <p className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          An answer is capped at three today. The spec says a wall question raises that cap and
          does not say to what. The proposal is <strong className="font-semibold">six</strong>.
        </p>
        <p className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          Six is visibly not three, so a wall feels like a different kind of question without
          needing a different control. It is also where a person stops choosing and starts
          emptying a camera roll: three is a moment, six is a small set, ten is an album and
          nobody looks at somebody else&rsquo;s album.
        </p>
        <p className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          What it does to a group of forty: the ceiling is 240 photographs, which is the Two
          hundred wall above and a bit more. The realistic number is much lower, because on the
          live Edition the people who put up a photograph averaged 1.3 of them. So the shape has
          to survive 240 and be good at 40 to 60, which is the pair of cases to judge these three
          on.
        </p>
        <p className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          If six is too many, the next number down is four rather than three: a wall whose cap
          equals an ordinary answer&rsquo;s is not a wall, it is a question with a photo strip on
          it.
        </p>
      </div>
    </div>
  );
}

/** `useSearchParams` needs a Suspense boundary inside a client component. */
export function WallRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Room />
    </Suspense>
  );
}

/* ── the page around the wall ──────────────────────────────────────── */

/** The reader's own question heading, kept in step with `Section` in
 *  `../sketches/_reader.tsx`: the 2px cinnamon mark, 24px Libre
 *  Baskerville on both viewports, "Asked by" under it. Copied rather than
 *  imported because `Section` takes a whole question and draws its answers
 *  as tiles, which is the thing this room is replacing. If the reader's
 *  heading changes, this changes with it. */
function QuestionHead({
  text,
  asker,
  count,
}: {
  text: string;
  asker: string;
  count: string;
}) {
  return (
    <div>
      <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
      <h2
        className="mt-3 font-heading text-foreground [overflow-wrap:anywhere]"
        style={{ fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.015em" }}
      >
        {text}
      </h2>
      <p className="mt-2 text-[13.5px] text-muted-foreground">Asked by {asker}</p>
      {/* The one number a wall cannot show you by looking, whichever shape
          it takes: how big it is. */}
      <p className="mt-1 text-[13.5px] text-muted-foreground">{count}</p>
    </div>
  );
}

/** The question after the wall, so the join between a wall and an ordinary
 *  question is on screen rather than described. Two tiles, the reader's
 *  own material: card stock, the feed's radius, a 40px bird, the name at
 *  17px medium, no timestamp. */
function NextQuestion({ phone }: { phone: boolean }) {
  const answers = [
    {
      id: "after-1",
      name: "Joseph Mathew",
      text: "Slower than last year, which I did not expect to enjoy as much as I have.",
    },
    {
      id: "after-2",
      name: "Leela Nair",
      text: "Two weddings, one move, and a dog who has decided he lives here now.",
    },
  ];
  return (
    <div className="mt-14">
      <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
      <h2
        className="mt-3 font-heading text-foreground"
        style={{
          fontSize: 24,
          lineHeight: 1.2,
          letterSpacing: "-0.015em",
          maxWidth: phone ? undefined : "26ch",
        }}
      >
        How has the year been?
      </h2>
      <div className="mt-4 space-y-3">
        {answers.map((a) => (
          <article
            key={a.id}
            className="overflow-hidden rounded-[var(--radius)] border border-border bg-card"
          >
            <div className={phone ? "px-4 pt-4" : "px-5 pt-5"}>
              <div className="flex min-w-0 items-center gap-3">
                <BirdAvatar user={{ id: a.id, name: a.name }} size={40} />
                <span className="min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
                  {a.name}
                </span>
              </div>
              <p className="mt-3 text-[16px] leading-[1.65] text-foreground">{a.text}</p>
            </div>
            <div className={phone ? "-ml-2.5 px-4 pb-1.5 pt-1" : "-ml-2.5 px-5 pb-2 pt-1.5"}>
              <Quiet />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Quiet() {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(2);
  return (
    <LoveButton
      liked={liked}
      count={count}
      onToggle={() => {
        setLiked((v) => !v);
        setCount((c) => (liked ? c - 1 : c + 1));
      }}
      label="Love this answer"
    />
  );
}
