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
import type { ListEdition } from "@/components/catchups/index/edition-cover-card";
import type { AnswerPromptData } from "@/components/catchups/answer/types";
import type { SettingsCatchup } from "@/components/catchups/settings/types";

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
// question count is shown as a plain "N questions in this Edition". The
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
  publishedAt: string | null;
  /** Countdown-only copy used beside the Catch-up name in the page heading. */
  countdownLabel: string | null;
  /** collecting: every prompt the viewer may see. answering: frozen accepted prompts only. */
  prompts: HomePromptView[];
  /** Who has written in. The count is derived from this, not stored twice. */
  answeredAuthorIds: string[];
};

/* `HomeArchiveRow` is gone. It carried an Edition NUMBER, a contributor
   COUNT and a quoted TEASER, and he deleted all three: "Why do we need to
   have the round 4?", R32 on counts, and the whole of "Fresh off the press"
   for the teaser rail. What replaces it is `ListEdition` -- the cover the
   /catchups list already draws -- so a published Edition has ONE
   representation in this app rather than "15 different ways in 15 different
   places" (brief 13, 39). */

export type CatchupHomeData = {
  catchupId: string;
  /** The shareable invite token. Null only for a row written before the column
   *  existed; the Keeper's invite card is simply absent in that case. */
  inviteToken: string | null;
  groupId: string;
  groupName: string;
  title: string;
  cadence: Cadence;
  /** When the rhythm opens the next Edition, ISO, or null when nothing is
   *  scheduled (paused, ended, or an Edition already running). The rail's
   *  "Start it now" prints it, because the date is what that button skips. */
  nextOpensAt: string | null;
  catchupStatus: CatchupStatus;
  /** The Catch-up's photograph and the `object-position` its crop is taken at.
   *  Never null: every Catch-up has one from the day it is made (spec 3.4), so
   *  there is no no-picture layout to draw. Nothing on this page RENDERS it
   *  yet -- the head is build phase 7 -- but the settings row that changes it
   *  ships in phase 3, and it has to show what it is changing. */
  picture: { src: string; focus: string };
  /** Is this the batch's own Catch-up? `Group.batchYear` is the whole test
   *  (F6). Every member now runs its cycle together (owner, 2026-09-27:
   *  "make everyone a keeper"), so this screen shows the same cycle
   *  controls it would for a people Catch-up's Keeper -- open answering,
   *  extend, nudge, close and publish, start the next Edition, hold and
   *  resume. What it still shows NONE of is a way to leave (the batch is
   *  the roster) or an invite link (there is nobody to invite). Every one
   *  of those is refused server-side too; this decides what is OFFERED,
   *  never what is allowed. */
  isBatch: boolean;
  members: HomePersonRef[];
  viewer: {
    id: string;
    name: string;
    /** The narrow, per-role signal only: this Catch-up's creator, or anyone
     *  individually given the Keeper hat. Never batch-aware -- a batch has
     *  no individual Keeper by construction, so this is always false there.
     *  The batch-inclusive cycle permission lives on `settings.canRun`
     *  instead; this field stays what `isEffectiveKeeper` says so the two
     *  cannot quietly drift into meaning the same thing. */
    isKeeper: boolean;
    /** May replace the picture. Wider than `isKeeper` on purpose: on a batch
     *  Catch-up anyone in the batch may, because it is reversible and
     *  destroys nothing. Mirrors `mayChangeCatchupPicture` server-side; it
     *  decides what this screen OFFERS, never what anyone is allowed to do,
     *  which `setCatchupPicture` re-derives from the database for itself. */
    canChangePicture: boolean;
    reminderMode: ReminderMode;
  };
  /** The latest Edition, or null for the near-impossible edge of a Catchup with none yet. */
  edition: HomeEditionView | null;
  /** The latest Edition as a COVER, when it has published. This is what the
   *  Edition region draws in the `published` state. */
  latest: ListEdition | null;
  /** The published Editions that are not `latest`, newest first: the sidebar. */
  earlier: ListEdition[];
  /** One line under the Edition region, right-aligned, or null when the thing
   *  above it already says everything (collecting, and anything on hold). */
  stateLine: string | null;
  /** The questions to answer, loaded only while the Edition is `answering`.
   *  Empty otherwise, so the composer is never handed a stale set. */
  answering: AnswerPromptData[];
  /** What the Settings door needs. Built server-side beside the permissions it
   *  reports, so this screen and the actions behind it cannot disagree about
   *  who may run what. */
  settings: SettingsCatchup;
  /** The built-in question library, threaded down once from the server (`CATCHUP_PROMPT_SETS`). */
  promptLibrary: CatchupPromptSet[];
};

export type CatchupHomeResult =
  | { kind: "not-found" }
  | { kind: "not-member"; groupId: string; groupName: string }
  | ({ kind: "ok" } & CatchupHomeData);
