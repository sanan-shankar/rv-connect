/* ------------------------------------------------------------------ *
 *  Demo mode — the public, no-login showcase build of the site.
 *
 *  Turned on by a single env var (`DEMO_MODE=1`) on a SEPARATE Vercel
 *  project pointed at a SEPARATE Supabase database that holds nothing but
 *  invented people. That separation is the real security boundary: a demo
 *  process never has a connection string, an R2 key, or a Razorpay secret
 *  that can reach anything real, so the worst a visitor can do is scribble
 *  on a sandbox that restores itself every night -- and only so much of it:
 *  the tables a visitor can grow stop at DEMO_ROW_CEILINGS below.
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
  /* A Catch-up's roster IS a Group row and its GroupMember rows -- the
     Groups feature itself is gone, and nothing else writes them. Without
     these two, "Start a Catch-up" was reachable in the demo and could never
     succeed: the first write in the creating transaction is `group.create`,
     so the flagship flow died on the guard and told the visitor "Something
     went wrong. Please try again." for ever (audit C-113). The reset wipes
     groupMember and group along with everything else, so a
     visitor-made Catch-up lasts exactly as long as their session's data. */
  "Group",
  "GroupMember",
  "Catchup",
  "CatchupEdition",
  "CatchupPrompt",
  "CatchupEntry",
  "CatchupEntryLove",
  "CatchupPref",
  /* The read mark (build phase 5). Every visitor is the same persona here, so
     these are that persona's marks and an Edition somebody else opened reads
     as read -- which is true of every other personal signal in the demo, and
     better than a list where nothing is ever marked. The nightly reset takes
     them with the Editions they point at. */
  "CatchupEditionRead",
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
 * `executeRaw` is refused outright. Its one caller is the Visit trail write in
 * src/lib/last-seen.ts, which the demo never reaches (/api/presence answers
 * 204 there before writing), so the refusal costs the demo nothing.
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
  /* The rest of the contact row. updateContactMethods writes showEmail, phone
     and phones on EVERY save, whatever the visitor actually touched, and
     isOwnProfileEdit refuses on the first key it does not recognise -- so
     editing an Instagram handle in the demo was refused by the Prisma layer
     and surfaced as "That did not save. Check your connection." (bug-report-2
     C-044). All four are ordinary scalar columns the visitor is meant to edit;
     none of them is standing, identity or an upload output. */
  "showEmail",
  "phone",
  "phones",
  "admissionNumber",
  "birdOverride",
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

/** Thrown when the Prisma layer refuses a write nobody named.
 *
 *  Most refusals never reach this. The actions worth naming individually
 *  return `{ error: "..." }` at their own front door (grep `IS_DEMO) return`)
 *  so the UI can show a sentence written for that specific button. This is
 *  the backstop underneath them.
 *
 *  A visitor never reads THIS message, and never will: every error boundary
 *  in the app (src/app/(main)/error.tsx and its siblings) deliberately does
 *  not read a caught error's `.message` -- an unexpected throw of any kind
 *  gets the same generic "this page did not load", by design (audit M05),
 *  while the real cause goes to the server log (not to Sentry: the demo
 *  reports nothing there, src/instrumentation.ts). An earlier version of
 *  this string was written as if a visitor would see it ("This is a demo,
 *  so that one is switched off"); nothing ever routed it there (bug audit
 *  Low 66). So the message below is aimed at whoever reads the server log
 *  or scripts/demo/verify-guard.mts's output instead, which is the one place
 *  it is actually read. */
export class DemoWriteError extends Error {
  readonly isDemoBlock = true;
  constructor(message = "Demo write guard refused an operation no named action or route claimed.") {
    super(message);
    this.name = "DemoWriteError";
  }
}

/**
 * Decide whether a single Prisma operation may proceed. Exported for the
 * unit test; the enforcement point is the client extension in prisma.ts.
 *
 * `args` is inspected for two things: on a User update, WHICH row and WHICH
 * columns; on any other write, the nested writes its payload carries, each
 * judged by the model it reaches (nestedWritesAllowed below).
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

  if (ALLOWED_WRITE_MODELS.has(model)) return nestedWritesAllowed(model, op, args);

  // The visitor's own profile is the one exception outside the model list.
  if (model === "User") return isOwnProfileEdit(op, args);

  return false;
}

/**
 * The nested writes the product makes through a writable model, and the model
 * each one reaches. A Prisma call arrives at the extension in prisma.ts as ONE
 * (model, operation) pair, its root, so a write nested inside `data` is
 * invisible to the model list above unless this policy walks into the payload
 * itself. Until bug audit 3 (L9-10) it did not:
 * `post.update({ data: { author: { update: { role: "admin" } } } })` passed
 * because Post is writable, and so did a Comment create carrying
 * `post: { update: { reports: { create: ... } } }`, a Report through two
 * writable parents.
 *
 * Default-deny holds here too. A relation not named below is refused whatever
 * it reaches, and a named one may only CREATE, which is all the product does
 * through one; each row it creates is judged as a create on the model it
 * reaches, nested writes and all. demo.test.mjs finds every nested write in
 * src/ and fails on one rooted at a writable model that this list does not
 * name, so a new one is refused here only until somebody decides about it.
 */
export const DEMO_NESTED_CREATES: ReadonlyMap<string, string> = new Map([
  // A poll is posted with its options in the same write (createPost).
  ["Post.pollOptions", "PollOption"],
  // A Catch-up's roster is written with its Group (createCatchupWithPeople).
  ["Group.members", "GroupMember"],
]);

/** The keys that make an object in a write's payload a nested relation write
 *  rather than a value. `set` is the one shared with the scalar atomic
 *  operations (`{ set: "x" }`), so isNestedWrite looks at its value. */
