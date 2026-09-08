"use client";

/* ------------------------------------------------------------------ *
 *  The shelf on /catchups: the Catch-up cards, the Edition covers that
 *  fill the spare slots behind them, and what happens when one leaves.
 *
 *  ── why the shelf owns archiving, and not the card ──
 *
 *  It started on the card, and that was the wrong altitude twice over.
 *  A card cannot animate its own exit: the moment it decides it is gone
 *  it stops rendering, and there is nothing left to animate. And the
 *  Undo in the toast outlives the card that raised it -- pressing it
 *  brings the Catch-up back, which the unmounted card can no longer be
 *  told about. Membership of a shelf is the shelf's fact. A card is a
 *  card.
 *
 *  ── the animation, and why this one ──
 *
 *  His, 2026-09-08: "can you have a pretty and thoughtful animation for
 *  the archiving of ccatchups basically the appearing and disappearing
 *  of any of those cards on that screen. we need that level of attention
 *  to detail throughout."
 *
 *  A card that is archived goes to the quiet row at the FOOT of this
 *  page, so it leaves downward: it settles 18px, shrinks to 0.94 and
 *  fades, over 260ms. Not upward, not sideways, not a puff -- the
 *  direction is the one piece of information an exit can carry, and here
 *  it is true. `Put back` is the same move reversed, on the app's own
 *  gentle spring, so the two read as one gesture and its undo.
 *
 *  `mode="popLayout"` is what makes it feel considered rather than
 *  sequential: the leaving card comes out of the grid's flow at once, so
 *  the cards after it start sliding up WHILE it is still fading, instead
 *  of waiting for it to finish and then jumping. `layout="position"`
 *  rather than `layout` is deliberate -- every card here is the same
 *  size, so only positions ever change, and position-only leaves the
 *  photograph inside untouched (a full layout animation scale-corrects
 *  its children, which is how a card-sized image gets visibly squashed
 *  mid-flight).
 *
 *  `initial={false}` on the presence: arriving at this page is not an
 *  event, so the shelf is simply there. Only a genuine change animates.
 *  The one that is worth watching for: archiving a Catch-up frees a slot,
 *  so an Edition cover ARRIVES in the gap the card left, on the same
 *  spring, as the survivors slide up around it.
 * ------------------------------------------------------------------ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { EASE_IN_OUT_SCENE, EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { callAction } from "@/lib/call-action";
import { setCatchupArchived } from "@/app/(main)/catchups/actions";
import { CatchupCard, type ListCatchup } from "./catchup-card";
import { EditionCoverCard, type ListEdition } from "./edition-cover-card";
import { LIST_GRID } from "./picture-door";

/** Down and a little smaller, because down is where an archived Catch-up
 *  actually goes.
 *
 *  THE EXIT CARRIES ITS OWN CURVE, and the number came from watching it. Left
 *  on the shelf's spring the fade ran on the app's default ease-out, which is
 *  front-loaded: measured at 1440, the card was at 66% opacity after 30ms and
 *  21% after 100ms, while the cards around it took 400ms to finish sliding
 *  into its place. It had vanished before it had visibly gone anywhere, so the
 *  move was doing no work. EASE_IN_OUT_SCENE starts slowly -- it is the app's
 *  own scene-change curve, and a card leaving a shelf is a small scene change
 *  -- so at 130ms it is still half there, in the middle of its drop, with the
 *  shelf closing up around it. */
const CARD_MOTION = {
  initial: { opacity: 0, scale: 0.96, y: 14 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 18,
    transition: { duration: 0.26, ease: EASE_IN_OUT_SCENE },
  },
};

/** The spring moves things; the fade waits its turn.
 *
 *  Archiving a Catch-up frees a slot, so in the same beat one cover leaves the
 *  shelf and a different one arrives in the cell it vacated. Fading both at
 *  once put two dates on top of each other, legible through one another, for a
 *  quarter of a second -- looked at, at 1440. The 140ms hold lets the leaving
 *  one get most of the way out before its replacement starts to show, so the
 *  cell reads as one thing becoming another rather than as two things at half
 *  strength. Only the OPACITY waits: the spring that carries the survivors
 *  into their new places starts immediately, which is the whole point of
 *  popLayout. */
const ITEM_TRANSITION = {
  ...SPRINGS.gentle,
  opacity: { delay: 0.14, duration: 0.26, ease: EASE_OUT_SMOOTH },
};

export function CatchupShelf({
  cards,
  editions,
}: {
  cards: ListCatchup[];
  editions: ListEdition[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  /* Which cards have LEFT but whose server round trip has not landed yet.
     Without it the swipe snaps the card back into place and then deletes it a
     third of a second later, which reads as a bug. */
  const [leaving, setLeaving] = useState<string[]>([]);

  /* AND IT IS DROPPED THE MOMENT THE SERVER ANSWERS, which is the whole of the
     bug he found: "when put back an archived one the edition disappeared, the
     catch up didn't appear. it just disappeared from the archived list."

     Archiving hid the card here; **Put back** happens in a different component,
     at the foot of the page, and it re-renders the server, which correctly
     hands this shelf the Catch-up back. This list was still hiding it, because
     nothing ever took the id out again -- so the row left the Archived list,
     the card did not return, and the Edition cover that had been filling its
     slot correctly went away, which made the whole thing look like a
     disappearing act.

     So the optimistic hide lasts exactly as long as the server takes to
     disagree with it. A new list of ids from the server IS the answer, whatever
     it says: the card gone means the archive landed, the card back means
     somebody undid it. Adjusted during render rather than in an effect, which
     is React's own advice for state derived from props -- an effect would paint
     the wrong frame first, and that frame is the bug. */
  const signature = cards.map((c) => c.catchupId).join(",");
  const [answered, setAnswered] = useState(signature);
  if (answered !== signature) {
    setAnswered(signature);
    setLeaving([]);
  }

  const visible = cards.filter((c) => !leaving.includes(c.catchupId));

  function archive(c: ListCatchup) {
    setLeaving((ids) => [...ids, c.catchupId]);
    start(async () => {
      const result = await callAction(() => setCatchupArchived(c.catchupId, true));
      if (result && "error" in result) {
        setLeaving((ids) => ids.filter((id) => id !== c.catchupId));
        toast.error(result.error);
        return;
      }
      // The undo is the point: archiving is a tidying gesture and the row it
      // lands in is a closed disclosure at the foot of the page.
      toast.success(`${c.name} was archived.`, {
        action: {
          label: "Undo",
          onClick: () => {
            start(async () => {
              await callAction(() => setCatchupArchived(c.catchupId, false));
              router.refresh();
            });
          },
        },
      });
      router.refresh();
    });
  }

  return (
    <div className={LIST_GRID}>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((c) => (
          <m.div
            key={c.catchupId}
            layout="position"
            transition={ITEM_TRANSITION}
            {...CARD_MOTION}
          >
            <CatchupCard c={c} onArchive={() => archive(c)} />
          </m.div>
        ))}
        {editions.map((e) => (
          <m.div
            key={e.editionId}
            layout="position"
            transition={ITEM_TRANSITION}
            {...CARD_MOTION}
          >
            <EditionCoverCard e={e} />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
