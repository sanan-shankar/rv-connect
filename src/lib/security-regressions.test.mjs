import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  Regression pins for the two CRITICAL findings (audit H17, pinning C1
 *  and C2 closed). Static-shape assertions in the demo.test.mjs style:
 *  they read the real source and fail the unit-test gate the moment the
 *  dangerous shape reappears, whoever reintroduces it and however
 *  innocently. The behavioural proof lives in the phase probes; this is
 *  the tripwire that runs on every `npm run check` and in CI.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

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
  /* Three stay, and none of them is an image host. r2.cloudflarestorage.com is
     the presigned-PUT endpoint: account-scoped, and reached only with a URL
     our own server signed. posthog.com and razorpay.com are third-party SDK
     hosts whose own subdomains move. Each carries its reasoning in
     next.config.ts beside it. */
  const offenders = wildcards.filter(
    (w) => !/r2\.cloudflarestorage\.com|posthog\.com|razorpay\.com/.test(w)
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
