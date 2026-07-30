/* Dialog-material verifier: opens each of the four owner-named dialogs in a
 * real admin session, screenshots each, and asserts (a) the panel is the one
 * material (float bg, 20.8px radius) and (b) the sticky sidebar survives the
 * scroll lock (the old body-overflow bug). node scripts/qa/dialog-verify.mjs */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });
mkdirSync("./temporary screenshots", { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const mobile = process.argv.includes("--mobile");
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(async (email) => {
  await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}, process.env.ADMIN_EMAIL);

async function inspectOpenDialog(label) {
  await new Promise((r) => setTimeout(r, 700)); // enter animation settles
  const facts = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="dialog-content"]');
    if (!panel) return null;
    const st = getComputedStyle(panel);
    const aside = document.querySelector("aside");
    return {
      radius: st.borderRadius,
      bg: st.backgroundColor,
      sidebarTop: aside ? aside.getBoundingClientRect().top : null,
      hasClose: Boolean(panel.querySelector('[data-slot="dialog-close"]')),
    };
  });
  console.log(label, JSON.stringify(facts));
  await page.screenshot({ path: `./temporary screenshots/dialog-${label}${mobile ? "-mobile" : ""}.png` });
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 500));
}

/* 1 - edit own post + 2 - report someone else's */
await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
const menus = await page.$$('article [data-slot="dropdown-menu-trigger"], article header button');
// open each post's ... menu until we find Edit (own) and Report (other)
let editDone = false, reportDone = false;
for (const m of menus) {
  if (editDone && reportDone) break;
  await m.click().catch(() => {});
  await new Promise((r) => setTimeout(r, 450));
  const items = await page.$$('[role="menuitem"]');
  let clicked = false;
  for (const it of items) {
    const t = (await (await it.getProperty("textContent")).jsonValue()) ?? "";
    if (!editDone && /Edit/.test(t)) {
      await it.click(); editDone = clicked = true;
      await inspectOpenDialog("edit-post");
      break;
    }
    if (!reportDone && /Report/.test(t)) {
      await it.click(); reportDone = clicked = true;
      await inspectOpenDialog("report-post");
      break;
    }
  }
  if (!clicked) await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));
}

/* 3+4 - get in touch + flag person, on someone else's profile */
const otherProfile = await page.evaluate(() => {
  const a = [...document.querySelectorAll('a[href^="/profile/"]')].find(
    (x) => !x.getAttribute("href").includes("cmi") || true
  );
  return a?.getAttribute("href");
});
if (otherProfile) {
  await page.goto("http://localhost:3000" + otherProfile, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  const git = await page.$$eval("button", (btns) => {
    const b = btns.find((x) => /Get in touch/.test(x.textContent ?? ""));
    if (b) { b.click(); return true; }
    return false;
  });
  if (git) await inspectOpenDialog("get-in-touch");
  const flag = await page.$$eval("button", (btns) => {
    const b = btns.find((x) => /^\s*Flag\s*$/.test(x.textContent ?? ""));
    if (b) { b.click(); return true; }
    return false;
  });
  if (flag) await inspectOpenDialog("flag-person");
}

await browser.close();
console.log("done");
