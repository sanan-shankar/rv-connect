#!/usr/bin/env node
/**
 * Prove the demo write-guard actually bites AT RUNTIME.
 *
 *   npx tsx scripts/demo/verify-guard.mts
 *
 * src/lib/demo.test.mjs unit-tests the POLICY (demoWriteAllowed). This tests
 * the WIRING: that the `$extends` in src/lib/prisma.ts is really in the query
 * path, against a real Postgres, with DEMO_MODE=1 set the way the deployment
 * sets it. A correct policy that was never actually attached to the client
 * would pass every unit test and protect nothing, and that is exactly the
 * class of mistake worth a round trip to the database to rule out.
 *
 * Runs against the demo database only, and cleans up after itself.
 */

import { readFileSync } from "node:fs";

// Env first, before anything constructs a client.
for (const line of readFileSync(".env.demo", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[m[1]] = v;
}

if (process.env.DEMO_MODE !== "1") {
  console.error("Refusing to run: .env.demo does not set DEMO_MODE=1");
  process.exit(1);
}

const { prisma } = await import("../../src/lib/prisma.js");
const { DEMO_USER_ID } = await import("../../src/lib/demo.js");

let pass = 0;
let fail = 0;

async function allowed(what: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  ok      ${what}`);
    pass++;
  } catch (e) {
    console.log(`  BROKEN  ${what} -> ${(e as Error).message.split("\n")[0]}`);
    fail++;
  }
}

async function refused(what: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  LEAK    ${what} was NOT blocked`);
    fail++;
  } catch (e) {
    const msg = (e as Error).message.split("\n")[0];
    const isOurs = (e as { isDemoBlock?: boolean }).isDemoBlock === true;
    console.log(`  ok      ${what} refused${isOurs ? "" : ` (${msg})`}`);
    pass++;
  }
}

console.log("\nWrites a visitor SHOULD be able to make:");

await allowed("create a post", () =>
  prisma.post.create({
    data: { id: "guardtest-post", authorId: DEMO_USER_ID, content: "guard test" },
  }),
);
await allowed("comment on it", () =>
  prisma.comment.create({
    data: { id: "guardtest-c", postId: "guardtest-post", authorId: DEMO_USER_ID, content: "hi" },
  }),
);
await allowed("love a post", () =>
  prisma.like.create({
    data: { id: "guardtest-l", postId: "guardtest-post", userId: DEMO_USER_ID },
  }),
);
await allowed("rename themselves", () =>
  prisma.user.update({ where: { id: DEMO_USER_ID }, data: { bio: "guard test bio" } }),
);
await allowed("read anybody", () => prisma.user.findMany({ take: 3 }));

console.log("\nWrites a visitor should NOT be able to make:");

await refused("add a Collection photo", () =>
  prisma.photo.create({
    data: {
      id: "guardtest-photo",
      uploaderId: DEMO_USER_ID,
      url: "/x.webp",
      thumbUrl: "/x.webp",
      width: 1,
      height: 1,
      subject: "campus",
    },
  }),
);
await refused("file a report", () =>
  prisma.report.create({
    data: { id: "guardtest-r", reason: "x", reporterId: DEMO_USER_ID, targetType: "post" },
  }),
);
await refused("make themselves an admin", () =>
  prisma.user.update({ where: { id: DEMO_USER_ID }, data: { role: "admin" } }),
);
await refused("edit somebody else", () =>
  prisma.user.update({ where: { id: "demo-u-gita-raman" }, data: { name: "Hacked" } }),
);
await refused("rename everybody at once", () =>
  prisma.user.updateMany({ where: {}, data: { name: "Hacked" } }),
);
await refused("delete every post", () => prisma.post.deleteMany({}));
await refused("create an account", () =>
  prisma.user.create({ data: { id: "guardtest-u", name: "New", email: "n@demo.invalid" } }),
);
await refused("forge a session", () =>
  prisma.session.create({
    data: { id: "guardtest-s", sessionToken: "x", userId: DEMO_USER_ID, expires: new Date() },
  }),
);
await refused("write raw SQL", () =>
  prisma.$executeRawUnsafe(`UPDATE "User" SET name = 'Hacked'`),
);

// Confirm the refusals really did nothing, rather than half-succeeding.
console.log("\nDatabase is intact:");
const [users, hacked, posts, photos] = await Promise.all([
  prisma.user.count(),
  prisma.user.count({ where: { name: "Hacked" } }),
  prisma.post.count(),
  prisma.photo.count(),
]);
console.log(`  ${users} people, ${posts} posts, ${photos} photos, ${hacked} named "Hacked"`);
if (hacked !== 0 || users !== 40) {
  console.log("  DAMAGE: the guard let something through");
  fail++;
} else {
  pass++;
}

// Clean up what the allowed writes made, so the demo is left as it was.
await prisma.like.deleteMany({ where: { id: "guardtest-l" } });
await prisma.comment.deleteMany({ where: { id: "guardtest-c" } });
await prisma.post.deleteMany({ where: { id: "guardtest-post" } });
await prisma.user.update({ where: { id: DEMO_USER_ID }, data: { bio: null } });

console.log(`\n${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
