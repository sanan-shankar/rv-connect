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

type ContentType = "all" | "post" | "letter" | "comment" | "photo";

export const TYPE_OPTIONS: FacetOption[] = [
  { value: "post", label: "Posts" },
  { value: "letter", label: "Letters" },
  { value: "comment", label: "Comments" },
  { value: "photo", label: "Photos" },
  /* "Photos awaiting review" WAS the sixth option here, and reviewing
     photographs was this list wearing a filter. It moved out to /admin/review
     on 2026-08-30, because the two jobs want opposite surfaces: this list is
     for finding one thing among everything members have made, and a review
     queue is a known pile taken one at a time with a decision at the end of
     each. Sharing one surface gave a photograph a 64px thumbnail under four
     chips that said the same thing on every row (owner: "i can barely see
     what i'm reviewing").

     An old `?type=pending` link is redirected to the room by the page, before
     the filters below are ever read. */
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
  const TYPES: readonly string[] = ["post", "letter", "comment", "photo"];
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
  /** Null once the account behind it has been purged: the row survives as an
   *  anchor for other members' replies and has nobody to link to (audit M34). */
  authorId: string | null;
  authorName: string;
  createdAt: string;
  isHidden: boolean;
  /** Photos only: false means it is still in the review queue. */
  approved: boolean | null;
  /** Where a member would see this thing. */
  href: string | null;
}

export const CONTENT_PAGE_SIZE = 40;
