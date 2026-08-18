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
  adminNote: true,
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
  cursor?: string | null
): Promise<PeoplePage> {
  const where = peopleWhere(f);

  const found = await prisma.user.findMany({
    where,
    select: ROW_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PEOPLE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

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
      hasNote: Boolean(u.adminNote?.trim()),
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
