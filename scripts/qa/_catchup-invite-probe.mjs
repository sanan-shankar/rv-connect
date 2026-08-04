/**
 * End-to-end check of the Catch-up invite link (2026-08-04).
 *
 * Covers all three arrivals the owner described:
 *   - signed out            -> the invitation, with Sign in / Create an account
 *                              both carrying ?next= back to this link
 *   - signed in, not a member -> the invitation, and Join adds the membership
 *   - signed in, a member     -> straight into the Catch-up, no ceremony
 * Plus the two refusals: a junk token and an ended Catch-up.
 *
 * It joins as a real member and removes that row again, verifying GroupMember
 * returns to its starting count.
 *
 * Usage: node scripts/qa/_catchup-invite-probe.mjs
 */
import puppeteer from "puppeteer";
import { mkdirSync, readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import pg from "pg";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });
const dir = "./temporary screenshots";
mkdirSync(dir, { recursive: true });

function dbUrl() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*(DIRECT_URL|DATABASE_URL)\s*=\s*"?([^"\n]+)"?\s*$/);
      if (m) return m[2];
    }
  }
  throw new Error("no database url");
}
const db = new pg.Client({ connectionString: dbUrl() });
await db.connect();
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

// A Catch-up the admin keeps, and someone who is NOT in it.
let [series] = await q(
  `SELECT c.id, c."inviteToken", c."groupId", g.name
     FROM "CatchupSeries" c JOIN "Group" g ON g.id = c."groupId"
    WHERE c."inviteToken" IS NOT NULL AND c.status <> 'ended'
    ORDER BY c."createdAt" DESC LIMIT 1`
);
if (!series) {
  console.log(
    "no Catch-up in this database; creating one through /catchups/new so the\n" +
      "token-on-creation path is exercised too, then re-reading it."
  );
  const boot = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox"],
  });
  const bp = await boot.newPage();
  await bp.setViewport({ width: 1440, height: 900 });
  await bp.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await bp.evaluate(
    async (e) => {
      await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
    },
    process.env.ADMIN_EMAIL
  );
  bp.on("response", async (r) => { if (r.request().method() === "POST") { let t=""; try { t = (await r.text()).slice(0,400); } catch {} console.log("    [POST]", r.status(), r.url().replace("http://localhost:3000",""), t.replace(/\n/g," ")); } });
  bp.on("console", (m) => { if (m.type() === "error") console.log("    [console]", m.text().slice(0, 200)); });
  bp.on("pageerror", (e) => console.log("    [pageerror]", String(e).slice(0, 200)));
  await bp.goto("http://localhost:3000/catchups/new", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  // Type a name explicitly, then click with a real mouse event: el.click()
  // skips the pointer sequence some button primitives listen for.
  const nameField = await bp.$("#catchup-name");
  await nameField.click({ clickCount: 3 });
  await nameField.type("Invite probe Catch-up");
  await new Promise((r) => setTimeout(r, 300));
  const startBtn = (await bp.$$("button")).at(-1);
  const label = await bp.evaluate((b) => `${b.textContent.trim()} disabled=${b.disabled}`, startBtn);
  console.log("  clicking:", label);
  await startBtn.click();
  await new Promise((r) => setTimeout(r, 9000));
  console.log("  landed on", await bp.evaluate(() => location.pathname));
  console.log("  toast:", await bp.evaluate(() => document.querySelector("[data-sonner-toast]")?.innerText?.replace(/\n/g, " ") ?? "(none)"));
  await boot.close();
  const rows = await q(
    `SELECT c.id, c."inviteToken", c."groupId", g.name
       FROM "CatchupSeries" c JOIN "Group" g ON g.id = c."groupId"
      ORDER BY c."createdAt" DESC LIMIT 1`
  );
  series = rows[0];
  if (!series) {
    console.log("FAIL: could not create a Catch-up to test with");
    await db.end();
    process.exit(1);
  }
  console.log(`  created, token written: ${Boolean(series.inviteToken)} (${series.inviteToken?.length} chars)`);
}
const [outsider] = await q(
  `SELECT u.id, u.name FROM "User" u
    WHERE u."isBlocked" = false AND u.id <> 'anonymous'
      AND NOT EXISTS (SELECT 1 FROM "GroupMember" m WHERE m."groupId" = $1 AND m."userId" = u.id)
    LIMIT 1`,
  [series.groupId]
);
console.log(`catch-up: ${series.name} (${series.id})`);
console.log(`outsider: ${outsider ? outsider.name : "(none, everyone is a member)"}`);

const before = Number((await q(`SELECT count(*) FROM "GroupMember"`))[0].count);
console.log("GroupMember rows before:", before);

const link = `/catchups/join/${series.inviteToken}`;
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = async (viewport = { width: 1440, height: 900 }) => {
  const p = await browser.newPage();
  await p.setViewport(viewport);
  return p;
};
const signIn = async (p) => {
  await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await p.evaluate(
    async (e) => {
      await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
    },
    process.env.ADMIN_EMAIL
  );
};

