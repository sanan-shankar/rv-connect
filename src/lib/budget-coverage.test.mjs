import assert from "node:assert/strict";
import test from "node:test";
import { relative, resolve } from "node:path";
import { ROOT, read, decomment, walk, balancedBody, serverActionFiles, filesContaining } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Budget coverage: every door a member or a stranger can call either
 *  spends a meter or a budget, or sits on a reviewed list saying why it
 *  need not (bug audit 3, O-09; design: docs/audit-fix/2026-09-24-bug-
 *  audit-3/work/o09-budget-design.md, section 7).
 *
 *  gate-coverage.test.mjs asks "does this door know WHO is calling". This
 *  asks "is there a ceiling on HOW MUCH". The audit found thirteen doors
 *  where there was not, each one forgotten line in one function: a draft
 *  with no count, a search log with no daily cap, a link preview fetched
 *  for anyone. The sweep makes the forgetting loud: a new exported action
 *  or route method with no meter fails `npm run check` until it gains one
 *  or is added to BUDGET_EXEMPT with its reason written down.
 *
 *  A marker proves the SHAPE, not the number (a meter whose verdict is
 *  ignored still matches). The numbers are argued where they live, and
 *  each instance this campaign has closed has its own assertion below.
 * ------------------------------------------------------------------ */

/** The calls that spend a meter (rate-limit.ts) or a budget (daily-budget.ts). */
const MARKERS = ["rateLimit", "hasBudget", "consume", "spendBudget", "budgetLeft"];

/**
 * Helpers in OTHER files that spend a meter or a ceiling for their caller,
 * each with the file it lives in and the proof its own body must still
 * carry. Calling one counts as a marker; the proof is checked below, so a
 * helper that loses its meter turns every caller red at once.
 */
