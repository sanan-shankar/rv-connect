import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, filesContaining } from "./test-kit.mjs";
import { DELETION_GRACE_DAYS } from "./purge-rule.ts";

/* ------------------------------------------------------------------ *
 *  The privacy page is a contract, so it is read against the code.
 *
 *  It is the one document a member, or a regulator, reads as a promise,
 *  and it had drifted from the code on every side at once: it sent
 *  members to a settings page that does not exist, had no row for the
 *  visit, search and pages-opened records, and its cookie list missed the
 *  entry question's 30-day cookie (bug audit 3, T8b-06 and C4-04). Each
 *  number and name below is read off the code and looked for on the page,
 *  so the next change to a window, a cookie or the deletion delay fails
 *  here until the page says it too.
 * ------------------------------------------------------------------ */

const PAGE = "src/app/(policies)/privacy/page.tsx";
const page = decomment(read(PAGE));

/** The rows of the page's FactTable whose headers are these, as [label, cell] pairs. */
function table(headers) {
  const head = new RegExp(`headers=\\{\\[\\s*${headers.map((h) => JSON.stringify(h)).join(",\\s*")}\\s*\\]\\}`);
  const at = page.search(head);
  assert.notEqual(at, -1, `the privacy page has no table headed ${headers.join(" / ")}`);
  const rows = page.slice(at, page.indexOf("]}", page.indexOf("rows={[", at)) + 1);
  return [...rows.matchAll(/\[\s*"([^"]+)",\s*"([^"]+)"\s*\]/g)].map((m) => [m[1], m[2]]);
}

/** Days as the page spells them: whole years in years, anything else in days. */
const spell = (days) =>
  days % 365 === 0 ? `${days / 365} year${days === 365 ? "" : "s"}` : `${days} days`;

/** KEEP_DAYS, read off retention.ts (which imports Prisma, so it is not imported here). */
function keepDays() {
  const src = decomment(read("src/lib/retention.ts"));
  const body = src.slice(src.indexOf("const KEEP_DAYS = {"), src.indexOf("} as const;", src.indexOf("const KEEP_DAYS = {")));
  const windows = Object.fromEntries([...body.matchAll(/^\s*(\w+):\s*(\d+),/gm)].map((m) => [m[1], Number(m[2])]));
  assert.ok(Object.keys(windows).length >= 8, "KEEP_DAYS no longer reads as plain numbers of days; re-point this test");
  return { src, windows };
}

/** Which row of "How long we keep things" carries each of the sweep's windows. */
const ROW_FOR = {
  adminMessages: "Messages to the admin",
  reports: "Reports and moderation records",
  contributions: "Contribution records",
  notifications: "Notifications",
  securityLogs: "Sign-in and security logs",
  sentEmailLog: "Email delivery records",
  presence: "Visit statistics and search history",
  gateLog: "Answers at the entry question",
};

test("every window the nightly sweep keeps is on the page, in the same number", () => {
  const { windows } = keepDays();
  const rows = new Map(table(["Record", "Kept for"]));
  for (const [key, days] of Object.entries(windows)) {
    const label = ROW_FOR[key];
    assert.ok(label, `KEEP_DAYS.${key} (${days} days) has no row on the privacy page: add one, and its label here`);
    assert.ok(rows.has(label), `the privacy page lost its "${label}" row (KEEP_DAYS.${key})`);
    assert.ok(
      rows.get(label).startsWith(spell(days)),
      `the privacy page says "${label}: ${rows.get(label)}" while the sweep keeps it ${days} days (KEEP_DAYS.${key})`
    );
  }
});

test("the deletion delay on the page is the one the purge waits", () => {
  const rows = new Map(table(["Record", "Kept for"]));
  assert.match(rows.get("A deleted account") ?? "", new RegExp(`\\b${DELETION_GRACE_DAYS} days\\b`));
  const deleting = page.slice(page.indexOf('title="Deleting your account"'), page.indexOf('title="Your rights"'));
  assert.match(deleting, new RegExp(`waits ${DELETION_GRACE_DAYS} days`), "the deletion section names another delay");
});

test("the pages-opened row says what the sweep does with them", () => {
  /* ContentView has no cutoff, on purpose: the analytics room counts it whole
     (presence-rule.test.mjs says why and holds the two together). The page
     must say so, and the promise is only true while the rows go with the
     account; if a cutoff ever lands, the row names its days instead. */
  const label = "What you opened, and how often";
  const rows = new Map(table(["Record", "Kept for"]));
  assert.ok(rows.has(label), "the privacy page has no row for the pages a member opened (ContentView)");
  const { src, windows } = keepDays();
  const step = /key:\s*"contentViews",\s*days:\s*KEEP_DAYS\.(\w+)/.exec(src);
  if (step) {
    assert.ok(rows.get(label).startsWith(spell(windows[step[1]])), `the sweep cuts ContentView at ${windows[step[1]]} days and the page says "${rows.get(label)}"`);
  } else {
    assert.equal(rows.get(label), "Until your account is deleted");
    const model = read("prisma/schema.prisma").match(/model ContentView \{[\s\S]*?\n\}/)?.[0] ?? "";
    assert.match(model, /viewer\s+User\s+@relation\([^)]*onDelete:\s*Cascade/, "ContentView no longer goes with its viewer's account, so the page's promise is false");
  }
});

