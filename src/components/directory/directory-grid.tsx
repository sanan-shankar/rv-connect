"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "motion/mini";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { ProfileCard } from "./profile-card";
import type { DirectoryPerson } from "@/app/(main)/directory/select";

/* ------------------------------------------------------------------ *
 *  The people grid, and the only thing on this page that knows how one
 *  result set turns into another.
 *
 *  WHAT WAS WRONG
 *
 *  `useAutoAnimate` on the grid element. Measured on 2026-09-16 at 4x
 *  CPU throttle, 84 members, two letters typed into the search box:
 *
 *      long tasks   510, 466, 394, 370, 160, 60, 54 ms
 *      worst frames 517, 483, 400, 367, 183, 83 ms
 *      entering People from Map:  one 967ms frame, one 928ms long task
 *
 *  Which is the owner's "one frame per second", exactly. Four faults:
 *
 *  1. auto-animate measures EVERY child from a MutationObserver, one
 *     getBoundingClientRect at a time, interleaved with the style writes
 *     it makes as it goes. 60 cards is 60 forced layouts. It also
 *     animates width and height, which are layout properties, so the
 *     animation re-lays out the page on every frame of itself.
 *  2. It animated all 60, of which nine are on screen.
 *  3. Nothing owned opacity. The view crossfaded (180ms), the wrapper
 *     dimmed to 0.55 while the navigation was in flight, and
 *     auto-animate faded each card in -- three reports of one event in
 *     the same pixels. That is the "appears halfway and then appears
 *     fully", and it was not a timing bug: the grid genuinely did arrive
 *     at 55% and then finish.
 *  4. The server hands down a fresh array of fresh objects on every
 *     filter change, so all 46 survivors of a narrowing re-rendered --
 *     each rebuilding a BirdAvatar's SVG glyph -- in the same frame as
 *     the animation. `ProfileCard` is memoised now; see its own note.
 *
 *  CONSIDERED AND NOT TAKEN: gliding the survivors
 *
 *  The obvious repair is to do auto-animate's job properly: keep the
 *  cards keyed by person, read every rect in one pass, and FLIP the
 *  people who survived the filter from where they were to where they
 *  now are, so you can watch who stayed. It was built, and it ran at
 *  60fps, and it looked wrong -- filmed at 8% speed, 46 cards each
 *  drifting a different short vector at the same time reads as jelly,
 *  not as a list closing ranks. The fault is in the premise: this
 *  server sorts by relevance, so a search does not narrow the order, it
 *  REPLACES it. Almost nobody is where they were, and a motion that
 *  promises "follow this person across the change" cannot be kept.
 *
 *  WHAT IT DOES INSTEAD
 *
 *  Treat the grid as a board of SLOTS rather than a bag of people, and
 *  animate only the slots whose occupant changed. Nothing moves
 *  horizontally, nothing changes position at all: each changed slot
 *  dims and sinks 4px, the list commits underneath, and the new
 *  occupant rises 9px into the same place. Staggered down the reading
 *  order, so what you see is one ripple travelling down the page.
 *
 *  Two things follow from "only the slots that changed", and they are
 *  the whole reason this is better than a fade over the top:
 *
 *  - A slot holding the same person before and after DOES NOT MOVE.
 *    Narrow a filter and the people it did not touch sit perfectly
 *    still while the rest of the page re-forms around them. That is
 *    the thing FLIP was reaching for, and it is legible here because
 *    stillness is easier to read than travel.
 *  - Because no position changes, there is no layout animation, so the
 *    whole re-form is `transform` and `opacity` handed to
 *    `motion/mini` -- a thin wrapper over the Web Animations API. Both
 *    are compositor properties: after the first frame the main thread
 *    is free, and the ripple keeps running through a React render.
 *
 *  And one rule keeps it free as the school grows: only slots within
 *  half a screen of the window animate. Everything else is placed at
 *  its final value. The cost is set by the size of the window, not by
 *  the number of alumni.
 * ------------------------------------------------------------------ */

/* The old occupant leaving. Long enough not to read as a cut (under
   ~90ms a fade is indistinguishable from one), short enough that the
   page is never empty for a beat you could notice. */
const OUT_MS = 120;
/* The new one arriving, and it is deliberately longer than the exit:
   what you are being shown is the RESULT, so the arrival is the half
   worth watching and the departure is throat-clearing. */
