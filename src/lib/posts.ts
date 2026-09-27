import { cityScopeWhere } from "@/lib/city-scope";
import { batchTargetKey } from "@/lib/post-visibility-rule";
import { prisma } from "@/lib/prisma";
import {
  cardOf,
  findLinks,
  needsResolve,
  type LinkCardView,
  type PreviewRow,
} from "@/lib/link-preview-core";
import { scheduleLinkPreviews } from "@/lib/link-preview";

/**
 * Shared Post query fragments.
 *
 * A draft letter is visible ONLY to its author (see feed/actions.ts's draft
 * actions). Every query that reads posts for anyone else must exclude drafts;
 * spread this fragment instead of hand-typing `status: "published"` so a new
 * query can't quietly forget the filter.
 */
export const PUBLISHED_ONLY = { status: "published" } as const;

/**
 * The batch-audience fragment: a post with no targets, or one aimed at this
 * viewer's batch.
 *
 * Three queries hand-built this OR and each hand-built the viewer's key with
 * its own template literal (`${batchType}-${batchYear}`), which for a member
 * with no batch produced the string "null-null" and then LIKE-scanned every
 * post for it. One fragment, one key, so the feed, the letters index and the
 * letters rail cannot drift apart -- the same reason PUBLISHED_ONLY exists,
 * and the same lesson as audit M31.
 *
 * `key` comes from `batchTargetKey`, and null (a member with no batch) drops
 * the `contains` arm rather than searching for the word "null": someone with
 * no batch is in nobody's target list, so only untargeted posts can reach
 * them.
 *
 * Note this is a PRE-filter, not the authority. `decidePostVisibility` decides
 * the single-post case, and its check is token-exact where SQL `contains` is a
 * substring match. They agree because `postSchema` now refuses to store a
 * token that is not exactly `TYPE-YYYY` (audit M43), so no stored key can be a
 * strict prefix of another.
 */
export function batchScopeWhere(key: string | null) {
  const untargeted = [{ targetBatches: null }, { targetBatches: "" }];
  return key
    ? { OR: [...untargeted, { targetBatches: { contains: key } }] }
    : { OR: untargeted };
}

/**
 * A post whose author is still in good standing.
 *
 * OWNER DECISION, 2026-08-21: a blocked member's existing posts, letters and
 * comments leave the feed. Blocking already ends their sessions and takes them
 * out of the directory and out of search, but everything they had written
 * stayed on display under their name -- and their name linked to a profile that
 * answers 404 for everybody else. The directory and the feed disagreed, and the
 * feed was the one saying the wrong thing (audit Low 78).
 *
 * Applied WITHOUT an admin exemption, unlike the cityScope and batch fragments.
 * An admin has /admin/content, which lists everything with "Everything by
 * <name>" and a takedown on each row; the main feed is for reading, and a
 * moderator scrolling past the posts they have just blocked somebody for is
 * noise rather than oversight. The single-post view keeps its admin exemption
 * (see decidePostVisibility), so a moderator following a link still lands on
 * the post itself.
 *
 * Nothing is deleted. Unblocking puts every one of these back.
 */
export const AUTHOR_IN_GOOD_STANDING = { author: { isBlocked: false } } as const;

/**
 * A comment row a reader is actually shown: neither admin-hidden nor
 * self-deleted, and written by somebody still in good standing.
 *
 * It lives here, beside the post fragment, because the COUNT on a card and
 * the LIST in the thread must be the same question. They were not: the four
 * `_count.comments` fragments filtered on hidden + deleted only, so a post
 * whose one comment was written by a since-blocked member showed "1" on the
 * card and rendered an empty thread (audit C-003). Spread this into both
 * halves and the two cannot drift again.
 *
 * A blocked member's comment leaves the thread; if replies hang off it, the
 * roots query keeps it as an anonymous "[deleted]" stub so those replies keep
 * their anchor (audit Low 78, owner decision -- see AUTHOR_IN_GOOD_STANDING).
 */
export const VISIBLE_COMMENT = {
  isHidden: false,
  deletedAt: null,
  ...AUTHOR_IN_GOOD_STANDING,
} as const;

