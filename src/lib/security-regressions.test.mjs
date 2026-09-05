import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { ROOT, read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Regression pins for the two CRITICAL findings (audit H17, pinning C1
 *  and C2 closed). Static-shape assertions in the demo.test.mjs style:
 *  they read the real source and fail the unit-test gate the moment the
 *  dangerous shape reappears, whoever reintroduces it and however
 *  innocently. The behavioural proof lives in the phase probes; this is
 *  the tripwire that runs on every `npm run check` and in CI.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------- C1: the admin takeover */

test("C1-a: authorize() grants nothing by email match", () => {
  const src = decomment(read("src/lib/auth.ts"));
  assert.ok(!src.includes("ADMIN_EMAIL"), "auth.ts references ADMIN_EMAIL again");
  assert.ok(!/role:\s*["']admin["']/.test(src), "auth.ts hard-codes an admin role grant");
});

test("C1-b: the password-less admin-login route stays deleted", () => {
  assert.ok(
    !existsSync(resolve(ROOT, "src/app/api/auth/admin-login")),
    "/api/auth/admin-login exists again"
  );
});

test("C1-b: dev-login is dead in production and never grants a role", () => {
  const src = decomment(read("src/app/api/dev-login/route.ts"));
  assert.ok(/NODE_ENV/.test(src) && /production/.test(src), "no production kill-switch");
  assert.ok(/DEV_LOGIN_SECRET/.test(src), "no secret required");
  assert.ok(/timingSafeEqual/.test(src), "secret not compared constant-time");
  // Reading the row's role into the token (role: user.role) is the correct
  // mirror of authorize(); what must never come back is a role set from a
  // LITERAL, which is what the deleted admin-login route did.
  assert.ok(!/role:\s*["']/.test(src), "dev-login assigns a hard-coded role");
});

test("C1-c: the admin email is not compiled into the browser bundle", () => {
  // git grep finds candidates; each is then re-checked with comments
  // stripped, because the one legitimate place the name may appear is a
  // comment explaining its removal (the plan's known trap 2 — this exact
  // false positive broke audit-status probes on their first run too).
  // The name itself is SPLIT here so that this test never becomes the one
  // src/ reference the audit-status C1-c probe finds (which happened).
  const NAME = ["NEXT_PUBLIC", "ADMIN_EMAIL"].join("_");
  const hits = execSync(`git grep -l ${NAME} -- src || true`, {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => f !== "src/lib/security-regressions.test.mjs")
    .filter((f) => decomment(read(f)).includes(NAME));
  assert.deepEqual(hits, [], `${NAME} referenced (outside comments) in: ${hits}`);
});

/* --------------------------------------------- C2: arbitrary R2 deletion */

test("C2: keyForUrl refuses keys outside the app's own roots", () => {
  const src = decomment(read("src/lib/storage.ts"));
  assert.ok(/KNOWN_ROOTS/.test(src), "the root fence is gone from storage.ts");
  const keyForUrl = src.slice(src.indexOf("function keyForUrl"));
  assert.ok(/KNOWN_ROOTS/.test(keyForUrl), "keyForUrl no longer checks the roots");
  // ...and refuses a traversal segment, so the local-dev filesystem branch
  // cannot be walked out of public/ even if a caller-shaped URL reaches it.
  assert.ok(/includes\(["']\.\.["']\)/.test(keyForUrl), "keyForUrl no longer rejects '..'");
});

test("C2: uploads mint under owner-scoped keys", () => {
  const src = decomment(read("src/lib/storage.ts"));
  assert.match(src, /function ownerPrefix/, "ownerPrefix is gone");
  assert.match(src, /function keyBelongsTo/, "keyBelongsTo is gone");
});

/**
 * Server-action files that name caller-supplied image URLs but are NOT
 * required to run the ownership gate, each with the reason. Empty today:
 * every file that reaches the derived list below does gate. An entry here is
 * a reviewed decision; a file quietly missing from BOTH is the accident.
 */
const MINTS_ITS_OWN_BYTES = {
  // e.g. "src/app/(main)/collection/actions.ts":
  //   "takes bytes, not URLs: putAllOrNone mints the keys server-side"
};

test("C2: every write path that accepts image URLs runs the ownership gate", () => {
  /* Derived, not listed. The hard-coded pair this used to check (feed +
     catchups) had already drifted: messages/actions.ts takes a caller-supplied
     imageUrl on all three of its write paths and was unswept, so dropping its
     ownedUploadUrls call would have re-opened C2 -- arbitrary, unrecoverable
     R2 deletion, no bucket versioning -- with every gate green (bug-report-2
     C-193). The candidate set is now every server-action file that so much as
     names `images` or `imageUrl` outside a comment, so a new one joins the
     sweep on the day it is written. */
  const files = execSync(`git grep -l '"use server"' -- 'src/**/*.ts' || true`, {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => /^\s*(['"])use server\1/.test(read(f)))
    .filter((f) => /\bimages\b|\bimageUrls?\b/.test(decomment(read(f))));

  assert.ok(files.length >= 3, `only ${files.length} candidate files; the git grep broke`);
  for (const file of files) {
    if (MINTS_ITS_OWN_BYTES[file]) continue;
    /* The CALL, not the name: matching a bare `ownedUploadUrls` passed
       happily against a file that still imported the helper and had stopped
       calling it, which is the same import-not-call vacuum this repo has hit
       three times now. */
    assert.match(
      decomment(read(file)),
      /ownedUploadUrls\s*\(/,
      `${file} accepts image URLs but no longer validates their ownership`
    );
  }
});

test("the C2 exemption list names only files that still exist", () => {
  for (const file of Object.keys(MINTS_ITS_OWN_BYTES)) {
    assert.ok(existsSync(resolve(ROOT, file)), `${file} is exempted from C2 but is gone (stale entry)`);
  }
});

/* ------------------ C-134: the image optimizer vouches for named hosts only */

test("no wildcard host is allowed to be fetched or optimised", () => {
  /* /_next/image is reachable signed out (avatars render on /login) and
     transforms whatever host remotePatterns vouches for. `*.r2.dev` matched
     every free self-serve Cloudflare bucket in the world, so anybody could
     have this project's Vercel account fetch and transform their bytes, once
     per unique URL, in a loop. The same wildcard sat in img-src and
     connect-src. Named hosts only, in all three. */
  const src = decomment(read("next.config.ts"));
  const wildcards = [...src.matchAll(/["'`](?:https:\/\/)?\*\.[A-Za-z0-9.-]+["'`]/g)].map((m) => m[0]);
  /* Two stay, and neither is an image host. r2.cloudflarestorage.com is the
     presigned-PUT endpoint: account-scoped, and reached only with a URL our
     own server signed. razorpay.com is a third-party SDK host whose own
     subdomains move. Each carries its reasoning in next.config.ts beside it.
     posthog.com was a third until 2026-09-05, when it came out of img-src and
     connect-src: posthog-js is configured with api_host "/ingest" and the
     browser makes every analytics request first-party (checked live: 43
     resources on /login, none to posthog.com). Adding it back should have to
     argue for itself here. */
  const offenders = wildcards.filter(
    (w) => !/r2\.cloudflarestorage\.com|razorpay\.com/.test(w)
  );
  assert.deepEqual(offenders, [], `next.config.ts vouches for wildcard hosts: ${offenders.join(", ")}`);
});

test("the optimizer's host list still covers every base the app accepts", () => {
  // The two files must not drift apart: a URL upload-shared vouches for as
  // ours has to be one next/image will actually render, or old photographs
  // 404 behind a config that has forgotten where they came from.
  const shared = decomment(read("src/lib/upload-shared.ts"));
  const list = shared.slice(shared.indexOf("R2_LEGACY_PUBLIC_BASES"));
  const bases = [...list.slice(0, list.indexOf("]")).matchAll(/https:\/\/([A-Za-z0-9.-]+)/g)].map((m) => m[1]);
  assert.ok(bases.length >= 1, "R2_LEGACY_PUBLIC_BASES no longer parses; the scrape has drifted");

  const config = decomment(read("next.config.ts"));
  for (const host of bases) {
    assert.ok(
      config.includes(host),
      `next.config.ts does not name ${host}, which upload-shared.ts still accepts as one of ours`
    );
  }
});

/* ------------------------------------- M1: profile field mass assignment */

test("M1: updateProfileField whitelists the column before writing", () => {
  // updateProfileField is a "use server" POST and its `field` argument is an
  // erased TS union, so without an allowlist its `default:` branch would write
  // any column (nulling password, wiping adminNote, clearing
  // deletionRequestedAt). The guard must exist AND run before prisma.update.
  const src = decomment(read("src/components/profile/profile-actions.ts"));
  const fn = src.slice(src.indexOf("export async function updateProfileField"));
  const guardAt = fn.search(/EDITABLE_FIELDS\.has\(field\)/);
  const updateAt = fn.search(/prisma\.user\.update/);
  assert.ok(guardAt !== -1, "updateProfileField no longer checks EDITABLE_FIELDS");
  assert.ok(updateAt !== -1, "updateProfileField no longer writes the row");
  assert.ok(guardAt < updateAt, "the field allowlist runs after the write");
});

/* ------------------------------- C-198: analytics never sees a session token */

test("the analytics proxy strips cookies before the rewrite", () => {
  /* posthog-js fires at the same-origin /ingest path, so the browser attaches
     every cookie this site has set -- including the HttpOnly session token --
     and the rewrite hands the whole request to PostHog. Proved with a local
     echo server standing in for the destination: a signed-in browser's
     /ingest requests arrived carrying the full authjs.session-token before
     this, and none after. PostHog identifies events from the payload, never
     from our cookies; a real event still returns 200 Ok with them gone. */
  const src = decomment(read("src/proxy.ts"));
  const branch = src.slice(src.indexOf("export function proxy"));
  const ingestAt = branch.search(/pathname\.startsWith\(["']\/ingest\//);
  assert.ok(ingestAt !== -1, "the proxy no longer recognises the analytics path");
  const strip = branch.slice(ingestAt, ingestAt + 400);
  assert.match(strip, /headers\.delete\(["']cookie["']\)/, "the analytics branch no longer strips the cookie header");
  assert.match(
    strip,
    /NextResponse\.next\(\{\s*request:\s*\{\s*headers/,
    "the stripped headers are not passed on to the rewrite, so nothing changes"
  );

  /* Before the auth branches, or a signed-out /ingest request would be
     redirected to /login and the strip would never run for a signed-in one
     either -- it has to be the first thing this function decides. */
  const authAt = branch.search(/publicPaths/);
  assert.ok(authAt === -1 || ingestAt < authAt, "the cookie strip runs after the auth routing");
});

test("C-060/C-007: a report and the thread that answers it are one write", () => {
  /* Three failures with one root: the report row and its AdminThread were
     separate awaits with nothing making them atomic, and the dedupe that reads
     "is there already an open report" then honoured a half-written one for
     ever. Both report paths are checked, because they are a matched pair and
     half-fixing one of a pair is how this file's other entries came to exist. */
  const src = read("src/components/posts/report-action.ts");
  const code = decomment(src);

  // openReportThread must write through whatever client it is given.
  assert.match(code, /db: Prisma\.TransactionClient \| typeof prisma;/, "openReportThread cannot join a transaction");
  assert.doesNotMatch(
    code.slice(code.indexOf("async function openReportThread"), code.indexOf("export async function reportPost")),
    /await prisma\./,
    "openReportThread still writes through the top-level client, so it cannot be atomic with its report"
  );

  // Both paths create their report INSIDE a transaction that also opens the thread.
  const paths = ["reportPost", "reportUser"];
  for (const name of paths) {
    const from = code.indexOf(`export async function ${name}`);
    assert.ok(from > 0, `${name} is gone`);
    const next = code.indexOf("export async function", from + 10);
    const body = next === -1 ? code.slice(from) : code.slice(from, next);
    assert.match(body, /await prisma\.\$transaction\(async \(tx\) => \{/, `${name} does not write atomically`);
    assert.match(body, /tx\.report\.create\(/, `${name}'s report is created outside its transaction`);
    assert.match(body, /db: tx,/, `${name}'s thread is opened outside its transaction`);
    assert.match(body, /isUniqueViolation\(err\)/, `${name} does not survive losing the unique-index race`);
  }

  // And the dedupe repairs a thread-less report instead of reporting success over it.
  const post = code.slice(code.indexOf("export async function reportPost"), code.indexOf("export async function reportUser"));
  assert.match(post, /if \(!openAlready\.thread\) \{/, "a pending report with no thread is still treated as done");
});

test("C-060: the partial unique index that actually enforces one open report", () => {
  /* It cannot live in schema.prisma -- there is no partial-index syntax -- so
     the SQL file IS the definition and the schema carries only a note. Both
     are pinned, because a rule nothing can see is a rule nothing maintains. */
  const sql = read("prisma/migrations-manual/2026-08-25-report-one-open-per-post.sql");
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS "Report_open_post_per_reporter_key"/);
  assert.match(sql, /WHERE "targetType" = 'post' AND status = 'pending'/, "the index is not partial, so it would need history deleted");
  assert.match(
    read("prisma/schema.prisma"),
    /Report_open_post_per_reporter_key/,
    "schema.prisma does not mention the index it cannot express, so the next reader will not know it exists"
  );
});

test("C-013: the details box cannot compose a string the server refuses", () => {
  const src = read("src/components/posts/report-dialog.tsx");
  assert.match(src, /const DETAILS_MAX =\s*\n?\s*REASON_MAX - Math\.max\(/, "the details cap is not derived from the reasons");
  assert.match(src, /maxLength=\{DETAILS_MAX\}/, "the box still advertises a length the server will refuse");
  /* The server's cap is what DETAILS_MAX is derived against; if it moves, this
     fails. There used to be one per report path and this required at least two
     and checked they agreed. Both paths now share `vetReport`, so there is one
     cap and it cannot disagree with itself -- what is left to check is that it
     is still 500, and that both paths still reach it (the second half is
     profile-editor-rule.test.mjs's C-174). */
  const server = read("src/components/posts/report-action.ts");
  const caps = [...server.matchAll(/trimmed\.length > (\d+)/g)].map((m) => Number(m[1]));
  assert.equal(caps.length, 1, `expected one shared server cap, found ${caps.length}`);
  assert.equal(caps[0], 500, `the report path refuses at ${caps[0]}, but the dialog derives its box from 500`);
});

/* --------------------------------- The Class Collection's scope boundary */

/* The Class Collection puts private photographs in the same table as public
   ones (docs/planning/class-collection/spec.md sec. 3.1). That trade buys the
   viewer, the loves, the purge booking, the quota and both upload paths, and
   it costs a security surface on every photo query in the app. These pins are
   the ongoing payment: they fail the moment a query loses its scope, whoever
   drops it and however innocently. */

test("class: the river cannot be queried without a resolved scope", () => {
  const src = decomment(read("src/app/(main)/collection/actions.ts"));

  /* buildCollectionWhere takes the scope fragment as its FIRST, REQUIRED
     argument rather than reading it off the optional filters. That is the
     whole guard: a caller physically cannot build a Collection `where`
     without having resolved which half the viewer is entitled to. */
  assert.ok(
    /function buildCollectionWhere\(\s*scopeWhere:/.test(src),
    "buildCollectionWhere no longer takes a mandatory scope fragment"
  );
  assert.ok(
    /\.\.\.scopeWhere,/.test(src),
    "buildCollectionWhere stopped spreading the scope fragment into its where"
  );

  // And the fragment comes from the shared rule, never hand-built here.
  assert.ok(
    /photoScopeWhere\(/.test(src),
    "loadPhotos stopped asking photoScopeWhere which half it may read"
  );
  // An ineligible viewer gets an empty page, never an unscoped query.
  assert.ok(
    /if \(!scopeWhere\) return \{ photos: \[\], nextCursor: null, bands: \[\] \};/.test(src),
    "loadPhotos no longer bails when the viewer is entitled to neither scope"
  );
});

test("class: the permalink and its page title both use the rule", () => {
  // Audits M30/M31 twice over: a list and a permalink disagreeing about who
  // may see something. loadPhoto AND generateMetadata each decide through
  // decidePhotoVisibility rather than restating the checks inline -- the
  // metadata one matters because a caption is content and it goes in a title.
  //
  // Reads collection-data.ts, not actions.ts: loadPhoto moved there on
  // 2026-09-05 so it would stop being a client-callable action endpoint. The
  // pin follows the function, not the filename.
  const data = decomment(read("src/app/(main)/collection/collection-data.ts"));
  assert.ok(
    /export (async function|const) loadPhoto\b/.test(data),
    "loadPhoto is no longer in collection-data.ts; this pin is reading the wrong file"
  );
  assert.ok(
    /decidePhotoVisibility\(/.test(data),
    "loadPhoto stopped deciding through the shared rule"
  );
  /* The title reaches the rule THROUGH loadPhoto rather than calling it again
     (audit 2, C1): one cache()d read answers both. So what this pins is that
     the metadata still gets its caption from the function that decides, and
     never from a lookup of its own -- a hand-rolled photo.findUnique here
     would be the exact regression M30/M31 describe. */
  const page = decomment(read("src/app/(main)/collection/[id]/page.tsx"));
  assert.ok(
    /loadPhoto\(id\)/.test(page),
    "generateMetadata stopped taking its title from loadPhoto, which owns the decision"
  );
  assert.ok(
    !/prisma\.photo\./.test(page),
    "the permalink page queries Photo directly again; the title must come through the rule"
  );
});

test("class: the feed rail's Collection card stays valley-only", () => {
  /* Rendered into every member's rail with no session in it, so an unscoped
     findFirst here puts whichever class most recently uploaded in front of
     the whole membership. */
  const src = decomment(read("src/components/feed/rail/collection-module.tsx"));
  assert.ok(
    /where: \{ scope: "valley",/.test(src),
    "the feed rail's Collection card lost its valley scope"
  );
});

test("class: a contribution's audience is derived, never taken from input", () => {
  const src = decomment(read("src/app/(main)/collection/actions.ts"));

  // classYears is read off the CALLER'S OWN ROW inside contributionScope and
  // nowhere else. A form field or an action argument named classYears would
  // be a member choosing which class's private archive to write into.
  assert.ok(
    /async function contributionScope\(/.test(src),
    "contributionScope is gone; the destination is being resolved somewhere else"
  );
  assert.ok(
    !/formData\.get\(["']classYears["']\)/.test(src),
    "a contribution reads classYears off the form"
  );
  assert.ok(
    !/input\.classYears/.test(src),
    "a contribution reads classYears off its action input"
  );
  // Both write paths go through it.
  assert.equal(
    [...src.matchAll(/await contributionScope\(/g)].length,
    2,
    "expected exactly the two contribute paths to resolve a destination"
  );
  assert.equal(
    [...src.matchAll(/classYears: destination\.classYears,/g)].length,
    2,
    "a contribute path stopped writing the destination it resolved"
  );
});

test("class: photoRowData defaults to the PUBLIC half", () => {
  /* The failure direction that matters. A caller who has not thought about
     scope must publish publicly and be seen doing it -- never write an
     under-scoped row that looks private and is not. src/lib/collection-intake.ts
     relies on exactly this default. */
  const src = decomment(read("src/lib/collection-photo.ts"));
  assert.ok(
    /scope = "valley", classYears = null,/.test(src),
    "photoRowData's scope no longer defaults to valley"
  );
  assert.ok(
    /classYears: scope === "class" \? classYears : null,/.test(src),
    "photoRowData can write an audience onto a valley row"
  );
});

test("class: an unrecognised scope value is never treated as public", () => {
  const src = decomment(read("src/lib/photo-visibility-rule.ts"));
  assert.ok(
    /return scope === "valley";/.test(src),
    "isValley stopped reading the literal, so a typo could read as public"
  );
});
