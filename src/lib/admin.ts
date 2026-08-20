import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Server-side furniture shared by every admin route.
 *
 *  The guard used to live in the one admin page. It lives here now because
 *  there are eleven routes, and a guard that has to be remembered per route
 *  is a guard that will eventually be forgotten on one. `requireAdminPage()`
 *  is called once, in the admin LAYOUT, so a new section is protected the
 *  moment it exists.
 *
 *  Every mutation still re-checks the role for itself (requireAdmin() in
 *  src/components/profile/admin-actions.ts). A layout guard is navigation,
 *  not authorisation: server actions are their own entry points and are not
 *  covered by whatever laid out the page that called them.
 * ------------------------------------------------------------------ */

export interface AdminSession {
  id: string;
  name: string;
  email: string;
}

/**
 * Gate every /admin route. Redirects a non-admin to the feed rather than
 * showing a 403, because the panel's existence is not a secret worth a page
 * of its own and a member who lands here by a stale link wants the feed.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/feed");
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

/** Shared shape for every admin action. Explicit rather than inferred so the
 *  `error` / `success` branches stay mutually accessible without narrowing at
 *  call sites. */
export type AdminActionResult =
  | { error: string; success?: undefined }
  | { success: boolean; error?: undefined };

/**
 * The guard every admin MUTATION opens with, as distinct from
 * `requireAdminPage()` above, which redirects.
 *
 * An action returns its refusal rather than redirecting, because it is
 * answering a fetch and not rendering a page. Centralised so the check and
 * its copy cannot drift between the twenty-odd actions that need it.
 */
export async function requireAdminAction(): Promise<{ error: string } | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }
  return null;
}

/**
 * Like `requireAdminAction`, but on success also returns WHO is acting and
 * from WHERE — the actor id and caller IP an audit-logged action needs to
 * record (audit H10). Used by the standing-changing actions (block, delete,
 * role, verification) so the log can attribute the change.
 */
export async function requireAdminActor(): Promise<
  { ok: false; error: string } | { ok: true; actorId: string; ip: string | null }
> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { ok: false, error: "Not authorized" };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return { ok: true, actorId: session.user.id, ip };
}

/** True only for the one configured owner, who gets the hoopoe tour trigger. */
export function isOwner(email: string): boolean {
  const ownerEmail = process.env.ADMIN_EMAIL;
  return Boolean(ownerEmail) && email === ownerEmail;
}

/* ---------------------------------------------------------------- *
 *  The rail counts
 * ---------------------------------------------------------------- */

export interface AdminCounts {
  /** The Overview worklist's length. MUST equal what that list renders. */
  waiting: number;
  messages: number;
  reports: number;
  people: number;
}

/**
 * What each row in the rail is allowed to say.
 *
 * `waiting` is the sum of the other queues, and it is computed from the same
 * predicates the Overview worklist uses (see `loadWorklist`). A count that
 * disagrees with the list it points at is worse than no count at all, so the
 * two read from `worklistCounts()` rather than each writing their own `where`.
 */
export async function loadAdminCounts(): Promise<AdminCounts> {
  const [w, people] = await Promise.all([
    worklistCounts(),
    prisma.user.count(),
  ]);
  return {
    waiting: w.total,
    messages: w.messages,
    reports: w.reports,
    people,
  };
}

export interface WorklistCounts {
  messages: number;
  reports: number;
  photos: number;
  flagged: number;
  pendingVerify: number;
  failedMail: number;
  stuckCatchups: number;
  total: number;
}

/** Anything still overdue after the lazy advance has had its chance. */
export function overdueEditionWhere(now: Date) {
  return {
    OR: [
      { status: "collecting", questionsCloseAt: { lt: now } },
      { status: "answering", answersCloseAt: { lt: now } },
      { status: "preparing", publishAt: { lt: now } },
    ],
  };
}

/**
 * The six queues behind the Overview list, counted rather than fetched.
 *
 * Deliberately six `count()`s and not one clever aggregate: they hit six
 * different tables, they run concurrently, and each one is an index lookup.
 * The thing this replaces fetched every row of three of them.
 *
 * On the Overview route these six counts run alongside `loadWorklist()`, which
 * queries the same six predicates for rows. That overlap is deliberate and is
 * the cheaper of the two options: the alternative is for every one of the
 * other ten admin routes to fetch worklist ROWS just so the rail can report a
 * length, which would trade six index counts for six `findMany`s on every
 * page. The rail is fed by the layout because the rail is in the layout.
 */
export async function worklistCounts(): Promise<WorklistCounts> {
  const now = new Date();
  const [messages, reports, photos, flagged, pendingVerify, failedMail, stuckCatchups] =
    await Promise.all([
      prisma.adminThread.count({ where: { adminUnread: true } }),
      prisma.report.count({ where: { status: "pending" } }),
      prisma.photo.count({ where: { approved: false, isHidden: false } }),
      prisma.user.count({ where: { isBlocked: false, verifyState: "flagged" } }),
      prisma.user.count({ where: { isBlocked: false, verifyState: "pending" } }),
      prisma.outboundEmail.count({ where: { status: "failed" } }),
      prisma.catchupEdition.count({ where: overdueEditionWhere(now) }),
    ]);
  return {
    messages,
    reports,
    photos,
    flagged,
    pendingVerify,
    failedMail,
    stuckCatchups,
    total: messages + reports + photos + flagged + pendingVerify + failedMail + stuckCatchups,
  };
}
