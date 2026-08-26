/**
 * The two shapes of "who wrote this" that this app reads out of User.
 *
 * `birdOverride: true` appeared inside 39 hand-typed `select` blocks across 25
 * files, in a handful of shapes that differ by a field in ways that read as
 * accidental rather than chosen. That is not only repetition: a renderer can
 * only draw what its query asked for, so a select that quietly omits
 * `verifyState` is a surface where the verified leaf cannot appear, and
 * nothing says so at the call site.
 *
 * Two shapes are real and are named here. Anything else spreads one of them
 * and adds what it needs, so the addition is visible in the diff:
 *
 *     select: { ...IDENTITY_SELECT, batchYear: true }
 *
 * NOT in posts.ts, whose banner is "Shared Post query fragments" and whose
 * three constants are all Post `where` clauses. These are User selects, and
 * most of the files reading them (messages, Catch-ups, the join page, admin)
 * have nothing to do with posts.
 */

/**
 * Enough to draw somebody and name them: an avatar and a link.
 *
 * `birdOverride` rides along with `photoUrl` everywhere, because a member with
 * no uploaded photo gets a deterministic bird and may have pinned a different
 * one -- so a query that reads the photo without the override draws the wrong
 * bird, not no bird.
 *
 * Deliberately carries no standing: no verified leaf, no batch line. The
 * surfaces using this one are lists of people in a room -- a Catch-up's
 * members, who has answered, a thread's participants -- where a row of badges
 * would be noise.
 */
export const IDENTITY_SELECT = {
  id: true,
  name: true,
  photoUrl: true,
  birdOverride: true,
} as const;

/**
 * Identity plus everything a byline draws: the verified leaf (`verifyState`
 * with `accountType`) and the batch line (`batchType`, `batchYear`).
 *
 * No `avatarColor`. Several of the shapes this replaces carried it, and
 * BirdAvatar's own banner says it "is accepted on the type for source
 * compatibility with existing callers but is intentionally ignored" -- the
 * bird drives its own colour. So it is a column read and passed down and never
 * drawn. The sites whose downstream types still demand it add it themselves,
 * where the addition is at least visible; whether the column lives at all is
 * the schema pass's question, not a dedupe's.
 */
export const AUTHOR_CARD_SELECT = {
  ...IDENTITY_SELECT,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
} as const;
