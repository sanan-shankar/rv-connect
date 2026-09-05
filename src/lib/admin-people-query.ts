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
import { AUTHOR_CARD_SELECT } from "@/lib/people-select";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";

const ROW_SELECT = {
  ...AUTHOR_CARD_SELECT,
  // What the admin list adds on top of a byline: the account's standing as an
  // account rather than as a person.
  email: true,
  role: true,
  isBlocked: true,
  emailVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/**
 * One page of people, newest account first.
 *
 * Keyset, not offset, following `loadPosts` -- and now actually doing it. The
 * sort is `(createdAt desc, id desc)` and the cursor carries those two VALUES
 * rather than naming a row, so a signup arriving mid-scroll cannot shunt a row
 * you already read onto the next page, and a member deleted or filtered out
 * between one page and the next cannot end the scroll.
 *
 * That last failure is why this used to be twenty-five lines longer. Prisma's
 * `cursor: { id }` needs the row it names to still be inside the filtered set;
 * when it is not, the query answers nothing at all (measured on this stack,
 * `keyset.ts`), so "Show more" simply stopped with hundreds of rows left. The
 * recovery block that papered over it -- an existence check, then an offset
 * re-query taking a client-supplied row count -- is gone with the cause. A
 * comparison against values has nothing to recover from.
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
  const after = decodeKeyset(cursor);

  const found = await prisma.user.findMany({
    // AND, not a spread: `peopleWhere` can carry its own top-level OR, and a
    // second one would silently replace the first (keyset.ts says so).
    where: after ? { AND: [where, keysetWhere(after, "desc")] } : where,
    select: ROW_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PEOPLE_PAGE_SIZE + 1,
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
      emailState: u.emailVerified ? "confirmed" : mailState(latest.get(u.id)),
      createdAt: u.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? encodeKeyset(page[page.length - 1]) : null,
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
