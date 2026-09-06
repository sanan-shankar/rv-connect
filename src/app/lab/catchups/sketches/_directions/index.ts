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

/* `pick` first, on purpose: it is the synthesis and the recommendation,
   and the three it is built out of come after it so the parts can be
   compared against the whole. `yearbook` last because it is the outlier. */
export const DIRECTIONS: SketchDirection[] = [pick, plate, spread, rider, yearbook];
