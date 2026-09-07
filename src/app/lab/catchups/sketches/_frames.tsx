"use client";

/* ------------------------------------------------------------------ *
 *  Five stills, 390x844 each, of moments the live reader reaches only
 *  after scrolling: so they can be compared side by side on a laptop and
 *  pointed at on a phone. Each is drawn with the same parts as the live
 *  page, at a fixed scroll position.
 * ------------------------------------------------------------------ */

import type { SketchQuestion, SketchRound } from "./_types";
import { PhoneBar, PhoneShell } from "./_shell";
import { said } from "./_parts";
import {
  BAR,
  BottomSheet,
  ContentsPage,
  RoundMeta,
  Strip,
  UnfoldedPanel,
} from "./_navigator";
import { GUTTER, Tile } from "./_reader";

/** The songs question, the fifth: one line in the strip, and the one whose
 *  answers carry pasted links. */
const DEEP = 4;

/** A question at the app's 300-character cap (actions.ts:129). Invented;
 *  the real Round's longest is about 90. Five lines in the strip at 390,
 *  and not one of them is cut. */
const LONG_QUESTION =
  "If you could go back to one ordinary afternoon at RV, not a big day or an event, just an afternoon that felt like nothing at the time, which one would it be, where were you, who was there with you, and what is it about that particular afternoon that has stayed with you when so many others have gone?";

function deep(round: SketchRound): SketchQuestion {
  return round.questions[DEEP] ?? round.questions[round.questions.length - 1];
}

/** The page under the bar, cut off at the top the way a page mid-scroll
 *  is: the first tile starts 88px above the strip, so the strip's glass
 *  has something to be over. */
function Under({ q, from = 0, dim = false }: { q: SketchQuestion; from?: number; dim?: boolean }) {
  return (
    <div
      className={dim ? "opacity-60" : undefined}
      style={{ position: "absolute", left: GUTTER, right: GUTTER, top: BAR - 88 }}
    >
      <div className="space-y-3">
        {said(q.entries)
          .slice(from, from + 6)
          .map((e) => (
            <Tile key={e.id} entry={e} phone />
          ))}
      </div>
    </div>
  );
}

/** Deep in the songs question: the strip holds it, the line says 42%. */
export function MidScrollFrame({ round }: { round: SketchRound }) {
  const q = deep(round);
  return (
    <PhoneShell tall={false}>
      <Under q={q} from={3} />
      <PhoneBar title={round.catchupName} position="absolute" />
      <div className="absolute inset-x-0 z-30" style={{ top: BAR }}>
        <Strip label={q.text} docked progress={0.42} />
      </div>
    </PhoneShell>
  );
}

/** The 300-character question, docked. */
export function LongQuestionFrame({ round }: { round: SketchRound }) {
  const q = round.questions[7] ?? deep(round);
  return (
    <PhoneShell tall={false}>
      <Under q={q} from={1} />
      <PhoneBar title={round.catchupName} position="absolute" />
      <div className="absolute inset-x-0 z-30" style={{ top: BAR }}>
        <Strip label={LONG_QUESTION} docked progress={0.77} />
      </div>
    </PhoneShell>
  );
}

/** First way: the strip has unfolded. */
export function NavigatorA({ round }: { round: SketchRound }) {
  const q = deep(round);
  return (
    <PhoneShell tall={false}>
      <Under q={q} from={3} dim />
      <div className="absolute inset-x-0 bottom-0 bg-black/25" style={{ top: BAR }} />
      <PhoneBar title={round.catchupName} position="absolute" />
      <div className="absolute inset-x-0 z-30" style={{ top: BAR }}>
        <Strip label={<RoundMeta round={round} />} docked={false} progress={0.42} open />
        <UnfoldedPanel round={round} current={DEEP} within={0.55} />
      </div>
    </PhoneShell>
  );
}

/** Second way: the sheet from the foot, on paper. */
export function NavigatorB({ round }: { round: SketchRound }) {
  const q = deep(round);
  return (
    <PhoneShell tall={false}>
      <Under q={q} from={3} dim />
      <PhoneBar title={round.catchupName} position="absolute" />
      <div className="absolute inset-x-0 z-20" style={{ top: BAR }}>
        <Strip label={q.text} docked progress={0.42} />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30 bg-black/25" style={{ top: BAR }} />
      <div className="absolute inset-x-0 bottom-0 z-40">
        <BottomSheet round={round} current={DEEP} within={0.55} />
      </div>
    </PhoneShell>
  );
}

/** Third way: the page is the contents. */
export function NavigatorC({ round }: { round: SketchRound }) {
  return (
    <PhoneShell tall={false}>
      <PhoneBar title={round.catchupName} position="absolute" />
      <div className="absolute inset-x-0 bottom-0" style={{ top: BAR }}>
        <ContentsPage round={round} current={DEEP} within={0.55} />
      </div>
    </PhoneShell>
  );
}
