/* Wave 2+3 visual sweep: settings houses + picker (popover and sheet),
 * phones repeater, the letters desk (new + index). Desktop + mobile.
 * node scripts/qa/wave23-verify.mjs */
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

async function session(viewport, tag) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.evaluate(async (email) => {
    await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }, process.env.ADMIN_EMAIL);

  /* settings: houses + contact regions */
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  const houses = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("form h2")].find((h) => /houses/i.test(h.textContent ?? ""));
    if (h2) h2.scrollIntoView({ block: "start" });
    return Boolean(h2);
  });
  await new Promise((r) => setTimeout(r, 600));
  if (houses) await page.screenshot({ path: `./temporary screenshots/w2-houses-${tag}.png` });

  // open the first house picker
  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")].find((b) =>
      /pick a house/i.test(b.textContent ?? "") || b.getAttribute("aria-label")?.startsWith("House(s) for")
    );
    if (btn) (btn).click();
    return Boolean(btn);
  });
  await new Promise((r) => setTimeout(r, 900));
  if (opened) await page.screenshot({ path: `./temporary screenshots/w2-picker-${tag}.png` });
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));

  // contact / phones region
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("form h2")].find((h) => /contact/i.test(h.textContent ?? ""));
    if (h2) h2.scrollIntoView({ block: "start" });
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `./temporary screenshots/w2-contact-${tag}.png` });

  /* letters desk */
  await page.goto("http://localhost:3000/letters/new", { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `./temporary screenshots/w3-desk-${tag}.png` });

  /* letters index (pill + drafts links) */
  await page.goto("http://localhost:3000/letters", { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: `./temporary screenshots/w3-index-${tag}.png` });

  await page.close();
}

await session({ width: 1440, height: 900 }, "desktop");
await session({ width: 390, height: 844 }, "mobile");
await browser.close();
console.log("done");