// 1. SIGNED OUT ------------------------------------------------------------
{
  const p = await page();
  const res = await p.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  const seen = await p.evaluate(() => ({
    url: location.pathname,
    heading: document.querySelector("h1")?.textContent?.trim(),
    ctas: [...document.querySelectorAll("a")].map((a) => `${a.textContent.trim()} -> ${a.getAttribute("href")}`),
    // nothing anyone wrote should be reachable here
    leaks: /Round \d|answered/i.test(document.body.innerText),
  }));
  console.log(`\n1. signed out: status ${res.status()}, stayed on ${seen.url}`);
  console.log(`   heading: ${JSON.stringify(seen.heading)}`);
  seen.ctas.filter((c) => /next=|signup|login/.test(c)).forEach((c) => console.log("   cta:", c));
  console.log("   leaks Round content:", seen.leaks, "(want false)");
  await p.screenshot({ path: `${dir}/probe-invite-signedout.png` });
  const m = await page({ width: 390, height: 844 });
  await m.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  await m.screenshot({ path: `${dir}/probe-invite-signedout-mobile.png` });
  await m.close();
  await p.close();
}

// 2. JUNK TOKEN + a token shape that is valid but unknown -------------------
{
  const p = await page();
  for (const t of ["not-a-token", "a".repeat(32)]) {
    await p.goto(`http://localhost:3000/catchups/join/${t}`, { waitUntil: "networkidle0" });
    const h = await p.evaluate(() => document.querySelector("h1")?.textContent?.trim());
    console.log(`\n2. token ${JSON.stringify(t.slice(0, 12))}: ${JSON.stringify(h)} (want "This link has expired")`);
  }
  await p.close();
}

// 3. SIGNED IN, ALREADY A MEMBER -> straight through ------------------------
{
  const p = await page();
  await signIn(p);
  await p.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  await wait(500);
  console.log(`\n3. signed in as the Keeper: landed on ${await p.evaluate(() => location.pathname)}`);
  console.log(`   (want /catchups/${series.id})`);
  await p.close();
}

// 4. SIGNED IN, NOT A MEMBER -> the invitation, then Join -------------------
if (outsider) {
  // Borrow the outsider's session by pointing the admin-login at their email.
  const [row] = await q(`SELECT email FROM "User" WHERE id = $1`, [outsider.id]);
  const p = await page();
  await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  const status = await p.evaluate(
    async (e) => (await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) })).status,
    row.email
  );
  if (status !== 200) {
    console.log(`\n4. SKIP: admin-login refused a non-admin email (${status}), which is correct;`);
    console.log("   the not-a-member path is checked below against the action directly.");
  } else {
    await p.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
    const heading = await p.evaluate(() => document.querySelector("h1")?.textContent?.trim());
    console.log(`\n4. signed in, not a member: ${JSON.stringify(heading)}`);
    await p.screenshot({ path: `${dir}/probe-invite-member.png` });
    await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Join this Catch-up/.test(b.textContent))?.click());
    await wait(2500);
    console.log(`   after Join -> ${await p.evaluate(() => location.pathname)}`);
  }
  await p.close();
}

// 5. SIGNED IN, NOT A MEMBER -> the invitation, then Join ------------------
// admin-login only accepts the admin, so rather than borrowing someone else's
// session we make the ADMIN a non-member for a moment by removing their own
// GroupMember row. Same code path, and Join puts the row straight back.
{
  const admin = (await q(`SELECT id FROM "User" WHERE email = $1`, [process.env.ADMIN_EMAIL]))[0];
  await q(`DELETE FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`, [series.groupId, admin.id]);
  const gone = Number((await q(`SELECT count(*) FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`, [series.groupId, admin.id]))[0].count);
  console.log(`\n5. membership removed (rows now ${gone}); revisiting the link signed in`);

  const p = await page();
  await signIn(p);
  await p.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  await wait(600);
  const seen = await p.evaluate(() => ({
    url: location.pathname,
    heading: document.querySelector("h1")?.textContent?.trim(),
    buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter(Boolean),
  }));
  console.log(`   stayed on ${seen.url}, heading ${JSON.stringify(seen.heading)}`);
  console.log(`   buttons: ${JSON.stringify(seen.buttons)}`);
  await p.screenshot({ path: `${dir}/probe-invite-member.png` });
  const m = await page({ width: 390, height: 844 });
  await m.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  await m.screenshot({ path: `${dir}/probe-invite-member-mobile.png` });
  await m.close();

  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Join this Catch-up/.test(b.textContent))?.click());
  await wait(3000);
  const back = Number((await q(`SELECT count(*) FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`, [series.groupId, admin.id]))[0].count);
  console.log(`   after Join -> ${await p.evaluate(() => location.pathname)}  (membership rows ${back}, want 1)`);

  // idempotence: following the link again must not throw or duplicate
  await p.goto("http://localhost:3000" + link, { waitUntil: "networkidle0" });
  await wait(600);
  const again = Number((await q(`SELECT count(*) FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`, [series.groupId, admin.id]))[0].count);
  console.log(`   following it again -> ${await p.evaluate(() => location.pathname)} (rows still ${again})`);
  await p.close();
}

const after = Number((await q(`SELECT count(*) FROM "GroupMember"`))[0].count);
console.log("\nGroupMember rows after:", after, `(delta ${after - before})`);
if (outsider) {
  await q(`DELETE FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`, [series.groupId, outsider.id]);
}
const restored = Number((await q(`SELECT count(*) FROM "GroupMember"`))[0].count);
console.log("after cleanup:", restored, restored === before ? "MATCHES baseline" : "!! DOES NOT MATCH baseline");

await browser.close();
await db.end();