test("the page sends nobody to a settings page", () => {
  /* There is none (auth.ts and the sidebar say so): the account controls are
     on the member's own profile. Four sentences pointed there. */
  const said = page.match(/[^.\n]*\bsettings\b[^.\n]*/i);
  assert.equal(said, null, `the privacy page still says "${said?.[0].trim()}": there is no settings page, the controls are on your own profile`);
});

test("the page says where the website runs", () => {
  const CITY = { bom1: "Mumbai" };
  const regions = JSON.parse(read("vercel.json")).regions ?? [];
  assert.ok(regions.length > 0, "vercel.json names no region");
  const vercel = new Map(table(["Provider", "What it does"])).get("Vercel") ?? "";
  for (const r of regions) {
    assert.ok(CITY[r], `vercel.json runs the site in ${r}: add its city here and on the privacy page`);
    assert.ok(vercel.includes(CITY[r]), `the privacy page's Vercel row does not say the site runs in ${CITY[r]} (${r})`);
  }
});

/* ------------------------------------------------------------------ *
 *  Cookies: every one the code sets has a row (C4-04)
 * ------------------------------------------------------------------ */

/** The site's own cookies, by name, and the row of the cookie table that answers for each. */
const COOKIE_ROW = {
  "rv-theme": "Theme",
  "rv-visit": "Visits",
  rv_trivia_id: "Entry question",
  rv_trivia_pass: "Entry question passed",
  rv_human: "Robot check",
};

/** Writes whose first argument is not a fixed name, each with why it adds no cookie to the list. */
const NOT_A_NEW_COOKIE = {
  "src/app/api/auth/stale/route.ts": "clears the sign-in cookie of a session that has already ended",
  "src/app/api/dev-login/route.ts": "the sign-in cookie, minted for the laptop's tools; 404 on every production build",
};

/** A name as written at a cookie write: a string, or a constant declared somewhere in src. */
function resolveName(arg, file) {
  const literal = /^["']([^"']+)["']$/.exec(arg);
  if (literal) return literal[1];
  const decl = new RegExp(`\\b${arg}\\s*=\\s*["']([^"']+)["']`);
  const local = decl.exec(read(file));
  if (local) return local[1];
  for (const other of filesContaining(new RegExp(`export const ${arg}\\b`))) {
    const found = decl.exec(read(other));
    if (found) return found[1];
  }
  return null;
}

test("every cookie the site sets is in the page's cookie table", () => {
  const rows = new Map(table(["Cookie", "What it does"]));
  const WRITE = /(?:\b(?:jar|cookieStore|store)|\(await cookies\(\)\)|\.cookies)\.set\(\s*([^,)]+)/g;
  const found = new Set();
  for (const file of filesContaining(/\.set\(/, { under: ["src"] })) {
    if (file.includes("/lab/") || /\.test\.mjs$/.test(file)) continue;
    for (const m of decomment(read(file)).matchAll(WRITE)) {
      const name = resolveName(m[1].trim(), file);
      if (!name) {
        assert.ok(NOT_A_NEW_COOKIE[file], `${file} sets a cookie whose name (${m[1].trim()}) this test cannot read: name it in COOKIE_ROW, or say in NOT_A_NEW_COOKIE why it adds none`);
        continue;
      }
      assert.ok(COOKIE_ROW[name], `${file} sets a cookie, ${name}, that the privacy page does not list: add a row to its cookie table and the name here`);
      found.add(name);
    }
  }
  assert.ok(found.size >= Object.keys(COOKIE_ROW).length, `only found ${found.size} of the ${Object.keys(COOKIE_ROW).length} cookies; the scrape has drifted`);
  for (const [name, label] of Object.entries(COOKIE_ROW)) {
    assert.ok(rows.has(label), `the privacy page's cookie table lost its "${label}" row (${name})`);
  }

  /* And the ones a library sets, which no write above shows. */
  assert.ok(rows.has("Signed in") && rows.has("Sign-in form"), "the cookie table lost NextAuth's sign-in cookies");
  const posthog = decomment(read("src/components/analytics/posthog-client.ts"));
  if (!/persistence:\s*["']memory["']/.test(posthog)) {
    assert.ok(rows.has("Analytics"), "PostHog keeps an identifier in a cookie, and the cookie table no longer says so");
  }
});

test("the entry question's cookie is listed for as long as it lives", () => {
  const ttl = /const TRIVIA_ID_MAX_AGE_S = ([\d* ]+);/.exec(decomment(read("src/lib/trivia-log.ts")))?.[1];
  assert.ok(ttl, "TRIVIA_ID_MAX_AGE_S is no longer a plain product of numbers; re-point this test");
  const days = ttl.split("*").reduce((n, f) => n * Number(f), 1) / 86_400;
  const cell = new Map(table(["Cookie", "What it does"])).get("Entry question") ?? "";
  assert.ok(cell.includes(`${days} days`), `rv_trivia_id lives ${days} days and the page says "${cell}"`);
});
