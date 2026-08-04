/**
 * Full-page shot of /admin at both widths, plus the measurements that decide
 * whether the panel is dense enough. Used for the 2026-08-04 density pass.
 * Usage: node scripts/qa/_admin-probe.mjs <label>
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });
const label = process.argv[2] || "admin";
const dir = "./temporary screenshots";
mkdirSync(dir, { recursive: true });
const b = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--no-sandbox"] });
for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await p.evaluate(async (e) => { await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) }); }, process.env.ADMIN_EMAIL);
  await p.goto("http://localhost:3000/admin", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  const m = await p.evaluate(() => {
    const doc = document.documentElement;
    const h2 = [...document.querySelectorAll("h2")].map((e) => e.textContent.trim());
    return { pageHeight: doc.scrollHeight, viewport: window.innerHeight, sections: h2 };
  });
  console.log(`${tag}: page ${m.pageHeight}px = ${(m.pageHeight / m.viewport).toFixed(1)} screens; sections: ${JSON.stringify(m.sections)}`);
  await p.screenshot({ path: `${dir}/probe-${label}-${tag}.png`, fullPage: true });

  if (tag === "desktop") {
    // The sorted pile opens, and an opened thread takes the full width back.
    const sortedToggle = await p.$$eval("button", (els) =>
      els.findIndex((e) => /^Sorted \(/.test(e.textContent.trim()))
    );
    const buttons = await p.$$("button");
    if (sortedToggle >= 0) {
      await buttons[sortedToggle].click();
      await new Promise((r) => setTimeout(r, 400));
      const shown = await p.$$eval("[aria-expanded]", (els) => els.length);
      console.log(`  sorted pile opens: ${shown} expandable rows on the page`);
      await p.screenshot({ path: `${dir}/probe-${label}-desktop-sorted.png`, fullPage: true });
    } else {
      console.log("  FAIL: no Sorted toggle found");
    }

    // Widths are read off the CARD (the button's parent), which is what carries
    // the col-span; the button inside it is padded and would under-report.
    const widths = await p.evaluate(async () => {
      const card = document.querySelector('#messages [aria-expanded="false"]')?.parentElement;
      if (!card) return null;
      const before = card.getBoundingClientRect().width;
      card.querySelector("button").click();
      await new Promise((r) => setTimeout(r, 600));
      return { before: Math.round(before), after: Math.round(card.getBoundingClientRect().width) };
    });
    if (widths) {
      console.log(`  opened thread width: ${widths.before} -> ${widths.after}`);
      await p.screenshot({ path: `${dir}/probe-${label}-desktop-open.png`, fullPage: true });
    } else {
      console.log("  FAIL: no collapsed thread to open");
    }
  }
  await p.close();
}
await b.close();
