/* ------------------------------------------------------------------ *
 *  The Content query.
 *
 *  SPLIT OUT OF admin-content.ts ON PURPOSE. The facet options next door are
 *  imported by a client component, and a value import from any module that
 *  also imports `prisma` drags @prisma/adapter-pg (and `pg`, and its
 *  `require("dns")`) into the browser bundle. `tsc` cannot see it; the page
 *  just fails to build. Types and constants there, database here.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { PUBLISHED_ONLY } from "@/lib/posts";
import { plainExcerpt } from "@/lib/utils";
import { escapeLike } from "@/lib/db-text";
import {
  CONTENT_PAGE_SIZE,
  type ContentFilters,
  type ContentItem,
} from "@/lib/admin-content";

const EXCERPT = 240;

/**
 * One page of content, newest first, across up to four models.
 *
 * Each type is queried separately and merged, rather than attempted as one
 * union query, because these are genuinely four tables with four shapes.
 * The merge sorts on `createdAt` and cuts to the page size, so a mixed
 * "everything" view is honest about order even though it over-fetches a
 * little to get there. With one type selected there is only one query and no
 * over-fetch at all, which is the common case, since you come here looking
 * for a particular thing.
 */
export async function loadContent(f: ContentFilters): Promise<ContentItem[]> {
  const want = (k: string) => f.type === "all" || f.type === k;
  const hidden = f.includeHidden ? {} : { isHidden: false };
  const author = f.authorId ? { authorId: f.authorId } : {};
  const search = f.q ? { contains: escapeLike(f.q), mode: "insensitive" as const } : undefined;

  const jobs: Promise<ContentItem[]>[] = [];

  if (want("post") || want("letter")) {
    const kinds =
      f.type === "post" ? ["post"] : f.type === "letter" ? ["letter"] : ["post", "letter"];
    jobs.push(
      prisma.post
        .findMany({
          where: {
            ...PUBLISHED_ONLY,
            ...hidden,
            ...author,
            kind: { in: kinds },
            ...(search ? { OR: [{ content: search }, { title: search }] } : {}),
          },
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            isHidden: true,
            createdAt: true,
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: CONTENT_PAGE_SIZE,
        })
        .then((rows) =>
          rows.map((p) => ({
            id: p.id,
            kind: (p.kind === "letter" ? "letter" : "post") as ContentItem["kind"],
            title: p.title,
            excerpt: plainExcerpt(p.content, EXCERPT),
            thumbUrl: null,
            authorId: p.author.id,
            authorName: p.author.name,
            createdAt: p.createdAt.toISOString(),
            isHidden: p.isHidden,
            approved: null,
            href: p.kind === "letter" ? `/letters/${p.id}` : `/feed#${p.id}`,
          }))
        )
    );
  }

  if (want("comment")) {
    jobs.push(
      prisma.comment
        .findMany({
          where: {
            ...hidden,
            ...author,
            ...(search ? { content: search } : {}),
            /* A comment the member deleted has had its words blanked and is
               kept only as an anchor for replies, so it listed here as an empty
               row with nothing to moderate. Same reason it is excluded from
               every member-facing count. */
            deletedAt: null,
          },
          select: {
            id: true,
            content: true,
            isHidden: true,
            createdAt: true,
            postId: true,
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: CONTENT_PAGE_SIZE,
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            kind: "comment" as const,
            title: null,
            excerpt: plainExcerpt(c.content, EXCERPT),
            thumbUrl: null,
            /* Null when the account has been purged: the comment survives as
               an authorless anchor for other members' replies (audit M34). The
               filter above means this list should never actually meet one. */
            authorId: c.author?.id ?? null,
            authorName: c.author?.name ?? "Somebody since deleted",
            createdAt: c.createdAt.toISOString(),
            isHidden: c.isHidden,
            approved: null,
            href: `/feed#${c.postId}`,
          }))
        )
    );
  }

  if (want("photo") || f.type === "pending") {
    jobs.push(
      prisma.photo
        .findMany({
          where: {
            ...hidden,
            ...(f.authorId ? { uploaderId: f.authorId } : {}),
            ...(f.type === "pending" ? { approved: false } : {}),
            ...(search ? { caption: search } : {}),
          },
          select: {
            id: true,
            caption: true,
            thumbUrl: true,
            approved: true,
            isHidden: true,
            createdAt: true,
            uploader: { select: { id: true, name: true } },
          },
          // The queue reads oldest-first (whoever has waited longest goes
          // next); everything else reads newest-first.
          orderBy: { createdAt: f.type === "pending" ? "asc" : "desc" },
          take: CONTENT_PAGE_SIZE,
        })
        .then((rows) =>
          rows.map((p) => ({
            id: p.id,
            kind: "photo" as const,
            title: null,
            excerpt: p.caption ? plainExcerpt(p.caption, EXCERPT) : "",
            thumbUrl: p.thumbUrl,
            authorId: p.uploader.id,
            authorName: p.uploader.name,
            createdAt: p.createdAt.toISOString(),
            isHidden: p.isHidden,
            approved: p.approved,
            href: p.approved ? `/collection/${p.id}` : null,
          }))
        )
    );
  }

  const merged = (await Promise.all(jobs)).flat();

  // The pending queue keeps its oldest-first order; everything else is a
  // newest-first mix.
  merged.sort((a, b) =>
    f.type === "pending"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  );

  return merged.slice(0, CONTENT_PAGE_SIZE);
}
