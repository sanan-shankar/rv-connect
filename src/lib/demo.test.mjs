import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, walk, ROOT } from "./test-kit.mjs";
import { relative, resolve } from "node:path";
import { readFileSync } from "node:fs";

import {
  demoRowsAdded,
  demoWriteAllowed,
  DEMO_CLOSED_PATHS,
  DEMO_NESTED_CREATES,
  DEMO_ROW_CEILINGS,
  DEMO_USER_ID,
} from "./demo.ts";

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

test("a visitor cannot stamp the announcement window as seen", () => {
  assert.equal(
    demoWriteAllowed("User", "updateMany", {
      where: { id: DEMO_USER_ID, OR: [{ announcementSeenAt: null }] },
      data: { announcementSeenAt: new Date() },
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
  // Prisma lets `data` carry nested writes, and the extension in prisma.ts
  // sees only the call's ROOT model. On the persona's own row any
  // object-valued field is refused, because what it writes is not decidable
  // from the column name.
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
  // ...and through any OTHER writable model, which is where it used to get
  // through (bug audit 3, L9-10): both of these passed, judged by their root.
  assert.equal(
    demoWriteAllowed("Post", "update", {
      where: { id: "p" },
      data: { author: { update: { role: "admin" } } },
    }),
    false,
    "a post's update promoted its author to admin",
  );
  assert.equal(
    demoWriteAllowed("Comment", "create", {
      data: { content: "x", post: { update: { reports: { create: { reason: "x" } } } } },
    }),
    false,
    "a comment's create filed a Report, a model the demo refuses, through two writable parents",
  );
  // An upsert hides two payloads and a createMany one per row.
  assert.equal(
    demoWriteAllowed("Like", "upsert", {
      where: { id: "l" },
      create: { postId: "p", userId: DEMO_USER_ID },
      update: { post: { delete: true } },
    }),
    false,
    "an upsert's update half deleted a post through its like",
  );
  assert.equal(
    demoWriteAllowed("Notification", "createMany", { data: [{ user: { update: { isBlocked: false } } }] }),
    false,
    "a createMany row carried a nested write",
  );
  // A relation the product does create through is still held to that: it may
  // only create, and what it creates is judged as a create of its own.
  assert.equal(
    demoWriteAllowed("Post", "update", { where: { id: "p" }, data: { pollOptions: { deleteMany: {} } } }),
    false,
    "a named nested create was allowed to delete",
  );
  assert.equal(
    demoWriteAllowed("Group", "create", {
      data: { name: "x", members: { create: [{ userId: DEMO_USER_ID, user: { update: { role: "admin" } } }] } },
    }),
    false,
    "a roster row carried a write to the person it names",
  );
});

test("values that only look like objects are not nested writes", () => {
  // Dates, atomic number operations and a scalar `set` are columns' values;
  // refusing them would refuse ordinary edits.
  for (const data of [
    { updatedAt: new Date() },
    { count: { increment: 1 } },
    { content: { set: "edited" } },
    { title: null },
  ]) {
    assert.equal(
      demoWriteAllowed("Post", "update", { where: { id: "p" }, data }),
      true,
      JSON.stringify(data),
    );
  }
});

test("the nested writes the product makes still pass", () => {
  // The two the app makes today, with the rows it really writes.
  assert.equal(
    demoWriteAllowed("Post", "create", {
      data: {
        authorId: DEMO_USER_ID,
        content: "Which one?",
        pollOptions: { create: [{ text: "This", position: 0 }, { text: "That", position: 1 }] },
      },
    }),
    true,
    "posting a poll",
  );
  assert.equal(
    demoWriteAllowed("Group", "create", {
      data: {
        name: "Old friends",
        creatorId: DEMO_USER_ID,
        members: { create: [{ userId: DEMO_USER_ID, role: "admin" }, { userId: "demo-u-x", role: "member" }] },
      },
    }),
    true,
    "starting a Catch-up",
  );
});

/* Every nested write in src/, by the relation it names: `field: { verb: ...`.
   A relation write's object holds only verbs, so the verb is its first key. */
const NESTED_WRITE = /\b([A-Za-z]\w*)\s*:\s*\{\s*(create|createMany|connect|connectOrCreate|update|updateMany|upsert|delete|deleteMany|set|disconnect)\s*:/g;

/** model -> { field -> related model }, for the relation fields schema.prisma declares. */
function relationFields() {
  const schema = read("prisma/schema.prisma");
  const models = new Set([...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]));
  const out = new Map();
  for (const block of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const fields = new Map();
    for (const line of block[2].split("\n")) {
      const f = line.match(/^\s+(\w+)\s+(\w+)(\[\])?\??(\s|$)/);
      if (f && models.has(f[2])) fields.set(f[1], f[2]);
    }
    out.set(block[1], fields);
  }
  return out;
}

test("every nested write the app makes through a writable model is one the demo names", () => {
  /* The policy refuses any nested write it was not told about (L9-10), which
     is right for a stranger and wrong for the product: a nested write the
     app itself makes, through a model the demo writes, would be refused in
     the demo and reach the visitor as a generic failure. So every one in the
     source is found here and must be on DEMO_NESTED_CREATES, as a create. */
  const relations = relationFields();
  const found = [];
  for (const full of walk(resolve(ROOT, "src"))) {
    if (/\.test\./.test(full) || full.includes("/lab/")) continue;
    const src = decomment(readFileSync(full, "utf8"));
    for (const m of src.matchAll(NESTED_WRITE)) found.push({ file: relative(ROOT, full), field: m[1], verb: m[2] });
  }
  assert.ok(found.length >= 3, `only ${found.length} nested writes found in src/; re-read this sweep`);
  for (const { file, field, verb } of found) {
    const owners = [...relations].filter(([, fields]) => fields.has(field)).map(([model]) => model);
    assert.ok(owners.length > 0, `${file}: \`${field}: { ${verb}\` names no relation in schema.prisma; re-read this sweep`);
    for (const model of owners) {
      const writable = model === "User" || demoWriteAllowed(model, "create", {});
      if (!writable) continue; // the demo refuses the root itself
      assert.equal(
        demoWriteAllowed(model, "create", { data: { [field]: { [verb]: {} } } }),
        true,
        `${file} writes ${model}.${field} with a nested ${verb}, which the demo refuses: ` +
          `name it in DEMO_NESTED_CREATES (demo.ts) if it is a create the demo should allow`,
      );
    }
  }
});

test("each named nested create reaches the model schema.prisma says it does", () => {
  const relations = relationFields();
  for (const [key, target] of DEMO_NESTED_CREATES) {
    const [model, field] = key.split(".");
    assert.equal(relations.get(model)?.get(field), target, `${key} is not a relation to ${target}`);
    assert.equal(demoWriteAllowed(target, "create", {}), true, `${key} reaches ${target}, which the demo refuses`);
  }
});

test("a create counts the rows it would add, and nothing else adds any", () => {
  assert.equal(demoRowsAdded("create", { data: {} }), 1);
  assert.equal(demoRowsAdded("upsert", { where: {}, create: {}, update: {} }), 1, "an upsert may create");
  assert.equal(demoRowsAdded("createMany", { data: [{}, {}, {}] }), 3);
  assert.equal(demoRowsAdded("$createManyAndReturn", { data: [{}, {}] }), 2);
  for (const op of ["update", "updateMany", "delete", "deleteMany", "findMany", "count"]) {
    assert.equal(demoRowsAdded(op, { data: {} }), 0, op);
  }
});

test("a visitor cannot grow any table without end", () => {
  /* L12-08: every meter is off on the demo and the persona is shared, so the
     only bound on how many rows a script can make is in the write guard.
     Every writable model is held to one of two: a ceiling of its own, or a
     unique key that pairs a person with a parent row (the demo creates no
     people, so such a table holds at most one row per person per parent,
     and the parents are bounded). A new writable model must pick one. */
  const schema = read("prisma/schema.prisma");
  const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const writable = models.filter(([, name]) => demoWriteAllowed(name, "create", {}));
  assert.ok(writable.length >= 15, `only ${writable.length} writable models; re-read this test`);
  for (const [, name, body] of writable) {
    if (DEMO_ROW_CEILINGS.has(name)) continue;
    const keys = [...body.matchAll(/@@(?:unique|id)\(\[([^\]]+)\]/g)].map((m) => m[1].split(",").map((f) => f.trim()));
    const parents = new Set([...body.matchAll(/@relation\([^)]*fields:\s*\[(\w+)\]/g)].map((m) => m[1]));
    const bounded = keys.some(
      (k) => k.some((f) => f === "userId" || f === "authorId") && k.some((f) => f !== "userId" && f !== "authorId" && parents.has(f)),
    );
    assert.ok(
      bounded,
      `${name} is writable in the demo with no row ceiling and no unique key pairing a person with a parent, ` +
        `so a script can grow it without end: give it a number in DEMO_ROW_CEILINGS (demo.ts)`,
    );
  }
  for (const [name, ceiling] of DEMO_ROW_CEILINGS) {
    assert.equal(demoWriteAllowed(name, "create", {}), true, `${name} has a ceiling but is not writable; a stale entry`);
    assert.ok(Number.isInteger(ceiling) && ceiling >= 100, `${name}'s ceiling of ${ceiling} would refuse an ordinary visit`);
  }
});

test("the ceiling is enforced where every query passes, before the query runs", () => {
  const ext = decomment(read("src/lib/prisma.ts"));
  const hook = ext.slice(ext.indexOf("async $allOperations"));
  const body = hook.slice(0, hook.indexOf("return query(args)") + "return query(args)".length);
  for (const needle of ["demoWriteAllowed(", "DEMO_ROW_CEILINGS.get(", "demoRowsAdded(", ".count()", "throw new DemoWriteError("]) {
    assert.ok(body.includes(needle), `the demo extension no longer calls ${needle}`);
  }
  assert.ok(
    body.indexOf("DEMO_ROW_CEILINGS.get(") > body.indexOf("demoWriteAllowed("),
    "the ceiling is counted before the policy has refused what it refuses",
  );
  assert.match(body, /\(client as unknown as/, "the count must go through the plain client, not back through the extension");
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
