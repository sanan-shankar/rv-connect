import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { demoWriteAllowed, DEMO_CLOSED_PATHS, DEMO_USER_ID } from "./demo.ts";

/* ------------------------------------------------------------------ *
 *  These tests are the demo's security policy written down.
 *
 *  demoWriteAllowed() is the last thing standing between a public link
 *  and the database behind it, so the cases below are deliberately
 *  phrased as attacks rather than as behaviours: each one names what a
 *  visitor would be able to do if the check regressed.
 * ------------------------------------------------------------------ */

test("reads are never blocked", () => {
  for (const op of ["findUnique", "findMany", "count", "aggregate", "groupBy"]) {
    assert.equal(demoWriteAllowed("User", op), true, `${op} should pass`);
    assert.equal(demoWriteAllowed("Report", op), true, `${op} should pass`);
  }
});

test("the surfaces that make the demo feel alive stay writable", () => {
  for (const model of [
    "Post",
    "Comment",
    "Like",
    "CommentLike",
    "Bookmark",
    "PollVote",
    "PhotoLove",
    "CatchupEntry",
    "CatchupEntryLove",
    "Notification",
    "UserPlace",
  ]) {
    assert.equal(demoWriteAllowed(model, "create", {}), true, `${model} create`);
    assert.equal(demoWriteAllowed(model, "delete", {}), true, `${model} delete`);
  }
});

test("a visitor cannot put bytes in the bucket", () => {
  // The single most dangerous thing a public link can offer a stranger.
  // Photo rows are only ever created by an upload, so the model is closed.
  assert.equal(demoWriteAllowed("Photo", "create", {}), false);
  assert.equal(demoWriteAllowed("Photo", "update", {}), false);
});

test("a visitor cannot summon a human or spend money", () => {
  for (const model of ["Report", "AdminThread", "AdminMessage", "Contribution"]) {
    assert.equal(demoWriteAllowed(model, "create", {}), false, model);
  }
});

test("a visitor cannot touch the auth substrate", () => {
  for (const model of ["Account", "Session", "VerificationToken"]) {
    assert.equal(demoWriteAllowed(model, "create", {}), false, model);
    assert.equal(demoWriteAllowed(model, "deleteMany", {}), false, model);
  }
});

test("raw SQL writes are refused, raw SQL reads are not", () => {
  // Raw calls carry no model, so they cannot be judged against the model
  // allowlist and are judged by operation instead. queryRaw has to survive:
  // the directory map's gazetteer lookup (src/lib/geocode.ts) is one.
  for (const op of ["executeRaw", "$executeRaw", "executeRawUnsafe", "$executeRawUnsafe"]) {
    assert.equal(demoWriteAllowed(undefined, op, {}), false, op);
  }
  for (const op of ["queryRaw", "$queryRaw", "queryRawUnsafe", "$queryRawUnsafe"]) {
    assert.equal(demoWriteAllowed(undefined, op, {}), true, op);
  }
});

test("anything else without a model is refused rather than guessed at", () => {
  assert.equal(demoWriteAllowed(undefined, "create", {}), false);
  assert.equal(demoWriteAllowed(undefined, "findMany", {}), false);
  assert.equal(demoWriteAllowed("", "update", {}), false);
});

test("an unfiltered bulk write is refused even on a writable model", () => {
  // Post is writable, but "delete every post" is not a thing the product
  // does. Found live by scripts/demo/verify-guard.mts: before this check,
  // post.deleteMany({}) emptied the demo feed in one call.
  for (const model of ["Post", "Comment", "Like", "Notification", "CatchupEntry"]) {
    assert.equal(demoWriteAllowed(model, "deleteMany", {}), false, `${model} deleteMany {}`);
    assert.equal(
      demoWriteAllowed(model, "deleteMany", { where: {} }),
      false,
      `${model} deleteMany empty where`,
    );
    assert.equal(
      demoWriteAllowed(model, "updateMany", { where: {}, data: { content: "x" } }),
      false,
      `${model} updateMany empty where`,
    );
  }
});

test("a scoped bulk write still works, because the app relies on it", () => {
  // Every deleteMany/updateMany in the app narrows itself: notifications for
  // one user, places for one user, reminders for one edition. Breaking these
  // would break "mark all read" and the profile's city editor.
  assert.equal(
    demoWriteAllowed("Notification", "updateMany", {
      where: { userId: DEMO_USER_ID, read: false },
      data: { read: true },
    }),
    true,
  );
  assert.equal(
    demoWriteAllowed("UserPlace", "deleteMany", { where: { userId: DEMO_USER_ID } }),
    true,
  );
});

