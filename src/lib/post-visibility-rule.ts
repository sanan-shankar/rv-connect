/* ------------------------------------------------------------------ *
 *  The visibility rule itself: who may see a post, as a pure function.
 *
 *  Split out from post-visibility.ts, which does the database work, for one
 *  reason: this is the security decision, and a security decision that cannot
 *  be tested is a security decision nobody will notice breaking. The audit's
 *  H17 finding was that 97,500 lines carried 14 unit tests and none of them
 *  touched authorization. This file has no imports at all, so a plain .mjs
 *  test can import it and try every case, including the ones that would be
 *  laborious to set up against a real database.
 *
 *  It takes the one fact it cannot work out for itself -- whether the viewer
 *  matches the post's cityScope -- as an argument. The caller fetches it.
 * ------------------------------------------------------------------ */

export type PostViewer = {
  id: string;
  role?: string | null;
  batchType?: string | null;
  batchYear?: number | null;
};

type DenialReason =
  | "not-found"
  | "hidden"
  | "draft"
  | "other-city"
  | "other-batch"
  | "author-blocked";

export type GuardedPost = {
  id: string;
  authorId: string;
  cityScope: string | null;
  targetBatches: string | null;
  isHidden: boolean;
  status: string | null;
  /** Whether the author is currently blocked (owner decision, audit Low 78).
   *  Optional so a caller that has not fetched it is treated as "in good
   *  standing" rather than silently hiding everything. */
  authorIsBlocked?: boolean;
};

export type PostVisibility =
  | { ok: true; post: GuardedPost }
  | { ok: false; reason: DenialReason };

/** The one fact the rule needs but cannot derive.
 *
 *  It was two until 2026-09-07: `isGroupMember` decided a post carrying a
 *  `groupId`. That column had been NULL on every row since Groups were retired
 *  (0 of 20 on production and on the demo, refactor audit 2 / D6), no write
 *  path could set it, and it is gone from the schema -- so the branch it fed
 *  could never fire. City scope and batch targeting are the whole of a post's
 *  audience now. */
export type VisibilityFacts = {
  /** Does the viewer have a UserPlace matching the post's cityScope? Only
   *  consulted when the post has a cityScope. */
  cityMatches: boolean;
};

/* ------------------------------------------------------------------ *
 *  Batch TARGETS: the audience list on a post.
 *
 *  `Post.targetBatches` is a comma list of "ISC-2004" keys. It lives here
 *  rather than beside the other batch helpers because this file is the one
 *  that decides what a target list MEANS, and the write path must agree with
 *  the read path by construction, not by two people remembering.
 *
 *  It had no cap and no shape (`z.string().optional()` in postSchema), and
 *  createPost stored it exactly as the client sent it -- the only field on
 *  that action that did. Server actions are public HTTP endpoints, so a member
 *  scripting one could put megabytes into a column that every feed query
 *  LIKE-scans and every interaction re-reads (audit M43).
 * ------------------------------------------------------------------ */

/** The board credentials a batch key can carry (User.batchType's values). */
const BATCH_TYPES = ["ISC", "ICSE"];

/**
 * How many batches one post may be aimed at.
 *
 * A member belongs to exactly one batch, so a list longer than this is not an
 * audience, it is somebody filling a column. Forty is comfortably more than
 * anyone would ever pick by hand.
 */
export const MAX_BATCH_TARGETS = 40;

/** The key identifying one viewer's batch, or null if they have no batch. */
export function batchTargetKey(
  batchType: string | null | undefined,
  batchYear: number | null | undefined
): string | null {
  const type = BATCH_TYPES.find((t) => t === batchType?.trim().toUpperCase());
  /* Exactly four digits. The shape IS the cap: no token can outgrow it, and
     no stored key can be a strict prefix of a longer one. */
  const year = typeof batchYear === "number" && /^\d{4}$/.test(String(batchYear))
    ? String(batchYear)
    : null;
  return type && year ? `${type}-${year}` : null;
}

/**
 * Read a target list. Returns the normalised keys, or null if the text is not
 * a target list at all -- the answer that lets a write path REFUSE instead of
 * storing something no reader can act on.
 *
 * Empty text parses to an empty list, which is the ordinary "everyone" case;
 * only genuinely malformed text returns null.
 */
