/* ------------------------------------------------------------------ *
 *  Counts for the rows on this page, and only those.
 *
 *  A relation count in a Prisma select (`_count: { select: { likes: true } }`)
 *  does not count the rows it is attached to. Prisma 7 compiles it to a
 *  derived table joined back on the key,
 *
 *    LEFT JOIN (SELECT "postId", COUNT(*) FROM "Like" GROUP BY "postId") ...
 *
 *  and Postgres does not push the page's ids into that GROUP BY, so every
 *  feed page counted every like in the database, every Edition every heart,
 *  every Collection page every love (captured from the generated client and
 *  EXPLAINed, bug audit 3: T1-17, L5-03, T2b-13). The indexes the schema
 *  carries for exactly these counts (B-090) could not help a scan that
 *  touches every key.
 *
 *  Each function here asks the same question with the page's ids in the
 *  WHERE, so the work is the page's: `postId IN (...)` is what those indexes
 *  serve. Measured on production 2026-10-30: an Edition's hearts went from all
 *  606 rows read to the 52 on its answers; a Collection page of 40 from 82
 *  buffers to 1.
 *
 *  One row per item comes back, not one per heart: the tempting alternative,
 *  loading every like row and taking its length, costs nothing in statements
 *  but sends a popular post's whole list of likers on every view, and egress
 *  is the Supabase limit the dossier says arrives first (L5-07).
 *
 *  The filtered counts keep their filter: a comment is counted exactly when
 *  the thread would show it (VISIBLE_COMMENT, audit C-003).
 * ------------------------------------------------------------------ */
import "server-only";
import { prisma } from "@/lib/prisma";
import { VISIBLE_COMMENT } from "@/lib/posts";

/** How many of something one row on the page has; 0 for a row with none. */
export type CountOf = (id: string) => number;

const NONE: CountOf = () => 0;

function countOf(rows: { key: string | null; n: number }[]): CountOf {
  const byKey = new Map<string, number>();
  for (const r of rows) if (r.key) byKey.set(r.key, r.n);
  return (id) => byKey.get(id) ?? 0;
}

export type PostCounts = { comments: CountOf; likes: CountOf; votes: CountOf };

/** The comments a reader is shown and the hearts on each of these posts, and
 *  the votes on each of their poll options. */
export async function postCounts(
  posts: { id: string; pollOptions?: { id: string }[] }[]
): Promise<PostCounts> {
  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return { comments: NONE, likes: NONE, votes: NONE };
  const optionIds = posts.flatMap((p) => p.pollOptions?.map((o) => o.id) ?? []);
  const [comments, likes, votes] = await Promise.all([
    prisma.comment.groupBy({
      by: ["postId"],
      where: { postId: { in: ids }, ...VISIBLE_COMMENT },
      _count: { _all: true },
    }),
    prisma.like.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    // Most pages hold no poll, and then there is nothing to ask.
    optionIds.length
      ? prisma.pollVote.groupBy({
          by: ["pollOptionId"],
          where: { pollOptionId: { in: optionIds } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { pollOptionId: string; _count: { _all: number } }[]),
  ]);
  return {
    comments: countOf(comments.map((r) => ({ key: r.postId, n: r._count._all }))),
    likes: countOf(likes.map((r) => ({ key: r.postId, n: r._count._all }))),
    votes: countOf(votes.map((r) => ({ key: r.pollOptionId, n: r._count._all }))),
  };
}

/** The hearts on each of these Catch-up answers, and the comments a reader
 *  is shown under each. */
export async function entryCounts(entryIds: string[]): Promise<{ loves: CountOf; comments: CountOf }> {
  if (entryIds.length === 0) return { loves: NONE, comments: NONE };
  const [loves, comments] = await Promise.all([
    prisma.catchupEntryLove.groupBy({
      by: ["entryId"],
      where: { entryId: { in: entryIds } },
      _count: { _all: true },
    }),
    prisma.comment.groupBy({
      by: ["entryId"],
      where: { entryId: { in: entryIds }, ...VISIBLE_COMMENT },
      _count: { _all: true },
    }),
  ]);
  return {
    loves: countOf(loves.map((r) => ({ key: r.entryId, n: r._count._all }))),
    comments: countOf(comments.map((r) => ({ key: r.entryId, n: r._count._all }))),
  };
}

/** The hearts on every comment in a page of a thread: the page's top-level
 *  comments and their replies. Keyed on the roots rather than on the rows, so
 *  it can run beside the query that reads those rows instead of after it. */
export async function threadLikeCounts(rootIds: string[]): Promise<CountOf> {
  if (rootIds.length === 0) return NONE;
  const rows = await prisma.commentLike.groupBy({
    by: ["commentId"],
    where: { comment: { OR: [{ id: { in: rootIds } }, { parentId: { in: rootIds } }] } },
    _count: { _all: true },
  });
  return countOf(rows.map((r) => ({ key: r.commentId, n: r._count._all })));
}

/** The hearts on each of these Collection photographs. */
export async function photoLoveCounts(photoIds: string[]): Promise<CountOf> {
  if (photoIds.length === 0) return NONE;
  const rows = await prisma.photoLove.groupBy({
    by: ["photoId"],
    where: { photoId: { in: photoIds } },
    _count: { _all: true },
  });
  return countOf(rows.map((r) => ({ key: r.photoId, n: r._count._all })));
}
