import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email-address";

/* ------------------------------------------------------------------ *
 *  Keeping development and the owner's own use out of the numbers.
 *
 *  Owner, 2026-09-15: "the OS and platform stats are wrong and imbalanced
 *  because of my machine." They were. Over the month before, the admin
 *  accounts had opened about 1,100 of 1,440 visits, most of them from one
 *  Mac, because local dev, every QA script, the crawls and Playwright all
 *  sign in against the ONE database production uses.
 *
 *  Two layers, because each misses what the other catches:
 *
 *  1. WRITE -- activity is recorded only by the production deployment.
 *     Localhost, `next start` on a laptop and Vercel previews all record
 *     nothing, whoever is signed in, with nothing for a new script to
 *     remember.
 *
 *  2. READ -- the owner's own account and the test account are left out of
 *     every activity number in /admin/analytics. This catches the owner
 *     browsing the real site on his phone, and it is retroactive: the
 *     charts are computed from the rows on every open, so the history they
 *     already skewed comes out right without deleting anything.
 *
 *  src/lib/stats-exclusion-rule.test.mjs fails a new read or writer that
 *  skips either.
 * ------------------------------------------------------------------ */

/* The live ADMIN_EMAIL account, the same id avatar.ts reserves the Roller
   for. An id rather than the address: ADMIN_EMAIL is not guaranteed to be set
   on Vercel, and the owner's address has no business in the source. */
const OWNER_USER_ID = "cmr1uahuj000004jx4dc4p8co";

/* Jerry Maguire, the account every test signs in as (CLAUDE.md). Already
   public in the repo, and resolved to an id at read time so no production
   lookup is baked in here. */
const TEST_ACCOUNT_EMAIL = "sanan.shankar@gmail.com";

/** Whether this deployment records visits, searches and views at all.
 *
 *  `PRESENCE_IN_DEV=1` turns it back on locally for the session that has to
 *  prove the recording itself still works. */
export function statsWritesEnabled(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.PRESENCE_IN_DEV === "1";
}

/** Whether a signed-in account is one the numbers leave out. Synchronous, for
 *  the layout, which has the session and no reason to spend a query. */
export function isStatsExcluded(user: { id: string; email?: string | null }): boolean {
  return user.id === OWNER_USER_ID || normalizeEmail(user.email) === normalizeEmail(TEST_ACCOUNT_EMAIL);
}

/* Once per request: the analytics page calls several loaders, and each asks. */
const excludedIds = cache(async (): Promise<string[]> => {
  const test = await prisma.user.findMany({
    where: { email: normalizeEmail(TEST_ACCOUNT_EMAIL) },
    select: { id: true },
  });
  return [OWNER_USER_ID, ...test.map((u) => u.id)];
});

/** The three shapes an analytics read needs the exclusion in. */
export async function statsFilter() {
  const ids = await excludedIds();
  return {
    visit: { userId: { notIn: ids } } satisfies Prisma.VisitWhereInput,
    /* A signed-out search has no userId, and `NOT IN` is never true of NULL,
       so a bare notIn would silently drop every anonymous search too. */
    search: {
      OR: [{ userId: null }, { userId: { notIn: ids } }],
    } satisfies Prisma.SearchLogWhereInput,
    /** `<column> NOT IN (...)` for raw SQL. The column is always a literal
     *  written in admin-analytics.ts, never input. */
    user: (column: string) => Prisma.sql`${Prisma.raw(column)} NOT IN (${Prisma.join(ids)})`,
  };
}
