import type { Prisma } from "@/generated/prisma/client";
import { mentionsAsNames } from "./rich-text.ts";

/* ------------------------------------------------------------------ *
 *  "Download your data": what the file holds, what it leaves out and
 *  why, and how it is written. The parts that need no database, so the
 *  unit tests hold the exact logic the route runs (the split
 *  purge-rule.ts and post-visibility-rule.ts make). The route,
 *  src/app/api/account/export/route.ts, reads the rows.
 *
 *  The file is everything the site keeps about the member (the owner's
 *  ruling, bug audit 3 Q24): every column of their own row, a section
 *  for every table that belongs to them, and what the site recorded
 *  about them (visits, searches, pages opened, the bell, the entry
 *  questions). It used to carry ten hand-written sections, each added
 *  when somebody remembered, and missed their hearts on photographs and
 *  answers, their bookmarks, poll votes and profession tags, and every
 *  record of their visits (T6-03). Now account-export-rule.test.mjs
 *  walks the User model: a column or a relation that is neither carried
 *  nor named in LEFT_OUT, with its reason, fails the build.
 * ------------------------------------------------------------------ */

/** Every column of the member's own row the file carries: all of them except
 *  the ones LEFT_OUT names. */
export const EXPORT_PROFILE = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  displayEmail: true,
  showEmail: true,
  phone: true,
  phones: true,
  instagram: true,
  linkedin: true,
  facebook: true,
  links: true,
  bio: true,
  about: true,
  workplace: true,
  jobTitle: true,
  // What the directory files them under, judged from the two above by a
  // hand-run pass, and the pair it was judged from: the one column that is a
  // judgement ABOUT the member rather than something they typed.
  professionTags: true,
  professionTagSource: true,
  accountType: true,
  batchType: true,
  batchYear: true,
  yearJoined: true,
  yearLeft: true,
  gradeJoined: true,
  admissionNumber: true,
  taughtFrom: true,
  taughtUntil: true,
  subjects: true,
  houses: true,
  currentCity: true,
  secondaryCity: true,
  photoUrl: true,
  coverPhoto: true,
  birdOverride: true,
  birdPickedAt: true,
  theme: true,
  role: true,
  verifyState: true,
  verifyStateAt: true,
  verifiedAt: true,
  verifyMethod: true,
  photoTrusted: true,
  isBlocked: true,
  deletionRequestedAt: true,
  consentAt: true,
  lastSeenAt: true,
  feedSeenAt: true,
  guideSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

/**
 * Each of the member's own tables, by its relation on User, and the name its
 * section has in the file, in the order the file writes them: what they wrote,
 * what they chose, their money, then what the site recorded about them.
 */
export const EXPORT_SECTIONS = [
  ["places", "places"],
  ["posts", "posts"],
  ["comments", "comments"],
  ["catchupEntries", "catchupAnswers"],
  ["catchupPrompts", "catchupQuestions"],
  ["photos", "collectionPhotos"],
  ["adminThreads", "conversationsWithAdmins"],
  ["adminMessages", "messagesWithAdmins"],
  ["likes", "likes"],
  ["commentLikes", "commentLikes"],
  ["photoLoves", "photoLoves"],
  ["catchupLoves", "catchupLoves"],
  ["pollVotes", "pollVotes"],
  ["bookmarks", "bookmarks"],
  ["groupMemberships", "catchupMemberships"],
  ["catchupPrefs", "catchupSettings"],
  ["catchupsKept", "catchupsStarted"],
  ["createdGroups", "groupsStarted"],
  ["catchupReads", "editionsRead"],
  ["reports", "reportsFiled"],
  ["approvedPhotos", "photosApproved"],
  ["contributions", "contributions"],
  ["notifications", "notifications"],
  ["outboundMail", "emailsSent"],
  ["contentViews", "pagesOpened"],
  ["searches", "searches"],
  ["visits", "visits"],
  ["triviaEvents", "entryQuestions"],
] as const;

export type ExportSectionName = (typeof EXPORT_SECTIONS)[number][1];

/**
 * What the file leaves out on purpose, and why. Written into the file itself
 * (`leftOut`), so the member reads it there. A bare key is a column or a
 * relation on User; `relation.column` is one column of a section the file does
 * carry. Columns that are only machinery (a queue's retry count, a generated
 * sort key) are neither exported nor listed: they say nothing about anybody.
 */