export function parseBatchTargets(raw: string | null | undefined): string[] | null {
  if (raw === null || raw === undefined) return [];
  const text = raw.trim();
  if (!text) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of text.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const dash = token.lastIndexOf("-");
    const year = Number(token.slice(dash + 1));
    const key =
      dash > 0 && /^\d{4}$/.test(token.slice(dash + 1))
        ? batchTargetKey(token.slice(0, dash), year)
        : null;
    if (key === null) return null;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length > MAX_BATCH_TARGETS) return null;
  }
  return out;
}

/**
 * The value to STORE for a target list: normalised and de-duplicated, or null
 * for "everyone".
 *
 * Only ever called with text `postSchema` has already accepted, which is why
 * an unreadable list can fold into "everyone" here without widening anybody's
 * audience: it cannot arrive. Keep that true -- if the schema's refine is ever
 * loosened, this is the second place to look.
 */
export function storedBatchTargets(raw: string | null | undefined): string | null {
  const targets = parseBatchTargets(raw);
  return targets && targets.length > 0 ? targets.join(",") : null;
}

/**
 * Is this viewer's batch in this post's target list? Token-exact.
 *
 * A plain `stored.includes(key)` -- which is what this rule used to do --
 * also matched a stored "ISC-20111" against a viewer whose key is "ISC-2011",
 * showing a post to a batch it was not written for.
 */
export function batchTargetsInclude(
  stored: string | null | undefined,
  key: string | null
): boolean {
  if (!key) return false;
  const targets = parseBatchTargets(stored);
  /* Unparseable text names nobody. A stored value this rule cannot read is not
     a value an audience should be derived from. */
  if (targets === null) return false;
  return targets.includes(key);
}

/* ONE message for every refusal, including "no such post". Distinguishing them
   would turn any caller into an oracle: "not a member of that group" confirms
   both that the group exists and that this id belongs to it, which is exactly
   the fact being protected. The specific reason stays server-side. */
export const POST_NOT_VISIBLE = "That post is not available.";

export function decidePostVisibility(
  post: GuardedPost,
  viewer: PostViewer,
  facts: VisibilityFacts
): PostVisibility {
  /* Admins see everything -- the same exemption loadPosts makes by skipping
     the cityScope fragment entirely for an admin viewer.

     INCLUDING an unpublished draft. That is a deliberate, gated decision (see
     "an admin sees everything" in post-visibility-rule.test.mjs), not an
     oversight -- but it is worth knowing it is a decision, because a draft is
     private writing that has never had an audience, and `deleteDraft` used to
     assert the opposite of what happens here (audit C-012). The comment there
     is now correct; if the owner would rather drafts were private from admins
     too, this is the one line to move and that test is the one to change. */
  if (viewer.role === "admin") return { ok: true, post };

  /* Your own post is always yours, including a draft you are still editing.
     Checked BEFORE isHidden on purpose: an author whose post an admin has
     hidden can still reach it to delete or edit it, which is the only way
     they could respond to the moderation at all.

     `loadPosts` did NOT mirror this until 2026-08-21 (audit M30), so a post
     aimed at another city or another batch was reachable at its own URL and
     yet absent from its own author's feed. The two now agree. */
  if (post.authorId === viewer.id) return { ok: true, post };

  /* A blocked member's writing leaves the feed with them, and a direct link
     has to agree or the rule and the list say different things -- which is the
     shape of M30 and M31 all over again (owner decision, audit Low 78).
     
     Below the admin exemption on purpose: a moderator following a link from
     /admin/content lands on the post itself, which is where they act on it.
     Below the author exemption too, though a blocked account cannot sign in to
     use it. */
  if (post.authorIsBlocked) return { ok: false, reason: "author-blocked" };

  if (post.isHidden) return { ok: false, reason: "hidden" };

  /* Everyone else is refused a draft outright: loadPosts applies
     PUBLISHED_ONLY with no exception, so an unpublished letter has never been
     visible in any feed, and it must not become reachable by id either. */
  if (post.status !== "published") return { ok: false, reason: "draft" };

  if (post.cityScope && !facts.cityMatches) {
    return { ok: false, reason: "other-city" };
  }

  /* Batch targeting, mirroring loadPosts' top-level OR: no targets at all
     means everyone, otherwise the viewer's own "ISC-2011"-shaped key must
     appear in the stored list. */
  if (post.targetBatches) {
    const key = batchTargetKey(viewer.batchType, viewer.batchYear);
    if (!batchTargetsInclude(post.targetBatches, key)) {
      return { ok: false, reason: "other-batch" };
    }
  }

  return { ok: true, post };
}
