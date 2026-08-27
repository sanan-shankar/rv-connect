/* ------------------------------------------------------------------ *
 *  Catch-up home: the view models this screen's server load builds and
 *  its client components render. Kept local to `home/` (WP4's exclusive
 *  ownership) rather than added to the shared `catchups-types.ts`
 *  (WP1's file) - nothing outside this screen consumes these shapes.
 *
 *  All dates arrive pre-serialized (ISO strings), matching the app's
 *  existing convention (see PostData.createdAt) for passing server data
 *  into client components.
 *
 *  Anonymity note: `HomePromptView.author` is `null` whenever the prompt
 *  is anonymous (`showAsker=false`) AND the viewer is not its author. The
 *  server load never sends another member's identity down for a question
 *  they asked anonymously - hiding it only in the UI would still leak it
 *  over the wire. `isOwn` lets the author see "You" regardless.
 * ------------------------------------------------------------------ */

import type { Cadence, CatchupStatus, EditionStatus, ReminderMode } from "@/lib/catchups-types";
import type { CatchupPromptSet } from "@/lib/catchups-core";

export type HomePersonRef = {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride?: string | null;
  /**
   * Holds Keeper powers: this Catch-up's creator, or anyone since given the hat
   * (`GroupMember.role`). Mirrors `isEffectiveKeeper` server-side; it decides
   * what the roster LABELS, never what anyone is allowed to do, which every
   * action re-derives from the database for itself.
   */
  isKeeper?: boolean;
  /** Started this Catch-up. Permanently a Keeper, so cannot be demoted or removed. */
  isCreator?: boolean;
};

// Kept in sync with the server ceiling, but the UI must NOT print it: the
// question count is shown as a plain "N questions in this round". The
// companion per-member pending cap went with the approval step it capped
// (2026-08-05): nothing pends, so nothing needed counting.

export type HomePromptView = {
  id: string;
  text: string;
  category: string | null;
  accepted: boolean;
  position: number;
  showAsker: boolean;
  isOwn: boolean;
  /** null when submitted anonymously and the viewer is not its author. */
  author: HomePersonRef | null;
};

export type HomeEditionView = {
  id: string;
  number: number;
  status: EditionStatus;
  questionsCloseAt: string | null;
  answersCloseAt: string | null;
  publishAt: string | null;
  publishedAt: string | null;
  /** Countdown-only copy used beside the Catch-up name in the page heading. */
  countdownLabel: string | null;
  /** collecting: every prompt the viewer may see. answering: frozen accepted prompts only. */
  prompts: HomePromptView[];
  /** Who has written in. The count is derived from this, not stored twice. */
  answeredAuthorIds: string[];
};

export type HomeArchiveRow = {
  editionId: string;
  number: number;
  publishedAt: string | null;
  contributorCount: number;
  /** A one-line teaser pulled from the most-loved answer, or null when the Round has none. */
  teaser: string | null;
};

export type CatchupHomeData = {
  catchupId: string;
  /** The shareable invite token. Null only for a row written before the column
   *  existed; the Keeper's invite card is simply absent in that case. */
  inviteToken: string | null;
  groupId: string;
  groupName: string;
  title: string;
  cadence: Cadence;
  catchupStatus: CatchupStatus;
  members: HomePersonRef[];
  viewer: {
    id: string;
    name: string;
    isKeeper: boolean;
    reminderMode: ReminderMode;
  };
  /** The latest Round, or null for the near-impossible edge of a Catchup with none yet. */
  edition: HomeEditionView | null;
  /** Every published Round, most recent first (spec 3.7, "vellum spines on a shelf"). */
  archive: HomeArchiveRow[];
  /** The built-in question library, threaded down once from the server (`CATCHUP_PROMPT_SETS`). */
  promptLibrary: CatchupPromptSet[];
};

export type CatchupHomeResult =
  | { kind: "not-found" }
  | { kind: "not-member"; groupId: string; groupName: string }
  | ({ kind: "ok" } & CatchupHomeData);
