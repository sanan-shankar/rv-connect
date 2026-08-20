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

test("C2: every write path that accepts image URLs runs the ownership gate", () => {
  for (const file of [
    "src/app/(main)/feed/actions.ts",
    "src/app/(main)/catchups/actions.ts",
  ]) {
    assert.ok(
      /ownedUploadUrls/.test(decomment(read(file))),
      `${file} no longer validates image URL ownership`
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
