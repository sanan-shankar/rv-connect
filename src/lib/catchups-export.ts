/* ------------------------------------------------------------------ *
 *  The shape a whole Catch-up takes when it leaves the database.
 *
 *  ONE shape, two jobs, and that is the point.
 *
 *  1. `scripts/dev/export-catchups.mjs` writes it, so that no member's
 *     words or photographs can be lost by a migration. The owner set the
 *     test himself (brief ¶51): "any form of saving previous catch ups is
 *     good as long as they're totally regeneratable". So every field the
 *     app can render is here, and every image carries the FILE the
 *     exporter copied beside the JSON -- not just its url. A folder that
 *     needs the R2 bucket to still exist is a backup of a backup, not a
 *     rebuildable copy.
 *
 *  2. The lab rooms and the magazine engine READ it, from
 *     `src/app/lab/catchups/_fixtures/`. A direction room renders a real
 *     exported Edition and an invented pressure fixture through the same
 *     loader, so "does this design survive a 3,000-word answer" is
 *     answered by dropping a file in, not by writing a second renderer.
 *     (Campaign decisions D23, D30, D33, D35.)
 *
 *  Deliberately NOT the Prisma row shape. Ids are kept so an export can be
 *  matched back to the database, but every foreign key that a reader would
 *  have to resolve is denormalised to the name beside it: a fixture must be
 *  readable and editable by hand, and a renderer must not need a `User`
 *  table to draw an author. That costs some duplication and buys a file
 *  that opens in any editor and means something.
 *
 *  Dates are ISO strings, never Date. This crosses a JSON boundary in both
 *  directions and `computeStatus` already accepts `Date | string`.
 * ------------------------------------------------------------------ */

import type {
  Cadence,
  CatchupStatus,
  EditionStatus,
  PromptKind,
  PromptSource,
  ReminderMode,
} from "./catchups-types";

/** Bumped only when a field is removed or changes meaning. A reader that
 *  does not recognise the version should refuse rather than guess. */
export const CATCHUP_EXPORT_VERSION = 1;

export type CatchupExportFile = {
  version: typeof CATCHUP_EXPORT_VERSION;
  /** When the export ran. */
  takenAt: string;
  /** `live` came out of the database; `fixture` was written by hand for
   *  pressure testing and never described a real member. A room prints
   *  this, so nobody mistakes invented answers for real ones. */
  source: "live" | "fixture";
  /** Free text: which database, or what this fixture is for. */
  note: string | null;
  catchups: ExportedCatchup[];
};

/** Enough to draw somebody and name them, matching `IDENTITY_SELECT` plus the
 *  batch line the answer tile prints. `photoUrl` is exported as a copied file
 *  the same way an answer's photographs are. */
export type ExportedPerson = {
  id: string;
  name: string;
  batchYear: number | null;
  photoUrl: string | null;
  /** The bird glyph they pinned, if any; null means the deterministic one. */
  birdOverride: string | null;
  /** Relative path of the avatar's bytes inside the export folder, when the
   *  exporter copied them. Null for a fixture or an un-copied avatar. */
  photoFile?: string | null;
};

export type ExportedMembership = ExportedPerson & {
  /** "admin" is the Group's own role column, which is NOT the Keeper. */
  role: string;
  joinedAt: string;
  /** A Keeper of this Catch-up: `Catchup.createdById`, or a `GroupMember`
   *  promoted since. Denormalised because the reader draws a leaf for it. */
  isKeeper: boolean;
};

/** One member's private copy state, which is why archiving is personal.
 *  Exported because losing it would silently un-file every member's shelf.
 *  `deletedAt` was here until build phase 5, when deleting became leaving and
 *  the thirty-day bin went with the word; no row ever carried one. */
export type ExportedPref = {
  userId: string;
  reminderMode: ReminderMode;
  archivedAt: string | null;
};

export type ExportedImage = {
  /** The url as the database holds it. */
  url: string;
  /** Relative path of the bytes inside the export folder, or null when the
   *  copy failed or was skipped. Null is recorded rather than dropped, so a
   *  restore can tell "no photograph" from "photograph we could not fetch". */
  file: string | null;
  bytes: number | null;
};

