/* ------------------------------------------------------------------ *
 *  A question the group votes on: the rules, with nothing to import.
 *
 *  Catch-ups rework, build phase 13 (spec 3.11). A vote is an ordinary
 *  question whose category is "vote", with two to six fixed choices in
 *  `CatchupPromptOption`, and a vote is an ordinary answer with
 *  `CatchupEntry.pollOptionId` set. Everything the SERVER decides about
 *  one is here, as plain functions over plain data, so
 *  `vote-question-rule.test.mjs` can run them with bare `node`
 *  (docs/TRAPS.md, "A testable module must have no relative VALUE
 *  imports"). Which is also why `VOTE_CATEGORY` is written out here
 *  rather than imported from catchups-types.ts; the test reads that file
 *  and fails if the two stop agreeing.
 * ------------------------------------------------------------------ */

/** The category that makes a question a vote. `promptKind()` returns
 *  "vote" for it, the same mechanism photo-wall and songs use, so a vote
 *  needs no column saying what kind of question it is. */
export const VOTE_CATEGORY = "vote";

/** His answer 37: "whoever writes the question writes two to six choices."
 *  One choice is not a vote, and past six the choices stop being something
 *  a phone can show without scrolling past the question. */
export const VOTE_MIN_CHOICES = 2;
export const VOTE_MAX_CHOICES = 6;

/** A choice is a name or a short phrase, not a sentence. Eighty is the
 *  Catch-up name's own cap, the nearest thing in the app to "a label
 *  somebody typed". The question itself stays at 300. */
export const VOTE_CHOICE_MAX = 80;

export type VoteVerdict<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * The choices a question may be written with.
 *
 * Blank rows are dropped before counting, because a form with a third empty
 * field is two choices and a spare field, not a broken vote. Duplicates are
 * compared without case, since "Yes" and "yes" is one choice twice. A
 * question that is not a vote may not carry choices at all: they would be
 * rows nothing draws.
 */
export function decideVoteChoices(
  category: string | null | undefined,
  raw: unknown
): VoteVerdict<{ choices: string[] }> {
  if (raw !== undefined && raw !== null && !Array.isArray(raw)) {
    return { ok: false, error: "Those choices could not be read." };
  }
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  if (list.some((c) => typeof c !== "string")) {
    return { ok: false, error: "Those choices could not be read." };
  }
  const choices = (list as string[]).map((c) => c.trim()).filter((c) => c.length > 0);

  if (category !== VOTE_CATEGORY) {
    return choices.length > 0
      ? { ok: false, error: "Only a vote has choices." }
      : { ok: true, choices: [] };
  }

  if (choices.length < VOTE_MIN_CHOICES) {
    return { ok: false, error: "A vote needs at least two choices." };
  }
  if (choices.length > VOTE_MAX_CHOICES || list.length > VOTE_MAX_CHOICES * 2) {
    return { ok: false, error: "A vote can have up to six choices." };
  }
  if (choices.some((c) => c.length > VOTE_CHOICE_MAX)) {
    return { ok: false, error: `Keep each choice under ${VOTE_CHOICE_MAX} characters.` };
  }
  const seen = new Set<string>();
  for (const c of choices) {
    const key = c.toLocaleLowerCase();
    if (seen.has(key)) return { ok: false, error: "Two of the choices are the same." };
    seen.add(key);
  }
  return { ok: true, choices };
}

/** A cuid is 25 characters; anything much longer is not one of ours. */
export const MAX_CHOICE_ID = 64;

/**
 * What an answer to a question may carry, where a pick is involved.
 *
 * - Not a vote: no pick, ever. A pick on a text question would be an id that
 *   no choice has, and the foreign key would refuse it with no sentence.
 * - A vote: the pick is ALWAYS sent, a choice's id or `null`. `null` takes the
 *   vote back, and the line beside it goes too, because a line with no pick
 *   is a remark about nothing. Leaving the pick out is refused rather than
 *   read as "keep what was there", so a caller cannot write a line onto a
 *   vote it never cast.
 * - A vote carries a pick and optionally a line. No photographs, no
 *   recording, no song: the result draws people beside choices, and there is
 *   nowhere in it to put a picture.
 *
 * Whether the chosen id belongs to THIS question is not decidable from here;
 * the action counts it inside the write's transaction, and the composite
 * foreign key refuses it again underneath.
 */
export function decideVoteAnswer(input: {
  isVote: boolean;
  pollOptionId: unknown;
  sendsImages: boolean;
  sendsRecording: boolean;
  sendsSong: boolean;
}): VoteVerdict<{ pick: string | null | undefined }> {
  const { isVote, pollOptionId } = input;
  if (!isVote) {
    return pollOptionId === undefined
      ? { ok: true, pick: undefined }
      : { ok: false, error: "This question isn't a vote." };
  }
  if (pollOptionId === undefined) {
    return { ok: false, error: "Pick one of the choices." };
  }
  if (
    pollOptionId !== null &&
    (typeof pollOptionId !== "string" || pollOptionId.length === 0 || pollOptionId.length > MAX_CHOICE_ID)
  ) {
    return { ok: false, error: "That choice isn't part of this question." };
  }
  if (input.sendsImages || input.sendsRecording || input.sendsSong) {
    return { ok: false, error: "A vote takes a pick and a line, nothing else." };
  }
  return { ok: true, pick: pollOptionId as string | null };
}

export type VoteChoiceRow = { id: string; text: string; position: number };

export type VoteAnswerRow<P> = {
  id: string;
  pollOptionId: string | null;
  body: string | null;
  author: P;
};

export type VoteResult<P> = Array<{
  choice: VoteChoiceRow;
  voters: Array<{ entryId: string; person: P; line: string | null }>;
}>;

/**
 * Who chose what, or nothing at all.
 *
 * NULL UNLESS THE EDITION IS PUBLISHED. Nothing in an Edition is readable
 * before it comes out (spec 3.13, closed as (a)), and for a vote that
 * includes how it is going: a count is a reading. So the one function that
 * turns rows into a result refuses to, rather than trusting every caller to
 * have checked first.
 *
 * Every choice is in the result, in the order the asker wrote them, including
 * one nobody picked: an unpicked choice is part of the answer. Voters keep the
 * order they arrive in, which the caller sets. There are no counts and no
 * percentages in the shape, on purpose (R32: "you're trying so hard to include
 * useless information"); a drawing that wants a number can count a list.
 */
export function voteResult<P>(
  editionStatus: string,
  choices: VoteChoiceRow[],
  answers: Array<VoteAnswerRow<P>>
): VoteResult<P> | null {
  if (editionStatus !== "published") return null;
  const byChoice = new Map<string, VoteResult<P>[number]["voters"]>();
  const ordered = [...choices].sort((a, b) => a.position - b.position);
  for (const c of ordered) byChoice.set(c.id, []);
  for (const a of answers) {
    if (!a.pollOptionId) continue;
    const voters = byChoice.get(a.pollOptionId);
    if (!voters) continue; // a pick for a choice this question does not have
    const line = a.body?.trim() || null;
    voters.push({ entryId: a.id, person: a.author, line });
  }
  return ordered.map((choice) => ({ choice, voters: byChoice.get(choice.id) ?? [] }));
}