const IN_MS = 210;
/* The ripple, and it is stepped PER ROW rather than per card. Per card
   the wave crosses the grid on a diagonal, which on a three-column
   layout means the three cards of one row arrive at three different
   times and the row never exists as a row. Per row it is a horizontal
   band travelling down the page, which is what the grid is actually
   made of -- and on a phone, where there is one column, the two are the
   same thing.
   The exit's step is tight because a slow disappearance is just latency
   with a curve on it; the entrance's is wider, because that is the wave
   meant to be watched. Both are under the ~25ms where a stagger stops
   reading as one motion and becomes a queue of separate ones. */
const OUT_STEP_MS = 9;
const IN_STEP_MS = 16;
/* Ceilings on the stagger, in rows. Ten rows is about a desktop window
   (eleven fit in 900px at the 66px card) and more than a phone's, so
   the wave is stepped across everything anyone can see and everything
   past it simply joins the last step. Without this a change touching
   fourteen rows would run for 900ms. */
const OUT_STEP_CAP = 6;
const IN_STEP_CAP = 10;
/* How far the sink and the rise travel. Asymmetric on purpose, matching
   `FadeRise` in the shared motion kit: down is leaving, up is arriving,
   and the arrival is given more distance because it is the one the eye
   should follow. Small enough that neither can be mistaken for the
   layout moving. */
const SINK_PX = 4;
const RISE_PX = 9;
/* How far outside the window a slot still animates, as a share of the
   window. Half a screen: a card one small scroll away has already
   settled by the time it is looked at, and a phone showing 84 people in
   one column animates around twenty slots rather than eighty-four. */
const BAND = 0.5;

/** Turn a list of viewport tops, in DOM order, into a row number each:
 *  0 for everything on the first row that appears, 1 for the next, and
 *  so on. Compared with a tolerance rather than for equality, because a
 *  card mid-animation is a fraction of a pixel off its neighbours and
 *  two cards on the same row must not end up on different steps. */
function rowRanks(tops: number[]): number[] {
  let row = -1;
  let last = Number.NaN;
  return tops.map((top) => {
    if (Number.isNaN(last) || Math.abs(top - last) > 2) {
      row += 1;
      last = top;
    }
    return row;
  });
}

