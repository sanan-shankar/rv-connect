/**
 * Authenticated interaction harness for QA.
 *
 * screenshot-auth.mjs loads a page and captures it. Several of the fixes in
 * this round only show up AFTER you interact (open the house popover, pick a
 * city, attach a poll), so this drives a short scripted scenario and captures
 * along the way.
 *
 * Usage:
 *   node scripts/qa/drive.mjs <scenario> [--mobile]
 *
 * Scenarios live in SCENARIOS below. Each gets `{ page, shot }`; call
 * `await shot('label')` whenever you want a frame.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const scenarioName = args.filter((a) => a !== "--mobile")[0];
const BASE = "http://localhost:3000";

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL missing from .env.local");
  process.exit(1);
}

const outDir = "./temporary screenshots/drive";
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click the first element whose trimmed text matches, within a selector set. */
async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, txt) => {
      const nodes = [...document.querySelectorAll(sel)];
      return nodes.find((n) => (n.textContent || "").trim().includes(txt)) || null;
    },
    selector,
    text
  );
  const el = handle.asElement();
  if (!el) throw new Error(`No ${selector} containing "${text}"`);
  await el.click();
  return el;
}

/**
 * Scenarios that must run signed OUT. The landing page is the obvious one:
 * signed-in visitors are redirected off it to /feed by the proxy, so
 * authenticating first would make the landing scenarios unreachable.
 */
const NO_AUTH = new Set(["slide"]);

