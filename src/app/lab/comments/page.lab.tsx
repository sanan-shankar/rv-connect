/* ------------------------------------------------------------------ *
 *  /lab/comments: is the line under a post a necessity?
 *
 *  The owner asked on 2026-09-16. This room puts the three answers on
 *  two of his own posts -- one with a real thread, one with nothing in
 *  it -- so the comparison is the actual component with actual comments
 *  rather than a drawing of it. Admin only through the lab layout;
 *  writes nothing it is not already allowed to write (the composer and
 *  the hearts are live, because a dead thread is not a fair test).
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { loadPosts } from "@/app/(main)/feed/actions";
import { CommentsRoom } from "./_room";

export const dynamic = "force-dynamic";

export default async function CommentsLabPage() {
  await requireLabAdmin();
  const { posts } = await loadPosts();

  /* One busy thread and one empty one: the empty case is half the question,
     because that is where today's look spends 105px saying nothing happened.

     The busy one is the SHORTEST thread over two comments, not the longest.
     The first cut picked a thirteen-comment post and the room became a scroll
     marathon: flipping between three looks meant scrolling past the same
     thirteen comments three times, which is no way to compare anything. */
  const busy =
    [...posts].filter((p) => p.commentCount >= 3).sort((a, b) => a.commentCount - b.commentCount)[0] ??
    posts.find((p) => p.commentCount > 0) ??
    posts[0] ??
    null;
  const empty = posts.find((p) => p.commentCount === 0 && p.id !== busy?.id) ?? null;

  return <CommentsRoom busy={busy} empty={empty} />;
}
