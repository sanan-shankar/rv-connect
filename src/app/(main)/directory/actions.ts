"use server";

import { requireVerifiedEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { buildDirectoryWhere, directoryOrderBy, type DirectoryFilters } from "./where";

const PAGE_SIZE = 60;

const PERSON_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
  photoUrl: true,
  birdOverride: true,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  currentCity: true,
  jobTitle: true,
  workplace: true,
} as const;

export type DirectoryUser = {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  verifyState: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
  workplace: string | null;
};

/** Fetch one more page of directory results after `cursor` (keyset pagination). */
export async function loadDirectoryPage({
  filters,
  cursor,
  loaded = 0,
}: {
  filters: DirectoryFilters;
  cursor: string | null;
  /** How many rows the caller is already showing. Only used to recover from a
   *  cursor row that has left the result set; see the fallback below. */
  loaded?: number;
}): Promise<{ users: DirectoryUser[]; nextCursor: string | null }> {
  /* This was the one "use server" action in the codebase with no auth() call
     at all (audit H1), and it returns the complete membership roll of a
     private community -- name, batch, city, employer, job title -- sixty at a
     time, with a caller-supplied cursor and caller-controlled filters. The
     page that renders it does call auth(), but a server action is a POST
     endpoint that Next will dispatch on its own, independently of the page,
     and proxy.ts only checks that a session cookie is PRESENT, never that it
     is valid. So the page's guard was never this action's guard.

     Names are a Stage 1 capability under the trust model (audit H21): the
     email gate, not just a session. requireVerifiedEmail also covers the
     demo's invented visitor, which browses freely. */
  const gate = await requireVerifiedEmail();
  if (!gate.ok) return { users: [], nextCursor: null };

  const where = buildDirectoryWhere(filters);
  const orderBy = directoryOrderBy(filters.sort);

  let rows = await prisma.user.findMany({
    where,
    select: PERSON_SELECT,
    orderBy,
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  /* Recover from a cursor row that has left the result set (audit M39).
   *
   * Prisma's `cursor` needs the row it names to be INSIDE the filtered set, so
   * if that member is blocked, asks for deletion, or is purged between one
   * page and the next, this query answers "nothing" for a list with hundreds
   * of rows left -- and "Load more" simply stopped, with nothing on screen to
   * say the rest of the directory was now unreachable.
   *
   * Only checked when the page came back EMPTY, which is also the ordinary
   * end-of-list case, so the extra query costs one round trip on the last page
   * of a scroll-through and nothing at all on any other page. Falling back to
   * an offset is not as exact as a cursor -- a row inserted above could be
   * repeated or missed once -- but it is a page of the directory rather than
   * the silent end of it. */
  if (cursor && rows.length === 0) {
    const cursorStillCounts = await prisma.user.findFirst({
      where: { ...where, id: cursor },
      select: { id: true },
    });
    if (!cursorStillCounts) {
      rows = await prisma.user.findMany({
        where,
        select: PERSON_SELECT,
        orderBy,
        take: PAGE_SIZE + 1,
        /* Number.isFinite first: `loaded` is a network-supplied number whose
           type is erased, and Math.trunc(NaN) is NaN, which Prisma rejects
           with a 500 rather than a refusal (audit C-174). */
        skip: Number.isFinite(loaded) ? Math.max(0, Math.trunc(loaded)) : 0,
      });
    }
  }

  const hasMore = rows.length > PAGE_SIZE;
  const users = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? users[users.length - 1].id : null;
  return { users, nextCursor };
}
