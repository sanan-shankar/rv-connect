import assert from "node:assert/strict";
import test from "node:test";
import { read } from "./test-kit.mjs";

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
  const proxySrc = read("src/proxy.ts");

  const block = proxySrc.match(/const DEMO_CLOSED_PATHS = \[([\s\S]*?)\];/);
  assert.ok(block, "DEMO_CLOSED_PATHS not found in proxy.ts");

  const inProxy = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    inProxy.slice().sort(),
    DEMO_CLOSED_PATHS.slice().sort(),
    "proxy.ts and demo.ts disagree about which routes the demo closes",
  );
});

/* ------------------------------------------------------------------ *
 *  ...and the writes the demo's OWN screens make must be allowed.
 *
 *  The allowlist is the demo's safety, and it is also its usability: a
 *  column a real screen writes but nobody listed is refused by the Prisma
 *  layer, which throws, which the profile's autosave catches and prints as
 *  "That did not save. Check your connection." updateContactMethods writes
 *  showEmail, phone and phones on EVERY save whatever the visitor touched,
 *  and none of the three was listed -- so editing an Instagram handle in the
 *  demo failed and blamed the network (bug-report-2 C-044).
 *
 *  Derived from the action's own source, so a new column added to that write
 *  fails here until somebody decides whether the demo may have it.
 * ------------------------------------------------------------------ */

test("every column the contact editor writes is one the demo may write", () => {
  const src = read("src/components/profile/profile-actions.ts");
  const fn = src.slice(src.indexOf("export async function updateContactMethods"));
  const update = fn.slice(fn.indexOf("prisma.user.update"));
  const dataBlock = update.slice(update.indexOf("data: {"), update.indexOf("\n  });"));
  const columns = [...new Set([...dataBlock.matchAll(/^\s{6}([A-Za-z][A-Za-z0-9_]*):/gm)].map((m) => m[1]))];
  assert.ok(columns.length >= 5, `only scraped ${columns} from the contact write; the slice has drifted`);

  const data = Object.fromEntries(columns.map((c) => [c, null]));
  assert.equal(
    demoWriteAllowed("User", "update", { where: { id: DEMO_USER_ID }, data }),
    true,
    `the demo refuses a contact save that writes: ${columns.join(", ")}. The visitor is told to ` +
      `check their connection, which is not what went wrong.`
  );
});

test("the demo says why it will not remove a photo, rather than failing", () => {
  // photoUrl stays off the allowlist on purpose -- it is an upload output and
  // the demo takes no uploads -- so the action has to refuse in words at the
  // front door, the way updateAvatar does, or the Prisma layer refuses it in
  // the language of a network error.
  assert.equal(
    demoWriteAllowed("User", "update", { where: { id: DEMO_USER_ID }, data: { photoUrl: null } }),
    false,
    "photoUrl became writable in the demo; it is an upload output"
  );
  const actions = read("src/components/settings/actions.ts");
  const fn = actions.slice(actions.indexOf("export async function removeAvatar"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /IS_DEMO/, "removeAvatar has no demo sentence, so it fails as a connection error");
  assert.ok(
    body.indexOf("IS_DEMO") < body.indexOf("swapPhotoUrl"),
    "the demo sentence comes after the write it exists to prevent"
  );
});

test("the demo's flagship flow can actually finish", () => {
  /* "Start a Catch-up" is a permanent button on the demo's Catch-ups index
     and /catchups/new is deliberately open, so the creating transaction has
     to pass the write guard end to end. It did not: Group and GroupMember
     were missing from the allowlist, the very first write threw, and the
     visitor was told "Something went wrong. Please try again." on every
     attempt, for ever (audit C-113).

     The models are DERIVED from the transaction rather than listed here, so a
     write added to it later cannot quietly re-open the same hole. */
  const src = read("src/app/(main)/catchups/actions.ts");
  const fn = src.slice(src.indexOf("export async function createCatchupWithPeople"));
  const tx = fn.slice(fn.indexOf("prisma.$transaction"), fn.indexOf("\n  });"));
  const written = new Set(
    [...tx.matchAll(/\btx\.([a-zA-Z]+)\.(create|createMany|update|updateMany|upsert)\b/g)].map(
      (m) => m[1][0].toUpperCase() + m[1].slice(1)
    )
  );
  // Nested relation creates ride on their parent's permission, but the rows
  // they make are still rows: name them too.
  if (/members:\s*\{\s*create:/.test(tx)) written.add("GroupMember");

  assert.ok(written.size >= 4, `only scraped ${[...written]} from the creating transaction; the slice has drifted`);
  for (const model of written) {
    assert.equal(
      demoWriteAllowed(model, "create", {}),
      true,
      `starting a Catch-up writes ${model}, which the demo refuses -- so the ` +
        `visitor gets a generic retry message on a flow the demo opens to them`
    );
  }
});
