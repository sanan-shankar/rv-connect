/* ------------------------------------------------------------------ *
 *  What the reader is handed.
 *
 *  A shape of its own rather than `PublishedEditionView` straight from the
 *  loader, for one reason: the loader is shared with the Catch-up home,
 *  which draws an Edition as a COVER (architecture 1), and the two want
 *  different things out of the same query. The page maps one to the other
 *  in a dozen lines, and the decisions that need making once -- who may be
 *  named under a question, what a question's kind is -- are made there
 *  rather than inside a component that renders eleven of them.
 * ------------------------------------------------------------------ */

import type { CatchupAskerReading, PromptKind } from "@/lib/catchups-types";
import type { EditionEntry } from "@/lib/catchups-edition-view";

/** Re-exported under the reader's own name so a component reads one word, and
 *  aliased rather than redeclared so there is exactly one definition of the
 *  three cases. */
export type ReaderAsker = CatchupAskerReading;

export type ReaderQuestion = {
  id: string;
  text: string;
  /** How this question was answered, which decides how its answers print:
   *  a `photo` question is a wall and gets the run (spec 10.1). */
  kind: PromptKind;
  /** Who to print under the heading, already decided.
   *
   *  A shape rather than a name because there are three cases and each one
   *  is a finding: a member who may be named; YOU, looking at a question you
   *  asked anonymously, where saying the word is what stops your own name
   *  reading like the anonymity having failed (audit M10); and a question
   *  asked anonymously by somebody else, where naming nobody at all left a
   *  reader to guess whether the asker was hidden or simply gone.
   *
   *  `askerVisible` has already run in the loader, so this is a rendering
   *  instruction and never a permission check. A component that re-decided it
   *  is how the home and the permalink came to disagree in the first place. */
  asker: ReaderAsker;
  entries: EditionEntry[];
};

export type ReaderEdition = {
  catchupId: string;
  /** Plain, no suffix (brief 25: "In the loop", not "In the loop catch-up"). */
  catchupName: string;
  publishedAt: Date | string;
  questions: ReaderQuestion[];
};
