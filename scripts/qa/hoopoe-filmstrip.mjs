/**
 * Captures a filmstrip of each desktop hoopoe flight so the arrival can be
 * LOOKED at, not just measured. Writes one PNG per target into
 * "temporary screenshots/", 8 frames tiled top-to-bottom across the flight.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT = "./temporary screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function strip({ tag, ctaText, href, everyMs = 110, frames = 8 }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  /* --cold skips prewarming the destination route. That matters: every other
     probe here visits the target first so a dev-mode Turbopack compile cannot
     stall the flight, which also HIDES the stall from the measurement. On a
     cold click the navigation can outlast the flyer's failsafe, which aborts
     the flight and reveals the destination bird with no descent at all. */
  if (!process.argv.includes("--cold")) {
    await page.goto(BASE + href, { waitUntil: "networkidle2" });
  }
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  const ok = await page.evaluate(
    ({ href, ctaText }) => {
      const a = [...document.querySelectorAll(`section a[href="${href}"]`)].find(
        (el) => el.textContent.trim() === ctaText
      );
      if (!a) return false;
      a.click();
      return true;
    },
    { href, ctaText }
  );
  if (!ok) {
    console.log(`${tag}: CTA not found`);
    await page.close();
    return;
  }

  for (let i = 0; i < frames; i++) {
    await new Promise((r) => setTimeout(r, everyMs));
    await page.screenshot({ path: `${OUT}/flight-${tag}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(`${tag}: ${frames} frames written`);
  await page.close();
}

await strip({ tag: "signin", ctaText: "Sign in", href: "/login" });
await strip({ tag: "join", ctaText: "Join the community", href: "/signup" });
await browser.close();