/**
 * The audience half of "which posts may this viewer see": the city arm and
 * the batch arm, composed exactly once.
 *
 * These two fragments used to be assembled by hand at every call site, and
 * the profile page's copy had drifted -- it carried the city arm without the
 * author's self-exemption, and no batch arm at all, while the tab list beside
 * it went through loadPosts and had both. So the count and the list on one
 * screen answered different questions, and a batch-targeted post could reach
 * the Photos grid of somebody outside its audience (bug-report-2 C-004).
 *
 * Returns `AND` and `OR` keys ready to spread into a Post where-clause, or to
 * merge into a caller that is building its own (loadPosts adds its search
 * clause to the same AND array). Two deliberate asymmetries, both inherited
 * from loadPosts and neither invented here:
 *
 *  - the CITY arm is skipped for an admin, who sees every city;
 *  - the BATCH arm is not, because a batch-targeted post is addressed to a
 *    batch rather than withheld from a moderator, and /admin/content is where
 *    an admin reads everything.
 *
 * The author's self-exemption is in both arms: the author is not part of
 * their own audience, they are its source (audit M30).
 */
export function audienceWhere(
  viewer: { id: string; role?: string | null; batchType?: string | null; batchYear?: number | null },
  viewerCities: string[]
): { AND?: Record<string, unknown>[]; OR: Record<string, unknown>[] } {
  const isAdmin = viewer.role === "admin";
  return {
    ...(isAdmin
      ? {}
      : { AND: [{ OR: [cityScopeWhere(viewerCities), { authorId: viewer.id }] }] }),
    OR: [
      ...batchScopeWhere(batchTargetKey(viewer.batchType ?? null, viewer.batchYear ?? null)).OR,
      { authorId: viewer.id },
    ],
  };
}

/**
 * A page of posts (or one letter), with every pasted link that has a resolved
 * preview attached as `links`. The same on-read trigger `catchups-edition-
 * view.ts` uses for an Edition: a link with no preview row, or one whose
 * failed resolve is more than a day old, is handed to `scheduleLinkPreviews`
 * (after() -- never awaited) and prints as an ordinary link on THIS render;
 * the next one has the card.
 *
 * ONE extra query, whatever `rows.length` is: every pasted link across the
 * whole page is collected first, then read back in a single
 * `linkPreview.findMany({ where: { url: { in: [...] } } })`, exactly the
 * shape `withPhotoFacts` already uses for photographs (image-record.ts). A
 * page with no pasted link anywhere costs nothing extra at all.
 *
 * Deliberately does NOT cut a resolved link out of `content` the way the
 * Catch-up reader's loader cuts it out of `body` -- `stripReplacedLinks` runs
 * on the CLIENT instead, in `PostCard`, because a post's `content` column also
 * doubles as `EditPostDialog`'s initial value. Stripping it here would hand
 * the edit dialog a body with the link already missing, and saving that would
 * overwrite the stored post with the link permanently gone. Returning the raw
 * content plus the resolved cards, and cutting only for DISPLAY, keeps editing
 * safe without a second fetcher.
 */
export async function withLinkCards<T extends { id: string; content: string }>(
  rows: T[]
): Promise<(T & { links: LinkCardView[] })[]> {
  const pastedByPost = new Map<string, string[]>();
  const allUrls = new Set<string>();
  for (const row of rows) {
    const urls = findLinks(row.content).flatMap((f) => (f.url ? [f.url] : []));
    if (urls.length === 0) continue;
    pastedByPost.set(row.id, urls);
    for (const url of urls) allUrls.add(url);
  }
  const pasted = [...allUrls];
  const previewRows: PreviewRow[] = pasted.length
    ? await prisma.linkPreview.findMany({
        where: { url: { in: pasted } },
        select: { url: true, kind: true, title: true, subtitle: true, thumbUrl: true, failedAt: true },
      })
    : [];
  const previewsByUrl = new Map(previewRows.map((r) => [r.url, r]));
  const now = new Date();
  scheduleLinkPreviews(pasted.filter((url) => needsResolve(previewsByUrl.get(url), now)));

  const cardsByUrl = new Map<string, LinkCardView>();
  for (const row of previewRows) {
    const card = cardOf(row);
    if (card) cardsByUrl.set(row.url, card);
  }

  return rows.map((row) => ({
    ...row,
    links: (pastedByPost.get(row.id) ?? [])
      .map((url) => cardsByUrl.get(url))
      .filter((c): c is LinkCardView => Boolean(c)),
  }));
}