const RELATION_VERBS: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "connect",
  "connectOrCreate",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "set",
  "disconnect",
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

/** True when a payload value is a nested write. A Date, an array of scalars
 *  and an atomic number operation (`{ increment: 1 }`) are values; so is a
 *  scalar `{ set: x }`. A relation's `set` takes rows, an object or an array.
 *  There is no Json column on any writable model, so no value can be an
 *  object that merely happens to hold one of these keys; if one is added, the
 *  failure is a refusal, never a pass. */
function isNestedWrite(value: unknown): boolean {
  if (!isObject(value)) return false;
  return Object.keys(value).some(
    (k) =>
      RELATION_VERBS.has(k) &&
      (k !== "set" || Array.isArray(value.set) || isObject(value.set)),
  );
}

/** The row payloads a write carries: what a nested write could hide in. */
function payloadsOf(op: string, args: unknown): unknown[] {
  const a = (isObject(args) ? args : {}) as Record<string, unknown>;
  if (op === "upsert") return [a.create, a.update];
  if (op === "createMany" || op === "createManyAndReturn") {
    return Array.isArray(a.data) ? a.data : [a.data];
  }
  if (op === "create" || op === "update" || op === "updateMany" || op === "updateManyAndReturn") {
    return [a.data];
  }
  return []; // delete and deleteMany carry no payload
}

/** A write on a writable model passes when every nested write in its payload
 *  is a named relation's create, and every row that create makes would pass
 *  as a create of its own. */
function nestedWritesAllowed(model: string, op: string, args: unknown): boolean {
  for (const payload of payloadsOf(op, args)) {
    if (!isObject(payload)) continue;
    for (const [field, value] of Object.entries(payload)) {
      if (!isNestedWrite(value)) continue;
      const target = DEMO_NESTED_CREATES.get(`${model}.${field}`);
      if (!target) return false;
      for (const [verb, inner] of Object.entries(value as Record<string, unknown>)) {
        if (verb === "create") {
          const rows = Array.isArray(inner) ? inner : [inner];
          if (!rows.every((row) => demoWriteAllowed(target, "create", { data: row }))) return false;
        } else if (verb === "createMany") {
          if (!demoWriteAllowed(target, "createMany", inner)) return false;
        } else {
          return false;
        }
      }
    }
  }
  return true;
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
 *  How far a visitor can grow a table
 * ---------------------------------------------------------------- */

/**
 * The most rows each table a visitor can grow may hold. A create that would
 * take a table past its number is refused, by the extension in prisma.ts,
 * which counts the table first (one count on a tiny database).
 *
 * Why there has to be one (bug audit 3, L12-08). Every per-account meter is
 * off in demo mode (rate-limit.ts), and could not tell visitors apart if it
 * were on, since everyone is the same persona. Nothing else bounded how MANY
 * rows a script against the public link could make: a 20,000-character
 * letter a call, a Catch-up with its group and a bell for each person. The
 * demo database is a free-tier project, and Supabase puts one that passes
 * its size limit into read-only mode, so the nightly reset, a delete and a
 * rewrite, could not run either, and the demo would stay down until somebody
 * intervened by hand. With these, a scripted fill costs the visitors after
 * it until the next reset (nightly, or the demo bar's button), not the
 * database.
 *
 * Sized against the worst row each table takes (text at three bytes a
 * character, its Zod cap full): Post 1,000 x ~60 KB, CatchupPrompt 2,000 x
 * ~1 KB and the one answer each allows 2,000 x ~18 KB, Comment 5,000 x ~3 KB,
 * Notification 20,000 small rows. About 125 MB above the seed's 14 MB at the
 * very worst, against a 500 MB line, and each far above what the seed writes
 * (23 posts, 35 comments, 5 questions, 2 Editions, 1 group) or a real visit
 * could reach in a day. Concurrent creates can overshoot a number by however
 * many land together; the bound is on volume, not an exact count.
 *
 * A writable model with no number here is bounded by its own unique key,
 * which pairs a person with a parent row (Like: one per person per post),
 * and the demo creates no people, so it holds at most 40 a parent of a table
 * that has one. demo.test.mjs holds every writable model to one or the other.
 */
export const DEMO_ROW_CEILINGS: ReadonlyMap<string, number> = new Map([
  ["Post", 1_000],
  ["Comment", 5_000],
  ["PollOption", 5_000],
  ["Notification", 20_000],
  ["UserPlace", 1_000],
  ["Group", 200],
  ["Catchup", 200],
  ["CatchupEdition", 1_000],
  ["CatchupPrompt", 2_000],
]);

/** How many rows an operation would add to its table, for the ceiling: an
 *  upsert counts as one, since it may create. Everything else adds none. */
export function demoRowsAdded(operation: string, args: unknown): number {
  const op = operation.startsWith("$") ? operation.slice(1) : operation;
  if (op === "create" || op === "upsert") return 1;
  if (op === "createMany" || op === "createManyAndReturn") {
    const data = (args as { data?: unknown } | undefined)?.data;
    return Array.isArray(data) ? data.length : 1;
  }
  return 0;
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
  "/signup",
  "/verify",
  "/catchups/join",
  // The email flows. The demo persona has no password to reset and no mailbox
  // to confirm (sendMail refuses outright in demo mode), so these three could
  // only ever show a stranger a form that does nothing.
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // The real account-setup wizard (register/houses/photo/done). It reads and
  // edits Meera's actual row -- the one persona every visitor shares -- so one
  // visitor stepping through it changes what the next one sees, and the photo
  // step calls updateAvatar, which is a demo upload every visitor already gets
  // refused with a clear sentence. It is also simply not this deployment's
  // story: nobody arrives at the demo mid-signup (bug audit M63).
  "/welcome",
];