const METERED_HELPERS = {
  vetLookupRequest: { file: "src/lib/api-gate.ts", proof: /\brateLimit\s*\(/ },
  vetUploadRequest: { file: "src/lib/api-gate.ts", proof: /\brateLimit\s*\(/ },
  vetPhotoDownload: { file: "src/lib/api-gate.ts", proof: /\brateLimit\s*\(/ },
  enqueueMail: { file: "src/lib/email-queue.ts", proof: /ENQUEUE_LIMIT/ },
  /* Messages to the admins, and reports, which open a thread: forty new
     threads an hour per member, counted on the member's own rows. */
  isThreadRateLimited: { file: "src/lib/admin-threads-server.ts", proof: /MAX_NEW_THREADS_PER_HOUR/ },
  isMessageRateLimited: { file: "src/lib/admin-threads-server.ts", proof: /MAX_MESSAGES_PER_HOUR/ },
  /* A confirmation link goes through the mail queue, metered per account. */
  sendVerificationEmail: { file: "src/lib/verification-mail.ts", proof: /\benqueueMail\s*\(/ },
  /* Link previews: every door that makes the server fetch a pasted link
     spends the writer's previewFetches inside ensureLinkPreviews (T2b-02). */
  scheduleLinkPreviews: { file: "src/lib/link-preview.ts", proof: /\bensureLinkPreviews\(urls, memberId\)/ },
  /* Presence: at most MAX_VISITS_PER_DAY visits opened per member a day
     (bug-report-2 C-163), counted inside recordVisit, which this calls. */
  recordPageView: { file: "src/lib/last-seen.ts", proof: /\brecordVisit\s*\(/ },
};

/** The six reviewed reasons a door may have no meter (design section 7),
 *  and a seventh this sweep found it needed (see `bounded:` below). */
const CATEGORIES = [
  "admin-only:", //  the owner and his admins
  "own-row:", //     writes one row of the caller's own, in place or one per thing, ringing nobody
  "own-page:", //    reads the caller's own rows, or one bounded page, or nothing at all
  "own-delete:", //  deletes the caller's own content
  "secret-gated:", // a cron or webhook behind CRON_SECRET or a signature
  "dev-only:", //    answers 404 in production
  /* Not in the design's six, and added when the sweep met them: a door whose
     ceiling is real but is not a meter -- a unique row, a cap on a parent, a
     transition that can happen once. The reason must name what bounds it. */
  "bounded:",
  /* An open instance of O-09 that a later unit closes. Allowed only for the
     row ids the design file lists; the unit that closes one deletes it here
     and adds that instance's own assertion below. */
  "pending:",
];

/**
 * Every exported door with no marker, and why. Keyed by file, then by the
 * exported name (an action) or the HTTP method (a route). Admin actions that
 * open with `requireAdminAction`/`requireAdminActor` are recognised by their
 * gate and need no entry; the ones listed here check the role some other way.
 */
const BUDGET_EXEMPT = {
  "src/app/(main)/announcement/actions.ts": {
    markAnnouncementSeen: "own-row: stamps the caller's own seen-at, in place",
  },
  "src/app/(main)/catchups/actions.ts": {
    joinCatchupByToken: "pending: C3-02 (the routed joinCatchupByToken meter rides with it, design section 10, H-next)",
    renameCatchup: "bounded: a Keeper's rename of one Catch-up, in place; creates nothing and rings nobody",
    setCatchupPicture: "bounded: points the Catch-up at a picture the metered upload door already stored, replacing the last in place",
    discardPictureUpload: "own-delete: the caller's own staged picture",
    endCatchup: "bounded: once per Catch-up, and only by a Keeper",
    submitPrompt: "bounded: at most 40 questions an Edition (routed (b) hardens the count), and Editions are metered at startEdition",
    curatePrompt: "bounded: a Keeper keeps, edits or drops a question already asked, in place",
    openAnswering: "bounded: once per Edition, collecting to answering; Editions are metered at startEdition",
    closeAndPublish: "bounded: once per Edition, answering to published; Editions are metered at startEdition",
    extendDeadline: "bounded: moves one Edition's deadline in place, Keeper only; rings nobody",
    setEditionTimeCapsule: "bounded: one Edition's sealing date, in place, Keeper only",
    toggleEntryLove: "bounded: one heart per member per answer (a unique row); its bell is deduped on the actor (notifyLove)",
    loadEntryComments: "own-page: one bounded page of one answer's comments",
    toggleEntryCommentLike: "own-row: one like per member per comment (a unique row), ringing nobody",
    removeCatchupMember: "bounded: a Keeper's removal from a roster capped at MAX_CATCHUP_PEOPLE",
    leaveCatchup: "own-delete: the caller's own membership",
    setCatchupArchived: "own-row: the caller's own shelf preference",
    setCatchupKeeper: "bounded: moves a hat within a roster capped at MAX_CATCHUP_PEOPLE, in place",
    setReminderPref: "own-row: the caller's own reminder preference, upserted",
  },
  "src/app/(main)/collection/actions.ts": {
    loadPhotos: "pending: C6-05",
    loadBand: "pending: C6-05",
    togglePhotoLove: "own-row: one heart per member per photograph (a unique row), ringing nobody",
    deleteOwnPhoto: "own-delete: the contributor's own photograph (or an admin's removal)",
  },
  "src/app/(main)/directory/actions.ts": {
    loadDirectoryPage: "pending: C6-05",
  },
  "src/app/(main)/feed/actions.ts": {
    deleteDraft: "own-delete: the author's own draft",
    votePoll: "own-row: one vote per member per poll, upserted",
    deletePost: "own-delete: the author's own post (or a site or group admin's)",
    adminRemovePost: "admin-only: checks the role itself",
    toggleLike: "pending: C6-02",
    toggleBookmark: "own-row: one bookmark per member per post (a unique row), ringing nobody",
    deleteComment: "own-delete: the author's own comment (or an admin's)",
    adminRemoveComment: "admin-only: checks the role itself",
    loadPosts: "own-page: one page of PAGE_SIZE posts a call; not one of the four bulk reads C6-05 meters (design section 5)",
    loadSavedPosts: "own-page: the caller's own saved posts, one page a call",
    toggleCommentLike: "pending: C6-02",
    loadComments: "own-page: one bounded page of one post's comments",
    markFeedSeen: "own-row: stamps the caller's own seen-at, in place",
  },
  "src/app/(main)/guide/actions.ts": {
    markGuideSeen: "own-row: stamps the caller's own seen-at, in place",
  },
  "src/app/(main)/image-aim.ts": {
    aimImage: "own-row: the focal point of a photograph the caller placed, in place on a row that exists",
    myImageFacts: "own-page: what is known about the caller's own photographs",
  },
  "src/app/(main)/messages/actions.ts": {
    adminReplyToThread: "admin-only: actingAdmin()",
    setThreadStatus: "admin-only: actingAdmin()",
    markThreadSeenByAdmin: "admin-only: actingAdmin()",
  },
  "src/app/(main)/notifications/actions.ts": {
    getNotifications: "own-page: the caller's own bell, one page",
    getUnreadNotificationCount: "own-page: one count of the caller's own bell",
    markNotificationRead: "own-row: the caller's own bell row, in place",
    markAllNotificationsRead: "own-row: the caller's own bell rows, in place",
  },
  "src/app/(main)/support/actions.ts": {
    confirmContribution: "bounded: completes, once and under Razorpay's signature, an order the metered startContribution minted",
    chooseBird: "own-row: the caller's own supporter bird, in place",
  },
  "src/components/auth/email-actions.ts": {
    confirmEmailToken: "bounded: spends one single-use emailed token, in place",
    checkResetLink: "own-page: one indexed read of one token; writes nothing",
  },
  "src/components/auth/trivia-actions.ts": {
    getTriviaQuestion: "pending: C4-01",
    hasPassedTrivia: "own-page: reads the caller's own signed pass cookie; no database",
  },
  "src/components/auth/verification-actions.ts": {
    requestVerification: "bounded: rings the admins only on the one write that moves the caller from unverified to pending",
  },
  "src/components/onboarding/actions.ts": {
    saveOnboardingRegister: "own-row: the caller's own profile, in place",
    saveOnboardingHouses: "own-row: the caller's own profile, in place",
  },
  "src/components/profile/profile-actions.ts": {
    updateProfileField: "pending: C6-02",
    updateContactMethods: "own-row: the caller's own profile, in place",
  },
  "src/components/settings/actions.ts": {
    updateUserPlaces: "own-row: replaces the caller's own list of places",
    removeAvatar: "own-delete: the caller's own photograph",
  },
  "src/components/settings/theme-actions.ts": {
    setThemePreference: "own-row: a cookie and the caller's own preference, in place",
  },
  "src/app/api/auth/[...nextauth]/route.ts": {
    GET: "own-page: NextAuth's session and CSRF reads",
    POST: "bounded: NextAuth's handlers; the one that writes, the credentials callback, is metered inside authorize (auth.ts: login-ip, login-account, login-unverified), and a known refusal costs nothing (L5-02, spent-memo.test.mjs)",
  },
  "src/app/api/auth/stale/route.ts": {
    GET: "own-page: clears the caller's own stale cookies",
  },
  "src/app/api/catchups/tick/route.ts": { GET: "secret-gated: requireCronSecret" },
  "src/app/api/demo/reset/route.ts": {
    POST: "pending: L8-04",
    GET: "secret-gated: requireCronSecret",
  },
  "src/app/api/dev-login/route.ts": { POST: "dev-only: 404 on every production build" },
  "src/app/api/razorpay/webhook/route.ts": { POST: "secret-gated: Razorpay's signature" },
  "src/app/api/resend/webhook/route.ts": { POST: "secret-gated: Resend's signature" },
  "src/app/api/retention/sweep/route.ts": { GET: "secret-gated: requireCronSecret" },
};

/** An admin gate opens the action: the owner and his admins, recognised by name. */
const ADMIN_GATE = /\b(requireAdminAction|requireAdminActor|requireAdmin)\s*\(/;

const DESIGN = "docs/audit-fix/2026-09-24-bug-audit-3/work/o09-budget-design.md";

/* ------------------------------------------------------------ the walk */

const fnBody = (text, name) =>
  balancedBody(text, new RegExp(String.raw`(?:export\s+)?(?:async\s+)?function\s+${name}\b`));

const callsAny = (body, names) => names.some((n) => new RegExp(String.raw`\b${n}\s*\(`).test(body));

/** Exported doors in one file: action names, or a route's HTTP methods. */
function doorsOf(file, src) {
  if (file.endsWith("/route.ts")) {
    const methods = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) methods.add(m[1]);
    for (const m of src.matchAll(/export\s+const\s*\{([^}]*)\}/g)) {
      for (const name of m[1].split(",").map((s) => s.trim())) {
        if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(name)) methods.add(name);
      }
    }
    return [...methods];
  }
  return [...src.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
}

/** Doors whose body (or a same-file helper it calls) spends a meter. */
function meteredIn(src) {
  const all = [...src.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
  const spenders = [...MARKERS, ...Object.keys(METERED_HELPERS)];
  const metered = new Set(all.filter((n) => callsAny(fnBody(src, n) ?? "", spenders)));
  // Delegation, to a fixed point: a body that calls a metered sibling is metered.
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of all) {
      if (!metered.has(n) && callsAny(fnBody(src, n) ?? "", [...metered])) {
        metered.add(n);
        grew = true;
      }
    }
  }
  return metered;
}

const routeFiles = walk(resolve(ROOT, "src/app/api"), { match: (name) => name === "route.ts" })
  .map((full) => relative(ROOT, full))
  .sort();
const actionFiles = serverActionFiles().sort();
const files = [...actionFiles, ...routeFiles];

/** Row ids the design lists in its instance table, the only ones `pending:` may name. */
const designIds = new Set([...read(DESIGN).matchAll(/^\| \*\*([A-Z][A-Za-z0-9]*-\d+)\*\* \|/gm)].map((m) => m[1]));

test("there are doors to sweep, and the design's instance table is readable", () => {
  assert.ok(actionFiles.length >= 15, `only ${actionFiles.length} action files; the walk has drifted`);
  assert.ok(routeFiles.length >= 15, `only ${routeFiles.length} route files; the walk has drifted`);
  assert.ok(designIds.size >= 12, `only ${designIds.size} instance ids read from ${DESIGN}`);
});

for (const file of files) {
  test(`every door in ${file} spends a meter or says why not`, () => {
    const src = decomment(read(file));
    const metered = meteredIn(src);
    const offenders = doorsOf(file, src).filter((door) => {
      if (BUDGET_EXEMPT[file]?.[door] || metered.has(door)) return false;
      const body = fnBody(src, door) ?? (file.endsWith("/route.ts") ? src : "");
      return !ADMIN_GATE.test(body);
    });
    assert.deepEqual(offenders, [], `${file}: these doors spend no meter or budget and have no BUDGET_EXEMPT entry`);
  });
}

test("every exemption names a door that still exists, under a known reason", () => {
  for (const [file, entries] of Object.entries(BUDGET_EXEMPT)) {
    const doors = new Set(doorsOf(file, decomment(read(file))));
    for (const [door, reason] of Object.entries(entries)) {
      assert.ok(doors.has(door), `${file} → ${door} is exempt but no longer exported (stale entry)`);
      assert.ok(
        CATEGORIES.some((c) => reason.startsWith(c)),
        `${file} → ${door}: "${reason}" does not start with one of ${CATEGORIES.join(" ")}`,
      );
      if (reason.startsWith("pending:")) {
        const id = reason.slice("pending:".length).trim().split(/\s/)[0];
        assert.ok(designIds.has(id), `${file} → ${door} is pending on ${id}, which is not a row in ${DESIGN}`);
      }
      if (reason.startsWith("bounded:")) {
        assert.ok(reason.length > "bounded: ".length + 20, `${file} → ${door}: a bounded door must say what bounds it`);
      }
    }
  }
});

test("an exemption is not kept for a door that now spends a meter", () => {
  /* The other way a list rots: the door gains its meter and the entry stays,
     so the day the meter goes again nothing notices. */
  for (const [file, entries] of Object.entries(BUDGET_EXEMPT)) {
    const src = decomment(read(file));
    const metered = meteredIn(src);
    for (const door of Object.keys(entries)) {
      assert.ok(!metered.has(door), `${file} → ${door} spends a meter now; delete its BUDGET_EXEMPT entry`);
    }
  }
});

test("every metered helper still spends what it is trusted to", () => {
  for (const [name, { file, proof }] of Object.entries(METERED_HELPERS)) {
    const body = fnBody(decomment(read(file)), name);
    assert.ok(body, `${name} is gone from ${file}; re-point METERED_HELPERS`);
    assert.match(body, proof, `${name} (${file}) no longer carries its ceiling, so every caller is unmetered`);
  }
});

/* ------------------------------------------------------------ the budgets */

const BUDGET_SRC = decomment(read("src/lib/daily-budget.ts"));
const budgetsBlock = BUDGET_SRC.slice(
  BUDGET_SRC.indexOf("const BUDGETS = {"),
  BUDGET_SRC.indexOf("} as const satisfies Record<string, BudgetSpec>"),
);
/** Each entry's name and its own source text. */
const budgets = [...budgetsBlock.matchAll(/^ {2}([A-Za-z0-9]+): \{/gm)].map((m, i, all) => ({
  name: m[1],
  text: budgetsBlock.slice(m.index, all[i + 1]?.index ?? budgetsBlock.length),
}));

test("the budget table is where the sweep reads it", () => {
  assert.ok(budgetsBlock.length > 0, "BUDGETS moved or changed shape in daily-budget.ts; re-point this test");
});

test("every budget is spent somewhere", () => {
  const spenders = filesContaining(/\b(spendBudget|budgetLeft)\s*\(/).filter((f) => f !== "src/lib/daily-budget.ts");
  const text = spenders.map((f) => decomment(read(f))).join("\n");
  for (const { name } of budgets) {
    assert.ok(text.includes(`"${name}"`), `the ${name} budget is spent nowhere; delete it or wire it`);
  }
});

test("every rows budget names an index the schema has", () => {
  const schema = read("prisma/schema.prisma");
  for (const { name, text } of budgets) {
    if (!/store: "rows"/.test(text)) continue;
    const m = text.match(/index: "([A-Za-z]+)\(([^)]+)\)"/);
    assert.ok(m, `the ${name} budget counts rows but names no index`);
    const [, model, cols] = m;
    const body = schema.slice(schema.indexOf(`model ${model} {`));
    const block = body.slice(0, body.indexOf("\n}"));
    const wanted = cols.split(",").map((c) => c.trim()).join(", ");
    assert.match(
      block,
      new RegExp(String.raw`@@(index|unique)\(\[${wanted.replace(/[()]/g, "")}[\],]`),
      `${model} has no index leading on (${wanted}), which the ${name} budget's count rides on`,
    );
  }
});

test("a cached read never reads the session", () => {
  /* Design section 5: a shared cache may only ever hold what everyone who can
     see it gets the same answer to. A cached function that calls auth(),
     cookies() or headers() would serve one member's view to the next. There
     is no shared cache yet (it is scheduled with L5-07); this is in place for
     the day there is. */
  for (const file of filesContaining(/\bunstable_cache\s*\(/)) {
    const src = decomment(read(file));
    for (const m of src.matchAll(/\bunstable_cache\s*\(/g)) {
      const body = balancedBody(src.slice(m.index), "unstable_cache") ?? "";
      assert.doesNotMatch(body, /\b(auth|cookies|headers)\s*\(/, `${file}: a cached function reads the session`);
    }
  }
});

/** The argument text of the call whose "(" is at `open`. */
function argsAt(text, open) {
  for (let i = open, depth = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  return "";
}

/* ------------------------------------------------------------ the instances */
/* One named assertion per O-09 instance closed, so a row cannot regress
   without its own line going red (design section 7). The rest are still on
   BUDGET_EXEMPT as `pending:`, or are not doors at all (C5-01 is the image
   optimizer's config, pinned in security-regressions.test.mjs). */

test("T2a-03: adding people to a Catch-up spends catchupAdds, per person added", () => {
  const body = fnBody(decomment(read("src/app/(main)/catchups/actions.ts")), "addCatchupMembers") ?? "";
  assert.match(body, /hasBudget\("catchupAdds"/, "addCatchupMembers no longer checks its meter");
  assert.match(body, /consume\("catchupAdds"/, "addCatchupMembers no longer spends its meter");
});

test("C6-04: a new search row is one of the member's 200 a day, spent before it is written", () => {
  const body = fnBody(decomment(read("src/lib/search-log.ts")), "logSearch") ?? "";
  const spend = body.indexOf('spendBudget("searchRows", input.userId)');
  const create = body.indexOf("searchLog.create(");
  assert.ok(spend !== -1 && create > spend, "logSearch writes a row without spending searchRows first");
  const entry = budgets.find((b) => b.name === "searchRows")?.text ?? "";
  assert.match(entry, /limit: 200,/, "searchRows' ceiling moved; re-argue it in daily-budget.ts");
  assert.match(entry, /sentence: null/, "a refused search row must be silent: the search itself has answered");
});

test("T2b-02: a link the server has never fetched spends its writer's previewFetches, at every door", () => {
  const src = decomment(read("src/lib/link-preview.ts"));
  const ensure = fnBody(src, "ensureLinkPreviews") ?? "";
  assert.match(ensure, /const fresh = wanted\.filter\(\(l\) => !byUrl\.has\(l\.url\)\)/, "new urls are no longer told apart from retries");
  const left = ensure.indexOf('budgetLeft("previewFetches", memberId)');
  const spend = ensure.indexOf('spendBudget("previewFetches", memberId, room)');
  const fetch = ensure.indexOf("resolveAndStore(");
  assert.ok(left !== -1 && spend > left && fetch > spend, "ensureLinkPreviews fetches before it has spent the writer's budget");

  const entry = budgets.find((b) => b.name === "previewFetches")?.text ?? "";
  assert.match(entry, /limit: 40,/, "previewFetches' ceiling moved; re-argue it in daily-budget.ts");
  assert.match(entry, /outage: "closed"/, "a preview is decoration: an Upstash outage must cost a card, not open a free fetcher");

  /* Every call names whose day it spends, and a reader is never charged:
     the read loaders go through the by-writer door. */
  for (const file of filesContaining(/\bscheduleLinkPreviews(ByWriter)?\s*\(/).filter((f) => f !== "src/lib/link-preview.ts")) {
    const text = decomment(read(file));
    for (const m of text.matchAll(/\bscheduleLinkPreviews\s*\(/g)) {
      assert.match(argsAt(text, m.index + m[0].length - 1), /,\s*session\.user\.id\s*$/, `${file}: scheduleLinkPreviews is not charged to the saver`);
    }
  }
  for (const file of ["src/lib/posts.ts", "src/lib/catchups-edition-view.ts"]) {
    const text = decomment(read(file));
    assert.match(text, /scheduleLinkPreviewsByWriter\(/, `${file}: the read path no longer charges each link to its writer`);
    assert.doesNotMatch(text, /\bscheduleLinkPreviews\s*\(/, `${file}: the read path charges somebody other than the writer`);
  }
});

test("C6-03: a draft is counted against its ceiling before it is written, and never fetches a link for an unverified writer", () => {
  const body = fnBody(decomment(read("src/app/(main)/feed/actions.ts")), "createPost") ?? "";
  const twin = body.indexOf("if (twin)");
  const spend = body.search(/spendBudget\(confirmed \? "letterDrafts" : "letterDraftsUnconfirmed", session\.user\.id\)/);
  const create = body.indexOf("prisma.post.create(");
  assert.ok(twin !== -1 && spend > twin, "the draft ceiling runs before the twin check, so a double-submitted last draft is refused");
  assert.ok(create > spend, "a draft is written before its ceiling is counted");
  assert.match(body.slice(body.lastIndexOf("if (isDraft)", spend), spend), /requireVerifiedEmail\(\)/, "the ceiling no longer follows whether the email is confirmed");
  for (const [name, limit] of [["letterDrafts", 20], ["letterDraftsUnconfirmed", 3]]) {
    const entry = budgets.find((b) => b.name === name)?.text ?? "";
    assert.match(entry, new RegExp(`limit: ${limit},`), `${name}' ceiling moved; re-argue it in daily-budget.ts`);
    assert.match(entry, /window: "standing"/, `${name} must count what the account keeps, not what it wrote today`);
  }

  const ensure = fnBody(decomment(read("src/lib/link-preview.ts")), "ensureLinkPreviews") ?? "";
  const stage = ensure.indexOf("await fetchesFor(memberId)");
  assert.ok(stage !== -1 && stage < ensure.indexOf('budgetLeft("previewFetches"'), "a new link is fetched for a writer nobody has verified");
  assert.match(fnBody(decomment(read("src/lib/link-preview.ts")), "fetchesFor") ?? "", /verifyState === "verified" && !row\.isBlocked/);
});

/* ------------------------------------------------------------ Stage 0 */
/* Every action an account that never confirmed its email can reach that
   writes a row, each with the ceiling that bounds it (bug audit 3, C6-03:
   the signup meter's comment said such an account "can write nothing", and a
   draft was the hole). `proof` is what must still be true for the ceiling to
   hold, read off the file it names. A new action that writes without the
   Stage 2 gate fails the sweep below until it is listed here with its
   ceiling. Admin actions are the owner's and are not here. */
const STAGE0_WRITERS = {
  "src/app/(main)/feed/actions.ts": {
    createPost: { ceiling: "letter drafts: 3 kept before the email is confirmed, 20 after (C6-03)", file: "src/app/(main)/feed/actions.ts", proof: /"letterDraftsUnconfirmed"/ },
    toggleBookmark: { ceiling: "one bookmark per member per post", file: "prisma/schema.prisma", proof: /model Bookmark \{[\s\S]*?@@unique\(\[userId, postId\]\)/ },
    deleteDraft: { ceiling: "queues the author's own photographs for deletion, at most MAX_IMAGES a post", file: "src/app/(main)/feed/actions.ts", proof: /reason: "post"/ },
    deletePost: { ceiling: "queues the author's own photographs for deletion, at most MAX_IMAGES a post", file: "src/app/(main)/feed/actions.ts", proof: /reason: "post"/ },
  },
  "src/app/(main)/catchups/actions.ts": {
    setCatchupArchived: { ceiling: "one preference row per member per Catch-up", file: "prisma/schema.prisma", proof: /@@unique\(\[catchupId, userId\]\)\s*\n\s*@@map\("CatchupReminderPref"\)/ },
    setReminderPref: { ceiling: "one preference row per member per Catch-up", file: "prisma/schema.prisma", proof: /@@unique\(\[catchupId, userId\]\)\s*\n\s*@@map\("CatchupReminderPref"\)/ },
  },
  "src/app/(main)/messages/actions.ts": {
    startThread: { ceiling: "MAX_NEW_THREADS_PER_HOUR, kept two years", file: "src/lib/admin-threads-server.ts", proof: /MAX_NEW_THREADS_PER_HOUR/ },
    replyToThread: { ceiling: "MAX_MESSAGES_PER_HOUR, kept two years", file: "src/lib/admin-threads-server.ts", proof: /MAX_MESSAGES_PER_HOUR/ },
  },
  "src/app/(main)/support/actions.ts": {
    /* A rate, not a size: an unpaid order is a row kept with the payment
       records. Noted in O2's report for Phase J, which holds this file. */
    startContribution: { ceiling: "the contributions meter, ten an hour", file: "src/app/(main)/support/actions.ts", proof: /rateLimit\("contributions"/ },
  },
  "src/components/auth/actions.ts": {
    registerUser: { ceiling: "the signup meter, ten an hour per address, behind Turnstile and the entry question", file: "src/components/auth/actions.ts", proof: /rateLimit\("signup"/ },
  },
  "src/components/auth/trivia-actions.ts": {
    getTriviaQuestion: { ceiling: "TRIVIA_ROWS_PER_HOUR (C4-01 sizes it)", file: "src/lib/trivia-log.ts", proof: /TRIVIA_ROWS_PER_HOUR/ },
    checkTrivia: { ceiling: "TRIVIA_ROWS_PER_HOUR (C4-01 sizes it)", file: "src/lib/trivia-log.ts", proof: /TRIVIA_ROWS_PER_HOUR/ },
  },
};

const WRITES_A_ROW = /\.(create|createMany|upsert)\s*\(|\brecordTrivia\s*\(/;
const STAGE2 = /\brequireVerifiedMember\s*\(/;
const ADMIN = /\b(requireAdminAction|requireAdminActor|requireAdmin|actingAdmin)\s*\(|role\s*!==\s*"admin"/;

test("every row a never-confirmed account can write is on the Stage 0 list, with its ceiling", () => {
  const found = [];
  for (const file of actionFiles) {
    const src = decomment(read(file));
    const fns = [...src.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    for (const door of doorsOf(file, src)) {
      const own = fnBody(src, door) ?? "";
      // Its own body and the same-file helpers it calls.
      const whole = [own, ...fns.filter((h) => h !== door && callsAny(own, [h])).map((h) => fnBody(src, h) ?? "")].join("\n");
      if (!WRITES_A_ROW.test(whole) || ADMIN.test(whole)) continue;
      /* No Stage 2 gate at all, or createPost's, the one that sits behind a
         condition (a letter draft skips it, audit M32). */
      const gated = STAGE2.test(whole) && !(file === "src/app/(main)/feed/actions.ts" && door === "createPost");
      if (!gated) found.push(`${file} → ${door}`);
    }
  }
  const listed = Object.entries(STAGE0_WRITERS).flatMap(([file, doors]) => Object.keys(doors).map((d) => `${file} → ${d}`));
  assert.deepEqual(found.sort(), listed.sort(), "the Stage 0 writers changed: list each with the ceiling that bounds it, or delete a stale one");
  for (const [file, doors] of Object.entries(STAGE0_WRITERS)) {
    for (const [door, { ceiling, file: proofFile, proof }] of Object.entries(doors)) {
      assert.match(read(proofFile), proof, `${file} → ${door}: its ceiling (${ceiling}) is no longer where the list says`);
    }
  }
});

test("createPost's Stage 2 gate is skipped for a letter draft and for nothing else", () => {
  const body = fnBody(decomment(read("src/app/(main)/feed/actions.ts")), "createPost") ?? "";
  assert.match(body, /if \(!savingDraft\) \{\s*const gate = await requireVerifiedMember\(\);/, "createPost's gate moved; the Stage 0 list's reasoning about it no longer holds");
});
