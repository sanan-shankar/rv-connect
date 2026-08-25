/* ------------------------------------------------------------------ *
 *  The People query.
 *
 *  SPLIT OUT OF admin-people.ts ON PURPOSE, and do not merge it back. The
 *  facet options and labels next door are imported by `people-list.tsx`,
 *  which is a client component; the moment a value (not a type) is imported
 *  from a module that also imports `prisma`, Turbopack follows the chain
 *  into @prisma/adapter-pg and tries to bundle the `pg` driver for the
 *  browser, which fails on `require("dns")`.
 *
 *  `tsc` cannot see this: the first version of this file typechecked clean
 *  and broke the page at runtime, which is gotcha 3 in CLAUDE.md almost
 *  word for word. Types and constants live in admin-people.ts; anything
 *  that touches the database lives here.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import {
  PEOPLE_PAGE_SIZE,
  peopleWhere,
  type EmailState,
  type PeoplePage,
  type PeopleFilters,
} from "@/lib/admin-people";
import type { Prisma } from "@/generated/prisma/client";

const ROW_SELECT = {
  id: true,
  name: true,
  email: true,
  photoUrl: true,
  birdOverride: true,
  accountType: true,
  batchType: true,
  batchYear: true,
  role: true,
  verifyState: true,
  isBlocked: true,
  emailVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/**
 * One page of people, newest account first.
 *
 * Keyset, not offset, following `loadPosts`: the sort is
 * `(createdAt desc, id desc)` and the cursor is the last row, so a signup
 * arriving mid-scroll cannot shunt a row you already read onto the next page.
 *
 * The mail lookup is scoped to THIS PAGE's unconfirmed ids. The panel it
 * replaces asked for every unconfirmed member's whole send history on every
 * render of a page that also fetched the user table twice more.
 */
export async function loadPeoplePage(
  f: PeopleFilters,
  cursor?: string | null,
  loaded = 0
): Promise<PeoplePage> {
  const where = peopleWhere(f);
  const orderBy = [{ createdAt: "desc" }, { id: "desc" }] as const;

  let found = await prisma.user.findMany({
    where,
    select: ROW_SELECT,
    orderBy: [...orderBy],
    take: PEOPLE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  /* Recover from a cursor row that has left the result set (audit Low 12; the
     same shape the directory's load-more carries for M39).

     Prisma's `cursor` needs the row it names to be INSIDE the filtered set, so
     if that member is deleted, or edited out of the current facet, between one
     page and the next, this answers "nothing" for a list with hundreds of rows
     left -- and "Show more" simply stopped, with the rest of the list
     unreachable until a reload and nothing on screen to say so.

     Only checked when the page came back EMPTY, which is also the ordinary
     end-of-list case, so it costs one round trip on the last page of a
     scroll-through and nothing on any other. An offset is less exact than a
     cursor -- a row inserted above could be repeated or missed once -- but it
     is a page of the list rather than the silent end of it. */
  if (cursor && found.length === 0) {
    const cursorStillCounts = await prisma.user.findFirst({
      where: { ...where, id: cursor },
      select: { id: true },
    });
    if (!cursorStillCounts) {
      found = await prisma.user.findMany({
        where,
        select: ROW_SELECT,
        orderBy: [...orderBy],
        take: PEOPLE_PAGE_SIZE + 1,
        /* Number.isFinite first: `loaded` is a network-supplied number whose
           type is erased, and Math.trunc(NaN) is NaN, which Prisma rejects
           with a 500 rather than a refusal (audit C-174). */
        skip: Number.isFinite(loaded) ? Math.max(0, Math.trunc(loaded)) : 0,
      });
    }
  }

  const hasMore = found.length > PEOPLE_PAGE_SIZE;
  const page = hasMore ? found.slice(0, PEOPLE_PAGE_SIZE) : found;

  const unconfirmed = page.filter((u) => !u.emailVerified).map((u) => u.id);
  const mail = unconfirmed.length
    ? await prisma.outboundEmail.findMany({
        where: { userId: { in: unconfirmed }, kind: "verify" },
        select: { userId: true, status: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // First row wins: the list is newest-first, so this keeps the LATEST
  // attempt per person and ignores the history behind it.
  const latest = new Map<string, string>();
  for (const row of mail) {
    if (row.userId && !latest.has(row.userId)) latest.set(row.userId, row.status);
  }

  return {
    rows: page.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      photoUrl: u.photoUrl,
      birdOverride: u.birdOverride,
      accountType: u.accountType,
      batchType: u.batchType,
      batchYear: u.batchYear,
      role: u.role,
      verifyState: u.verifyState,
      isBlocked: u.isBlocked,
      emailState: u.emailVerified ? "confirmed" : mailState(latest.get(u.id)),
      createdAt: u.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

function mailState(status: string | undefined): EmailState {
  switch (status) {
    case "sent":
      return "waiting";
    case "queued":
    case "sending":
      return "queued";
    case "failed":
      return "failed";
    default:
      return "none";
  }
}
