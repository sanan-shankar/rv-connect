import type { FacetOption } from "@/components/common/filters/types";

/* ------------------------------------------------------------------ *
 *  Everything members have made, in one list.
 *
 *  Client-safe: no `prisma` import here, only in admin-content-query.ts.
 *  See the banner in that file for why the split is load-bearing.
 *
 *  This section is NOT new moderation machinery. Removing a post, letter,
 *  comment or photo already worked from each card's own dropdown, with the
 *  shared ModerationDialog and its optional note to the author. What did not
 *  exist was any way to FIND the thing: you had to already be looking at it
 *  in the feed. So this is a search over four models that ends in the
 *  actions that already existed.
 * ------------------------------------------------------------------ */

export type ContentType = "all" | "post" | "letter" | "comment" | "photo" | "pending";

export const TYPE_OPTIONS: FacetOption[] = [
  { value: "post", label: "Posts" },
  { value: "letter", label: "Letters" },
  { value: "comment", label: "Comments" },
  { value: "photo", label: "Photos" },
  // The old panel's whole "Photos to review" section, demoted to what it
  // always was: one filter over the photos. It kept a heading and an empty
  // state on the front page on every one of the days when nothing was
  // waiting, which was most of them.
  { value: "pending", label: "Photos awaiting review" },
];

export function typeLabel(v: string): string {
  return TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export interface ContentFilters {
  q: string;
  type: ContentType;
  authorId: string;
  /** Hidden items are excluded unless asked for; a removed post is not news. */
  includeHidden: boolean;
}

export function readContentFilters(
  sp: Record<string, string | string[] | undefined>
): ContentFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const TYPES: readonly string[] = ["post", "letter", "comment", "photo", "pending"];
  const type = one("type");
  return {
    q: one("q").trim(),
    type: TYPES.includes(type) ? (type as ContentType) : "all",
    authorId: one("author").trim(),
    includeHidden: one("hidden") === "1",
  };
}

/** One row, whatever model it came from. */
export interface ContentItem {
  id: string;
  kind: "post" | "letter" | "comment" | "photo";
  /** Letters have one; nothing else does. */
  title: string | null;
  /** The words, or the caption. Already truncated by the query. */
  excerpt: string;
  /** Photos only. */
  thumbUrl: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  isHidden: boolean;
  /** Photos only: false means it is still in the review queue. */
  approved: boolean | null;
  /** Where a member would see this thing. */
  href: string | null;
}

export const CONTENT_PAGE_SIZE = 40;
