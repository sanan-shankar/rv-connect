import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  The purge has to be honest about what it removed.
 *
 *  Three things used to conspire (bug audit B-011, B-012, B-013):
 *  `delImageByKey`'s catch block was empty, so an R2 failure produced no
 *  signal at all; the purge counted `deleted += 1` per ATTEMPT, so the
 *  audit line reported objects that were still live; and the URL list only
 *  ever existed in a local array, so a failure mid-loop lost the keys
 *  forever -- the rows that named them had already cascaded away.
 *
 *  Static-shape assertions, in the security-regressions.test.mjs style:
 *  the behaviour needs a database and an R2 outage to exercise, but the
 *  shapes that made it possible can be pinned closed on every check.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("a refused R2 delete is reported, not swallowed", () => {
  const src = decomment(read("src/lib/storage.ts"));
  const fn = src.slice(src.indexOf("export async function delImageByKey"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);
  assert.ok(
    /catch\s*\(/.test(body),
    "delImageByKey catches without binding the error again — it cannot log what failed"
  );
  assert.ok(/console\.error/.test(body), "delImageByKey no longer logs a failed delete");
  assert.ok(
    /Promise<boolean>/.test(body),
    "delImageByKey no longer tells its caller whether the object is gone"
  );
});

test("the purge counts objects gone, not delete attempts", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const fn = src.slice(src.indexOf("export async function purgeUserAccount"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);
  assert.ok(
    !/for \(const url of urls\)/.test(body),
    "purgeUserAccount deletes in a loop of its own again; the count it returns " +
      "is attempts, and the audit line quoting it is a lie (B-013)"
  );
  assert.ok(
    /drainPendingImagePurges/.test(body),
    "purgeUserAccount no longer takes its count from the drain, which is the " +
      "only thing that knows whether R2 accepted the delete"
  );
  assert.ok(
    /imagesFailed/.test(src),
    "PurgeResult no longer carries a failure count, so the audit line cannot be honest"
  );
});

test("the image worklist is durable before the rows go", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const txStart = src.indexOf("prisma.$transaction");
  assert.ok(txStart > -1, "purgeUserAccount no longer uses a transaction");
  const tx = src.slice(txStart, src.indexOf("catch", txStart));
  assert.ok(
    tx.indexOf("pendingImagePurge.createMany") > -1,
    "the pending-image worklist is not written inside the delete transaction"
  );
  assert.ok(
    tx.indexOf("pendingImagePurge.createMany") < tx.indexOf("user.delete"),
    "the worklist is written after the delete, which is too late to help"
  );
});

test("what the purge could not delete is retried by the nightly sweep", () => {
  const src = decomment(read("src/lib/retention.ts"));
  assert.ok(
    /drainPendingImagePurges\(\)/.test(src),
    "the retention sweep no longer drains the pending-image worklist"
  );
});

test("admin-thread screenshots are collected before the thread cascades", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.ok(
    /adminMessage\.findMany/.test(src) && /imageUrl/.test(src),
    "collectImageUrls no longer reads AdminMessage.imageUrl; those screenshots " +
      "become unreachable orphans the moment the thread cascades (B-012)"
  );
});