export function DirectoryGrid({ people }: { people: DirectoryPerson[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  /* What is actually rendered. It lags `people` by the length of the
     out-wave, and only when a visible slot is changing: that pause IS
     the first half of the ripple. Holding it in state, rather than
     cloning the departing cards into absolutely-positioned ghosts the
     way auto-animate does, is what makes the exit cost nothing. */
  const [shown, setShown] = useState(people);
  /* Which slots the entrance still owes an animation to, handed from
     the effect below to the layout effect that runs after the commit. */
  const arriving = useRef<number[]>([]);
  /* Cancels a wave that a faster typist has already overtaken. */
  const wave = useRef(0);
  /* False until the grid has painted once. It is what tells the entrance
     apart from a change: on a first paint every slot on screen is an
     arrival, and without this flag a change that only TRUNCATES the list
     (the last rows leave, nobody else moves) would reach the layout
     effect with an empty arrivals list and be mistaken for one. */
  const painted = useRef(false);
  /* Every node currently carrying an inline transform or opacity of
     ours. Without this list a fast typist can strand a card: wave two
     arrives while wave one is still fading slot 12 out, wave two has
     nothing to say about slot 12, and slot 12 stays invisible for the
     rest of the session. Cleared wholesale at the top of every commit,
     which is the one moment we know the old wave is over. */
  const dirty = useRef(new Set<HTMLElement>());

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      setShown(people);
      return;
    }

    /* Which slots change hands. Compared by INDEX rather than by
       person, which is the whole slot idea: `shown[3]` and `people[3]`
       being the same id means slot 3 has nothing to say. */
    const changed: number[] = [];
    const longest = Math.max(shown.length, people.length);
    for (let i = 0; i < longest; i++) {
      if (shown[i]?.id !== people[i]?.id) changed.push(i);
    }
    if (changed.length === 0) return;
    /* Reset rather than append: a second filter landing before the first
       has committed replaces the wave, it does not add to it. */
    arriving.current = [];

    /* Slots that exist NOW and are worth watching leave. A slot past
       the end of the new list is leaving for good; one past the end of
       the old list is a pure arrival and has nothing to fade out.
       One read pass for the lot, before anything is written. */
    const leaving: HTMLElement[] = [];
    const tops: number[] = [];
    for (const i of changed) {
      if (i < people.length) arriving.current.push(i);
      const node = grid.children[i] as HTMLElement | undefined;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const margin = window.innerHeight * BAND;
      if (rect.bottom <= -margin || rect.top >= window.innerHeight + margin) continue;
      leaving.push(node);
      dirty.current.add(node);
      tops.push(rect.top);
    }

    if (leaving.length === 0) {
      setShown(people);
      return;
    }

    const rows = rowRanks(tops);
    const id = ++wave.current;
    leaving.forEach((node, k) => {
      node.style.willChange = "transform, opacity";
      /* BOTH ends of every keyframe are given, never just the
         destination. Handed a single value, motion has to ask the
         element where it is starting from -- a getComputedStyle per
         card, which is a forced style recalculation, 60 of them, in the
         frame that is already the busiest one on the page. It cost
         131ms of a 3.8s profile at 4x throttle before this note
         existed. Writing both ends means it never reads the DOM at
         all. */
      animate(
        node,
        { opacity: [1, 0], transform: ["translateY(0px)", `translateY(${SINK_PX}px)`] },
        {
          duration: OUT_MS / 1000,
          delay: (Math.min(rows[k], OUT_STEP_CAP) * OUT_STEP_MS) / 1000,
          ease: EASE_OUT_SMOOTH,
        }
      );
    });

    /* Commit when the LAST exit has finished, never before: the nodes
       are keyed by slot, so React swaps the contents of the very
       elements that are still fading, and a swap at 60% opacity is
       visible as a flicker. */
    const t = setTimeout(
      () => {
        if (id === wave.current) setShown(people);
      },
      OUT_MS + Math.min(rows[rows.length - 1], OUT_STEP_CAP) * OUT_STEP_MS
    );
    return () => clearTimeout(t);
    /* `shown` is read to find the changed slots but must NOT re-run
       this: the wave ends by setting it, and re-entering here would
       start another one against itself. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    /* First paint of a fresh list -- arriving on People, or landing on
       /directory?q= from a link -- has no previous slots to compare, so
       every slot on screen is an arrival and the page assembles itself
       rather than appearing. This is also why the view no longer
       crossfades this grid in: the cards carry their own entrance. */
    /* Wipe the last wave before starting this one. Cancelling is not
       the same as clearing: a Web Animations animation overrides the
       inline style while it runs, so a node mid-fade has to be stopped
       as well as tidied or it carries on to an opacity nobody asked
       for. Writes only, no reads, so it costs no layout. */
    for (const node of dirty.current) {
      for (const running of node.getAnimations()) running.cancel();
      node.style.willChange = "";
      node.style.opacity = "";
      node.style.transform = "";
    }
    dirty.current.clear();

    const slots = painted.current ? arriving.current : shown.map((_, i) => i);
    arriving.current = [];
    painted.current = true;
    if (slots.length === 0) return;

    /* READ, then WRITE, in that order and once each. The band and the
       row of every arrival are worked out against the layout the commit
       just produced -- not the one measured before it, which belonged
       to a list of a different length -- and then nothing reads the DOM
       again, so the browser lays out once and the rest is handed
       straight to the compositor. */
    const nodes: HTMLElement[] = [];
    const tops: number[] = [];
    const margin = window.innerHeight * BAND;
    for (const i of slots) {
      const node = grid.children[i] as HTMLElement | undefined;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.bottom <= -margin || rect.top >= window.innerHeight + margin) continue;
      nodes.push(node);
      dirty.current.add(node);
      tops.push(rect.top);
    }
    const rows = rowRanks(tops);

    for (let k = 0; k < nodes.length; k++) {
      const node = nodes[k];
      node.style.willChange = "transform, opacity";
      node.style.opacity = "0";
      node.style.transform = `translateY(${RISE_PX}px)`;
      animate(
        node,
        { opacity: [0, 1], transform: [`translateY(${RISE_PX}px)`, "translateY(0px)"] },
        {
          duration: IN_MS / 1000,
          delay: (Math.min(rows[k], IN_STEP_CAP) * IN_STEP_MS) / 1000,
          ease: EASE_OUT_SMOOTH,
          onComplete: () => {
            dirty.current.delete(node);
            node.style.willChange = "";
            node.style.opacity = "";
            node.style.transform = "";
          },
        }
      );
    }
  }, [shown]);

  return (
    /* Keyed by SLOT, not by person, and that is load-bearing rather than
       lazy: a card holds no state of its own, and an index key is what
       lets React update the contents of the element already standing
       there instead of moving nodes around the grid -- which is both
       cheaper and the only way the slot can fade out and back in as one
       continuous thing. `ProfileCard` is memoised, so a slot whose
       occupant did not change does not re-render either. */
    /* No gap below sm: there the cards are borderless rows, and a 16px
       gutter between rows in a plain series reads as things drifting
       apart. From sm up they are boxed cards in a grid and need the
       gutter back. */
    <div ref={gridRef} className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {shown.map((user, i) => (
        <ProfileCard key={i} user={user} />
      ))}
    </div>
  );
}