export type ExportedAnswer = {
  id: string;
  author: ExportedPerson;
  body: string | null;
  images: ExportedImage[];
  songUrl: string | null;
  songTitle: string | null;
  songArt: string | null;
  /** A recorded answer (build phase 12): the url, its length, whether the
   *  body was transcribed, and the copied bytes like a photograph's. Null
   *  when the answer was written, which is every answer before phase 12. */
  audio?: { url: string; seconds: number | null; transcribed: boolean; file: string | null } | null;
  /** A vote's pick, the id of one of its question's `choices` (build phase
   *  13). Null on every answer that is not a vote. */
  pollOptionId?: string | null;
  /** Who hearted it, by id. The count is `hearts.length`; it is not stored
   *  separately, so the two can never disagree. */
  hearts: string[];
  createdAt: string;
  updatedAt: string;
};

export type ExportedQuestion = {
  id: string;
  /** Null when the asker's account is gone; the app already draws that. */
  author: ExportedPerson | null;
  text: string;
  category: string | null;
  /** Derived from `category` by `promptKind`, carried so a fixture can set it
   *  directly without inventing a category id. */
  kind: PromptKind;
  source: PromptSource;
  /** A vote's fixed choices in the asker's order (build phase 13). Empty on
   *  every question that is not a vote. */
  choices?: Array<{ id: string; text: string; position: number }>;
  showAsker: boolean;
  accepted: boolean;
  position: number;
  createdAt: string;
  answers: ExportedAnswer[];
};

export type ExportedEdition = {
  id: string;
  number: number;
  theme: string | null;
  status: EditionStatus;
  questionsCloseAt: string | null;
  answersCloseAt: string | null;
  publishedAt: string | null;
  remindersSent: number;
  createdAt: string;
  questions: ExportedQuestion[];
};

export type ExportedCatchup = {
  id: string;
  /** The hidden Group this Catch-up hangs off. `batchYear` is non-null only
   *  on a real batch group, which is the whole of B1: a Catch-up whose group
   *  has a null batchYear is a people-Catch-up, however it is named. */
  groupId: string;
  groupName: string;
  batchYear: number | null;
  title: string | null;
  intro: string | null;
  cadence: Cadence;
  status: CatchupStatus;
  createdById: string | null;
  /** Deliberately NOT exported: `Catchup.inviteToken` is a bearer token.
   *  Whoever holds an export folder would otherwise hold the ability to join
   *  every Catch-up in it. A restore mints a fresh one. */
  nextOpensAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: ExportedMembership[];
  prefs: ExportedPref[];
  editions: ExportedEdition[];
};

/** What a reader should check before trusting a file it was handed. Cheap,
 *  and it turns "the fixture silently rendered nothing" into a message. */
export function isCatchupExportFile(value: unknown): value is CatchupExportFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<CatchupExportFile>;
  return (
    file.version === CATCHUP_EXPORT_VERSION &&
    typeof file.takenAt === "string" &&
    (file.source === "live" || file.source === "fixture") &&
    Array.isArray(file.catchups)
  );
}

/** Every answer in a file, flattened, which is what most callers actually
 *  want: "render every answer" and "count the photographs" both start here. */
export function everyAnswer(file: CatchupExportFile): ExportedAnswer[] {
  return file.catchups.flatMap((c) =>
    c.editions.flatMap((r) => r.questions.flatMap((q) => q.answers))
  );
}

/** The counts a session quotes when it says an export is complete. */
export function exportTotals(file: CatchupExportFile) {
  const answers = everyAnswer(file);
  return {
    catchups: file.catchups.length,
    editions: file.catchups.reduce((n, c) => n + c.editions.length, 0),
    questions: file.catchups.reduce(
      (n, c) => n + c.editions.reduce((m, r) => m + r.questions.length, 0),
      0
    ),
    answers: answers.length,
    answersWithPhotos: answers.filter((a) => a.images.length > 0).length,
    photos: answers.reduce((n, a) => n + a.images.length, 0),
    hearts: answers.reduce((n, a) => n + a.hearts.length, 0),
    members: file.catchups.reduce((n, c) => n + c.members.length, 0),
  };
}
