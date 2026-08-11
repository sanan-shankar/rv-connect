/* ------------------------------------------------------------------ *
 *  Demo mode — the public, no-login showcase build of the site.
 *
 *  Turned on by a single env var (`DEMO_MODE=1`) on a SEPARATE Vercel
 *  project pointed at a SEPARATE Supabase database that holds nothing but
 *  invented people. That separation is the real security boundary: a demo
 *  process never has a connection string, an R2 key, or a Razorpay secret
 *  that can reach anything real, so the worst a visitor can do is scribble
 *  on a sandbox that restores itself every night.
 *
 *  Everything in this file is the SECOND layer, for the case where someone
 *  gets further than they should. Its posture is default-deny: writes are
 *  refused unless the touched model is on ALLOWED_WRITE_MODELS below. A
 *  server action added six months from now is therefore born blocked, not
 *  born exposed, which is the only way a guard list stays true.
 *
 *  See docs/spec/demo.md for the deployment steps and the threat model.
 * ------------------------------------------------------------------ */

/** True only on the demo deployment. Read once at module load. */
export const IS_DEMO = process.env.DEMO_MODE === "1";

/**
 * The one seeded persona every visitor arrives as. Its id is fixed (not a
 * cuid) so the seed, the session shim and the nightly reset all agree on
 * who "you" are without a lookup, and so a stale cookie can never point at
 * a row that got recycled into somebody else.
 */
export const DEMO_USER_ID = "demo-visitor";

/* ---------------------------------------------------------------- *
 *  Write policy
 * ---------------------------------------------------------------- */

/**
 * Models a demo visitor's own actions may write. This is the allowlist the
 * Prisma extension in `prisma.ts` enforces, and it is deliberately shaped
 * around "what makes the product feel alive" rather than "what happens to
 * be harmless":
 *
 *  - Post/Comment/Like/CommentLike/Bookmark/PollVote — the feed is the
 *    demo's whole first impression; it has to actually work.
 *  - PhotoLove — hearting a Collection photo. (Photo itself is NOT here:
 *    creating one means an image upload, see below.)
 *  - Catchup* — the newsletter loop is the most interesting thing the site
 *    does and is worth letting people drive end to end.
 *  - Notification — marking one read, and the notifications the allowed
 *    actions above raise as a side effect.
 *  - UserPlace — moving your own pin on the map is a lovely thing to try.
 *
 * Everything absent is refused. The notable absences, and why:
 *
 *  - Photo: a create means bytes into a bucket. An open, unauthenticated
 *    image upload attached to a public link is the one genuinely dangerous
 *    thing this app can offer a stranger, so the demo never takes a file.
 *  - Report / AdminThread / AdminMessage: these exist to summon a human.
 *    A demo must not be able to page the owner.
 *  - Contribution: real money, real Razorpay.
 *  - Account / Session / VerificationToken: the auth substrate.
 *  - User: handled specially below, since the visitor DOES get to edit
 *    their own profile.
 */
const ALLOWED_WRITE_MODELS: ReadonlySet<string> = new Set([
  "Post",
  "Comment",
  "Like",
  "CommentLike",
  "Bookmark",
  "PollVote",
  "PollOption",
  "PhotoLove",
  "Notification",
  "UserPlace",
  "Catchup",
  "CatchupEdition",
  "CatchupPrompt",
  "CatchupEntry",
  "CatchupEntryLove",
  "CatchupPref",
]);

/** Prisma operations that change data. Everything else is a read. */
const WRITE_OPS: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

/**
 * Raw SQL arrives with NO model, so it cannot be judged against the model
 * allowlist and has to be judged by operation instead.
 *
 * `queryRaw` is allowed because the directory map genuinely needs it: the
 * gazetteer lookup in src/lib/geocode.ts is a hand-written SELECT, and
 * without it every pin outside the small offline coordinate table vanishes.
 * `executeRaw` is refused outright, and nothing in this codebase calls it.
 *
 * Both are matched with and without the leading `$`, because which form
 * Prisma hands to an extension has changed between versions and this is not
 * a place to be clever about version detection.
 */
const RAW_READ_OPS: ReadonlySet<string> = new Set(["queryRaw", "queryRawUnsafe"]);
const RAW_WRITE_OPS: ReadonlySet<string> = new Set(["executeRaw", "executeRawUnsafe"]);

/**
 * The User columns a visitor may change on their own row. Editing your
 * profile is a highlight of the product, so this is generous — but it stops
 * at anything that would let a visitor promote themselves (`role`), launder
 * their standing (`verifyState`, `verifiedAt`, `verifyMethod`), unblock
 * themselves (`isBlocked`), take over an identity (`email`, `password`), or
 * point an <img> at a URL of their choosing (`photoUrl`, `coverPhoto` —
 * both are upload outputs, and the demo takes no uploads).
 */