export const LEFT_OUT = {
  password:
    "The stored form of your password. It is a lock rather than information about you, and a copy outside the site would only help someone trying to get in.",
  credentialVersion:
    "A counter the site raises to sign every device out at once. It is part of the lock, not information about you.",
  authTokens:
    "The links the site emails to confirm an address or reset a password. Each one signs in to the account until it is used or expires.",
  adminNote: "The admins' own working note on an account, kept for moderation.",
  reportsAgainst:
    "Reports other members filed about this account. Each one would show who filed it, and that has to stay private.",
  "photos.heldAt": "The admins' own mark on a photograph they have set aside to look at later.",
  "catchupsKept.inviteToken":
    "The invitation key of a Catch-up you started. Anyone holding it can join, so it stays on the site.",
  "outboundMail.payload":
    "The text of each email. A sign-in or reset email carries a working link, so only the record of what was sent is here.",
} as const;

/** Rows per query while walking a table. Big enough that an ordinary member is
 *  one round trip a section, small enough that no page is a memory problem. */
export const EXPORT_PAGE = 500;

/** The last words of a file whose stream failed part of the way through. */
export const EXPORT_PROBLEM =
  "This file stopped early: the site met an error part of the way through, so it holds only what is above this line. The error has been reported. Please download your data again later.";

/* ------------------------------------------------------------------ *
 *  Labels: a row that points at something outside the file
 *
 *  Every row keeps its id, so a comment on the member's own post matches
 *  that post's id in `posts`. A comment, a heart or a bookmark on somebody
 *  else's post has nothing in the file to match, so it carries a few words
 *  of what it was on: the letter's title, or the first words of a post.
 * ------------------------------------------------------------------ */

/** The first few words of some text, on one line. */
export function firstWords(text: string | null | undefined, max = 80): string {
  const line = mentionsAsNames(text).replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** What a post or letter was, in a few words, for a row that points at it. */
export function postLabel(
  post: { kind: string; title: string | null; content: string } | null | undefined
): string | null {
  if (!post) return null;
  if (post.kind === "letter") return `Letter: ${firstWords(post.title?.trim() || post.content)}`;
  return `Post: ${firstWords(post.content)}`;
}

/* ------------------------------------------------------------------ *
 *  Writing the file
 * ------------------------------------------------------------------ */

/** One collection in the file. */
export type ExportSection = {
  name: string;
  /** The rows after `after` (from the first when null), in key order, at most
   *  `pageSize` of them. */
  page: (after: string | null) => Promise<Record<string, unknown>[]>;
  /** The value the next page starts after: the row's id, unless its table has
   *  no id of its own. */
  key?: (row: Record<string, unknown>) => string;
};

/** A value indented to sit at the file's second level. */
function nested(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/\n/g, "\n  ");
}

/**
 * The file, as text, a piece at a time: the head's keys, then each section a
 * page at a time, then `"complete": true`.
 *
 * A generator, so the route can stream it with backpressure: it pulls the next
 * piece only when the response has taken the last, so neither the database
 * side nor the stream's queue ever holds more than a page (audit M48). The
 * stream used to push every row as fast as the database answered, whatever
 * the network took, so "neither end holds it all" was true of the database
 * alone (bug audit 3, C2-02, folded into T6-03).
 *
 * A failure part of the way through can no longer change the status code, the
 * headers having gone with the first byte. It used to end the download early
 * with a file that would not parse and nothing to say why. Now the open
 * section is closed and the file ends with `"complete": false` and
 * EXPORT_PROBLEM: still a JSON file, saying in so many words that it is not
 * all there. `onError` reports the cause.
 */
export async function* exportDocument(opts: {
  head: Record<string, unknown>;
  sections: readonly ExportSection[];
  pageSize?: number;
  onError: (err: unknown) => void;
}): AsyncGenerator<string, void, undefined> {
  const pageSize = opts.pageSize ?? EXPORT_PAGE;
  yield "{\n";
  for (const [key, value] of Object.entries(opts.head)) {
    yield `  ${JSON.stringify(key)}: ${nested(value)},\n`;
  }
  /* What closes the section being written, while one is open: an empty
     array closes on the same line, a written one on its own. */
  let open: string | null = null;
  try {
    for (const section of opts.sections) {
      const keyOf = section.key ?? ((row: Record<string, unknown>) => String(row.id));
      yield `  ${JSON.stringify(section.name)}: [`;
      open = "]";
      let after: string | null = null;
      for (;;) {
        const rows = await section.page(after);
        if (rows.length > 0) {
          let text = "";
          for (const row of rows) {
            text += `${open === "]" ? "" : ","}\n    ${JSON.stringify(row)}`;
            open = "\n  ]";
          }
          yield text;
        }
        if (rows.length < pageSize) break;
        after = keyOf(rows[rows.length - 1]);
      }
      yield `${open},\n`;
      open = null;
    }
    yield '  "complete": true\n}\n';
  } catch (err) {
    opts.onError(err);
    yield `${open ? `${open},\n` : ""}  "complete": false,\n  "problem": ${JSON.stringify(EXPORT_PROBLEM)}\n}\n`;
  }
}