const SCENARIOS = {
  /**
   * Measure the landing -> /login photo slide. Prints displacement over time so
   * the CURVE is visible, not just the duration: an ease-in-out should crawl
   * out of 0%, cover most of the distance in the middle third, and settle
   * gently, whereas the old ease-out curve jumped to ~40% within two frames.
   */
  async slide({ page }) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await sleep(6000);
    const result = await page.evaluate(async () => {
      const img = document.querySelector('img[src*="landing"]');
      if (!img) return { error: "hero image not found" };
      const layer = img.parentElement;
      // Scope to the hero SECTION: the sticky nav also has a "Sign in" link and
      // comes first in DOM order, but only the hero's CTA carries the exit
      // choreography (the nav one just navigates).
      const hero = img.closest("section");
      if (!hero) return { error: "hero section not found" };
      const signIn = [...hero.querySelectorAll("a")].find((a) =>
        /sign in/i.test(a.textContent || "")
      );
      if (!signIn) return { error: "hero sign-in link not found" };
      const diag = {
        layerClass: layer.className,
        transformBefore: getComputedStyle(layer).transform,
      };

      const out = [];
      const t0 = performance.now();
      signIn.click();
      await new Promise((resolve) => {
        const tick = () => {
          const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform);
          out.push({ t: Math.round(performance.now() - t0), x: Math.round(m.m41) });
          if (performance.now() - t0 < 1400) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return { out, diag, transformAfter: getComputedStyle(layer).transform };
    });

    if (result.diag) console.log("layer:", JSON.stringify(result.diag));
    if (result.error) {
      console.log("MEASURE FAILED:", result.error);
      return;
    }
    const s = result.out;
    const target = s.reduce((a, b) => (Math.abs(b.x) > Math.abs(a.x) ? b : a)).x;
    console.log(`slide target x = ${target}px`);
    for (const ms of [0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900, 1000, 1100]) {
      const p = s.reduce((a, b) => (Math.abs(b.t - ms) < Math.abs(a.t - ms) ? b : a));
      const pct = target ? Math.round((p.x / target) * 100) : 0;
      console.log(
        `  t=${String(p.t).padStart(4)}ms  x=${String(p.x).padStart(6)}  ${String(pct).padStart(3)}%  ${"#".repeat(Math.max(0, Math.round(pct / 3)))}`
      );
    }
  },

  /** Shipped profile: resolve a real member from the directory, then capture it. */
  async profile({ page, shot }) {
    await page.goto(`${BASE}/directory`, { waitUntil: "domcontentloaded" });
    await sleep(5000);
    // The directory opens on the map, so the people grid is below the fold.
    // Scroll it in, then fall back to the sidebar's own-profile chip.
    await page.evaluate(() => window.scrollBy(0, 1600));
    await sleep(2500);
    const href = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/profile/"]')][0];
      return a ? a.getAttribute("href") : null;
    });
    if (!href) throw new Error("no profile link found");
    console.log("profile:", href);
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await sleep(5000);
    await shot("top");
    await page.evaluate(() => window.scrollBy(0, 620));
    await sleep(900);
    await shot("scrolled");
  },

  /** Houses picker: open a year's panel and confirm it does not cover the year rows. */
  async houses({ page, shot }) {
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    // Scroll the houses editor into view.
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("p,label,h2,h3")].find((n) =>
        (n.textContent || "").includes("Pick a house for each")
      );
      (el || document.body).scrollIntoView({ block: "center" });
    });
    await sleep(600);
    await shot("houses-closed");
    const trigger = await page.$('[aria-label^="House(s) for"]');
    if (!trigger) throw new Error("no house picker trigger found");
    await trigger.click();
    await sleep(700);
    await shot("houses-open");
    // Pick a house and confirm the panel closes and the next year opens.
    await clickByText(page, '[role="group"] button', "Neem");
    await sleep(800);
    await shot("houses-after-pick");
  },

  /** Location picker: type, select, and confirm the search box empties. */
  async places({ page, shot }) {
    await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    const input = await page.$('input[role="combobox"]');
    if (!input) throw new Error("no combobox input found");
    await input.click();
    await input.type("Chennai", { delay: 60 });
    await sleep(1400);
    await shot("places-suggestions");
    // Keyboard path: this is the one that used to leave the label behind.
    await page.keyboard.press("ArrowDown");
    await sleep(200);
    await page.keyboard.press("Enter");
    await sleep(1200);
    await shot("places-after-pick");
    const leftover = await page.evaluate(() => {
      const el = document.querySelector('input[role="combobox"]');
      return el ? el.value : "(no input)";
    });
    console.log(`INPUT VALUE AFTER PICK: "${leftover}"`);
  },

  /** Composer poll: attach a poll and confirm the surface + question framing. */
  async poll({ page, shot }) {
    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    const box = await page.$('[contenteditable="true"], textarea');
    if (box) {
      await box.click();
      await sleep(900);
    }
    await shot("composer-open");
    // The poll toggle lives behind the "+" overflow menu.
    const more = await page.$('button[aria-label*="More"], button[aria-haspopup="menu"]');
    if (more) {
      await more.click();
      await sleep(500);
      await shot("composer-menu");
      try {
        await clickByText(page, "button", "Poll");
        await sleep(700);
      } catch (e) {
        console.log("could not find Poll item:", e.message);
      }
    }
    await shot("composer-poll");
  },
};

const scenario = SCENARIOS[scenarioName];
if (!scenario) {
  console.error(`Unknown scenario "${scenarioName}". Options: ${Object.keys(SCENARIOS).join(", ")}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
// The dev server recompiles on every edit, and this repo is often being edited
// by other work while QA runs, so first paint of a cold route can take a while.
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);

page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text());
});

if (!NO_AUTH.has(scenarioName)) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const auth = await page.evaluate(async (email) => {
    const res = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  }, adminEmail);
  if (!auth) {
    console.error("auth failed");
    await browser.close();
    process.exit(1);
  }
}

let n = 0;
const tag = mobile ? "mobile" : "desktop";
const shot = async (label) => {
  n += 1;
  const p = join(outDir, `${scenarioName}-${tag}-${n}-${label}.png`);
  await page.screenshot({ path: p });
  console.log("saved", p);
};

try {
  await scenario({ page, shot });
} catch (e) {
  console.error("scenario failed:", e.message);
  await shot("failure");
}
await browser.close();