const EDITABLE_PROFILE_FIELDS: ReadonlySet<string> = new Set([
  "name",
  "bio",
  "about",
  "currentCity",
  "secondaryCity",
  "houses",
  "displayEmail",
  "birdOverride",
  "avatarColor",
  "workplace",
  "jobTitle",
  "instagram",
  "linkedin",
  "facebook",
  "links",
  "accountType",
  "batchType",
  "batchYear",
  "yearJoined",
  "yearLeft",
  "gradeJoined",
  "subjects",
  "taughtFrom",
  "taughtUntil",
  "theme",
  "updatedAt",
]);

/** Thrown when the Prisma layer refuses a write. Carries a line fit to show
 *  a visitor: they should feel a velvet rope, not a stack trace.
 *
 *  Most refusals never reach this. The actions worth naming individually
 *  return `{ error: "..." }` at their own front door (grep `IS_DEMO) return`)
 *  so the UI can show a sentence written for that specific button. This is
 *  the backstop underneath them, for whatever nobody thought to name. */
export class DemoWriteError extends Error {
  readonly isDemoBlock = true;
  constructor(
    message = "This is a demo, so that one is switched off. Everything else is yours to try.",
  ) {
    super(message);
    this.name = "DemoWriteError";
  }
}

/**
 * Decide whether a single Prisma operation may proceed. Exported for the
 * unit test; the enforcement point is the client extension in prisma.ts.
 *
 * `args` is inspected only for User updates, where the verdict depends on
 * WHICH row and WHICH columns rather than on the model alone.
 */
export function demoWriteAllowed(
  model: string | undefined,
  operation: string,
  args?: unknown,
): boolean {
  const op = operation.startsWith("$") ? operation.slice(1) : operation;

  // Raw SQL first: it carries no model, so the allowlist below cannot see it.
  if (RAW_WRITE_OPS.has(op)) return false;
  if (RAW_READ_OPS.has(op)) return true;

  // Anything else without a model is something this policy has never been
  // taught to reason about, so it does not get the benefit of the doubt.
  if (!model) return false;

  if (!WRITE_OPS.has(op)) return true; // ordinary model reads always pass

  // A bulk write with no filter is never something the product does. Every
  // deleteMany/updateMany in the app scopes itself (to a user, a post, an
  // edition); an unscoped one is either a mistake or somebody clearing the
  // table, and "they should not be able to ruin everything" is the whole
  // brief. Verified by scripts/demo/verify-guard.mts, which found that
  // post.deleteMany({}) emptied the feed before this check existed.
  if (BULK_OPS.has(op) && !hasFilter(args)) return false;

  if (ALLOWED_WRITE_MODELS.has(model)) return true;

  // The visitor's own profile is the one exception outside the model list.
  if (model === "User") return isOwnProfileEdit(op, args);

  return false;
}

/** Operations that can hit an unbounded number of rows in one call. */
const BULK_OPS: ReadonlySet<string> = new Set(["deleteMany", "updateMany", "updateManyAndReturn"]);

/** True when `args.where` actually narrows anything. */
function hasFilter(args: unknown): boolean {
  const where = (args as { where?: unknown } | undefined)?.where;
  if (!where || typeof where !== "object") return false;
  return Object.keys(where as Record<string, unknown>).length > 0;
}

/** A User write is allowed only when it updates the demo persona's own row
 *  and touches nothing outside EDITABLE_PROFILE_FIELDS. Creates and deletes
 *  of User rows are never allowed: no signing up, no deleting accounts. */
function isOwnProfileEdit(operation: string, args: unknown): boolean {
  if (operation !== "update" && operation !== "updateMany") return false;

  const a = args as { where?: Record<string, unknown>; data?: Record<string, unknown> } | undefined;
  if (!a?.where || !a?.data) return false;

  // Must target exactly the persona, by id. A `where` that could match more
  // than one row (or matches by some other column) is refused rather than
  // analysed, because "which rows does this filter select" is not a question
  // worth being clever about inside a security check.
  if (a.where.id !== DEMO_USER_ID) return false;

  // Prisma allows nested writes and atomic ops in `data`; both are objects.
  // Only plain scalar assignments on allowlisted columns get through.
  for (const [key, value] of Object.entries(a.data)) {
    if (!EDITABLE_PROFILE_FIELDS.has(key)) return false;
    if (value !== null && typeof value === "object") return false;
  }
  return true;
}

/* ---------------------------------------------------------------- *
 *  Routes the demo does not open
 * ---------------------------------------------------------------- */

/**
 * Page prefixes the demo redirects away from. Admin is obvious. `/lab` is
 * dev scaffolding, not part of the product story and not worth showing a
 * stranger. The rest are flows that only mean anything when accounts are
 * real.
 *
 * ENFORCEMENT LIVES IN src/proxy.ts, which cannot import this file: proxy is
 * bundled for the edge runtime and this module is reached from server-only
 * code. The duplicate list there is held to this one by demo.test.mjs, so
 * the two cannot drift apart silently.
 */
export const DEMO_CLOSED_PATHS: readonly string[] = [
  "/admin",
  "/lab",
  "/onboarding",
  "/signup",
  "/verify",
  "/catchups/join",
  // The email flows. The demo persona has no password to reset and no mailbox
  // to confirm (sendMail refuses outright in demo mode), so these three could
  // only ever show a stranger a form that does nothing.
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