test("a visitor may edit their own profile", () => {
  assert.equal(
    demoWriteAllowed("User", "update", {
      where: { id: DEMO_USER_ID },
      data: { name: "Someone Else", bio: "hello", currentCity: "goa" },
    }),
    true,
  );
});

test("a visitor cannot make themselves an admin", () => {
  assert.equal(
    demoWriteAllowed("User", "update", {
      where: { id: DEMO_USER_ID },
      data: { role: "admin" },
    }),
    false,
  );
});

test("a visitor cannot launder their own standing or unblock themselves", () => {
  for (const data of [
    { verifyState: "verified" },
    { verifiedAt: new Date() },
    { isBlocked: false },
    { photoTrusted: true },
  ]) {
    assert.equal(
      demoWriteAllowed("User", "update", { where: { id: DEMO_USER_ID }, data }),
      false,
      JSON.stringify(data),
    );
  }
});

test("a visitor cannot take over an identity", () => {
  for (const data of [{ email: "real@person.com" }, { password: "hash" }]) {
    assert.equal(
      demoWriteAllowed("User", "update", { where: { id: DEMO_USER_ID }, data }),
      false,
      JSON.stringify(data),
    );
  }
});

test("a visitor cannot point an image tag wherever they like", () => {
  // photoUrl and coverPhoto are upload outputs, and the demo takes no
  // uploads, so a writable one would only ever be an arbitrary remote URL.
  for (const data of [{ photoUrl: "https://elsewhere/x.png" }, { coverPhoto: "https://elsewhere/y.png" }]) {
    assert.equal(
      demoWriteAllowed("User", "update", { where: { id: DEMO_USER_ID }, data }),
      false,
      JSON.stringify(data),
    );
  }
});

test("a visitor cannot edit anybody else", () => {
  assert.equal(
    demoWriteAllowed("User", "update", {
      where: { id: "demo-u-gita-raman" },
      data: { name: "Hacked" },
    }),
    false,
  );
});

test("a visitor cannot edit everybody at once", () => {
  // A `where` that is not an exact id match is refused rather than analysed.
  for (const where of [{}, { role: "member" }, { id: { not: "nobody" } }, { NOT: { id: "x" } }]) {
    assert.equal(
      demoWriteAllowed("User", "updateMany", { where, data: { name: "Hacked" } }),
      false,
      JSON.stringify(where),
    );
  }
});

test("a visitor cannot smuggle a write through a nested relation", () => {
  // Prisma lets `data` carry nested creates. Any object-valued field on an
  // otherwise allowlisted column is refused, because what it writes is not
  // decidable from the column name.
  assert.equal(
    demoWriteAllowed("User", "update", {
      where: { id: DEMO_USER_ID },
      data: { name: "Fine", posts: { create: { content: "x" } } },
    }),
    false,
  );
  assert.equal(
    demoWriteAllowed("User", "update", {
      where: { id: DEMO_USER_ID },
      data: { places: { deleteMany: {} } },
    }),
    false,
  );
});

test("a visitor cannot create or delete accounts", () => {
  assert.equal(demoWriteAllowed("User", "create", { data: { name: "New" } }), false);
  assert.equal(demoWriteAllowed("User", "delete", { where: { id: DEMO_USER_ID } }), false);
  assert.equal(demoWriteAllowed("User", "upsert", { where: { id: DEMO_USER_ID } }), false);
});

test("the closed-path list in proxy.ts matches the one in demo.ts", () => {
  // proxy.ts is bundled for the edge runtime and cannot import demo.ts, so
  // it keeps its own copy. This is the thing that stops the two drifting:
  // close a route in one place and forget the other, and this fails.
  const here = dirname(fileURLToPath(import.meta.url));
  const proxySrc = readFileSync(resolve(here, "../proxy.ts"), "utf8");

  const block = proxySrc.match(/const DEMO_CLOSED_PATHS = \[([\s\S]*?)\];/);
  assert.ok(block, "DEMO_CLOSED_PATHS not found in proxy.ts");

  const inProxy = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    inProxy.slice().sort(),
    DEMO_CLOSED_PATHS.slice().sort(),
    "proxy.ts and demo.ts disagree about which routes the demo closes",
  );
});
