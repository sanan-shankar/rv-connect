/* ------------------------------------------------------------------ *
 *  THE MECHANICAL HALF OF FIXING A CAPTION.
 *
 *  The owner, 2026-08-30: "i also want the captions to be fixed
 *  automatically in case it's not capitalised and stuff. not sure if you
 *  can do grammar through code but otherwise I can just run all the
 *  captions through a session and have it fix it. that part's fine."
 *
 *  So this is the part you CAN do through code, and it stops exactly
 *  where that stops. It fixes SHAPE: whitespace, the first letter, a
 *  lowercase "i". It does not fix words. It cannot reorder a clause,
 *  spell a name, or decide that "pottery section" wants an article,
 *  because a rule that guesses at meaning gets a member's own sentence
 *  wrong occasionally and there is no way to tell which occasions those
 *  were. Real grammar is the hand-run pass on his own subscription,
 *  which is a session reading the sentence -- docs/spec/hand-run-passes.md.
 *
 *  IT IS ONLY EVER APPLIED IN FRONT OF SOMEBODY. The review room tidies
 *  what a contributor typed and puts the result in an editable box, so
 *  every change this makes is on screen, beside the photograph, before
 *  anyone presses Approve. That is what lets the sentence-capital rule
 *  below be as bold as it is: a wrong capital is a VISIBLE wrong capital,
 *  one keystroke from being fixed. Running this silently on the way into
 *  the database would be a different thing entirely, and it is
 *  deliberately not wired into the contribute path -- rewriting what a
 *  member typed without showing them is what this project refuses to do
 *  everywhere else (tag-professions "never touches what a member typed").
 * ------------------------------------------------------------------ */

/** The word "i" standing on its own -- which covers "i'm" and "i've" too,
 *  since an apostrophe is not a word character, so the boundary falls after
 *  the i and the rest of the contraction is left alone.
 *
 *  The lookahead carves out the one case that would break: "i.e." is the only
 *  place a lone lowercase i is followed by a full stop and another letter, and
 *  turning it into "I.e." would be a fix that made things worse. */
const LONELY_I = /\bi\b(?!\.\p{L})/gu;

/** Spaces that are not the space key: non-breaking, en and em, ideographic.
 *  They arrive by the dozen from a paste out of Word or a phone keyboard, look
 *  exactly like a space on screen, and sort and search differently. */
const ODD_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

/** Zero-width space, non-joiner, joiner, and the byte-order mark. Invisible,
 *  and enough of them will make a caption fail a search for its own text. */
const INVISIBLES = /[\u200b\u200c\u200d\ufeff]/g;

/** A run of spaces or tabs, but NEVER a newline. */
const HORIZONTAL_RUN = /[^\S\n]+/g;

/** The start of a new sentence: after a full stop, or at the head of a line. */
const SENTENCE_START = /([.!?]\s+|\n[^\S\n]*)(\p{Ll})/gu;

/**
 * A caption with its shape fixed and its words untouched.
 *
 * Order matters: whitespace settles first so the sentence rule can assume
 * single spaces, and the very first letter is raised last so it survives
 * whatever the sentence rule did or did not do to it.
 */
export function tidyCaption(raw: string): string {
  let out = raw
    .replace(ODD_SPACES, " ")
    .replace(INVISIBLES, "")
    /* Runs of spaces collapse; NEWLINES DO NOT. A caption can be a list of
       names one to a line, and flattening that loses something a person meant.
       Three or more blank lines, though, is nobody meaning anything. */
    .replace(HORIZONTAL_RUN, " ")
    .replace(/[^\S\n]*\n[^\S\n]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    /* A space in front of its own punctuation is always a slip, never a
       style -- except before an opening bracket or a dash, which this does not
       touch. */
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();

  if (!out) return "";

  out = out.replace(LONELY_I, "I");

  /* THE FIRST LETTER OF EVERY SENTENCE. The abbreviation trap is real --
     "e.g. something" becomes "e.g. Something" -- and it is accepted rather
     than guarded, because the guard is a dictionary of abbreviations that
     would still be incomplete, and because what follows a full stop in a
     photograph's caption is very nearly always a new sentence or a proper
     noun, both of which wanted the capital anyway. The review room shows the
     result before it is saved; that is the guard. */
  out = out.replace(SENTENCE_START, (_, gap, letter) => gap + letter.toUpperCase());

  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Did tidying actually change anything? The review room says so out loud only
 *  when it did -- a note claiming a fix nobody made is worse than no note. */
export const captionNeedsTidying = (raw: string) => tidyCaption(raw) !== raw.trim();
