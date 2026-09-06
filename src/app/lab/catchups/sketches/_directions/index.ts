/* The directions, in the order they are worth looking at.
 *
 * Second pass, 2026-09-06, after the owner read the first ten: "As you can
 * see like 80% of the designs have just no taste at all. No critical
 * graphic designer reviewing or highly experienced ui/ux."
 *
 * What went, and why, so nobody rebuilds one by accident:
 *
 *   paged, whole-app    a question was a page. "Ideas where each question
 *                       is a separate page sucks. Let's not."
 *   letter              the name was signed under the answer. "I don't
 *                       like names at the bottom."
 *   conversation,       three drawings of one drawing: a card per answer
 *   room, transcript    under a heading, differing in ornament only. The
 *                       convergence he spotted, not three bets.
 *   calendar, shelf,    all three are about the Catch-up's HOME - a
 *   front-door          circled date, covers on a shelf, landing straight
 *                       in the Round. As readers they had nothing to say,
 *                       which is why they read as copies here. The ideas
 *                       are carried into the home work rather than lost.
 *   action-button       became `plate`, which keeps its one good idea (the
 *                       question printed on the Catch-up's green) and
 *                       almost nothing else.
 */
import type { SketchDirection } from "../_types";
import { pick } from "./pick";
import { plate } from "./plate";
import { spread } from "./spread";
import { rider } from "./rider";
import { yearbook } from "./yearbook";
import { frontDoor } from "./front-door";
import { calendar } from "./calendar";
import { conversation } from "./conversation";
import { paged } from "./paged";
import { shelf } from "./shelf";
import { room } from "./room";
import { transcript } from "./transcript";
import { wholeApp } from "./whole-app";
import { actionButton } from "./action-button";
import { letter } from "./letter";

/* `pick` first, on purpose: it is the synthesis and the recommendation,
   and the three it is built out of come after it so the parts can be
   compared against the whole. `yearbook` last because it is the outlier. */
/* The first pass, restored 2026-09-06 the same day it was cut. Owner: "are
   all the previous ones gone? they had a few things that we could use that
   are lacking from yours." Nothing was ever lost - the ten written
   directions are on disk in docs/planning/catchups-rework/directions/ and
   the code was one `git show` away - but a thing you cannot flick to is a
   thing you cannot point at, so they are back in the room behind the five.
   They inherit the fixed shell, so the stretched background is gone; every
   other fault he listed is still in them on purpose, because they are here
   to be harvested, not shipped. */
const EARLIER = [actionButton, calendar, shelf, frontDoor, conversation, room, paged, wholeApp, transcript, letter];

export const DIRECTIONS: SketchDirection[] = [
  pick,
  plate,
  spread,
  rider,
  yearbook,
  ...EARLIER.map((d) => ({ ...d, earlier: true as const })),
];
