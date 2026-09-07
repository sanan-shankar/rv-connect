/**
 * One screenshot, for the three commands that take one.
 *
 * `screenshot.mjs`, `screenshot-auth.mjs` and `verify-shot.mjs` each answered
 * the same four questions and had drifted to different answers:
 *
 *  - **which Chrome**: one probed with `existsSync` and fell back to the
 *    bundled browser, one did `env || literal`, one passed nothing at all and
 *    made the caller export `PUPPETEER_EXECUTABLE_PATH` (CLAUDE.md gotcha 2).
 *    Now `chromePath()`, once, in `_probe-kit.mjs`.
 *  - **what "mobile" means**: 390x844 with a phone's pointer in one, 390x844
 *    with a laptop's pointer in the others -- so every authed mobile shot the
 *    owner's design rounds are judged on showed hover affordances a phone
 *    never draws. Now `viewport(mobile)`, once, below.
 *  - **where the file goes**: two auto-incremented from `e2e/.shots`, one took
 *    a name. Both still work; the numbering is here.
 *  - **how long to wait**: networkidle2 with a domcontentloaded fallback in
 *    two, a bare networkidle2 in the third, and three different settle times.
 *    The fallback is now everybody's; the settle is the caller's, because 4s
 *    for streamed feed posts and 0.5s for a status check are a real difference
 *    rather than a drift.
 *
 * The three entry points stay three commands, deliberately: they are in
 * CLAUDE.md's table and in the screenshot-auth skill, and three names with
 * different defaults read better than one with three flags. What they keep is
 * argument parsing and their own output line.
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromePath } from "./_probe-kit.mjs";
import { devLogin } from "./_dev-login.mjs";

/** Gitignored scratch, beside Playwright's own run output. Nothing here ever
 *  writes an image to the repo root. */
const SHOTS_DIR = "e2e/.shots";

/**
 * A phone is not a narrow desktop. Without deviceScaleFactor/isMobile/hasTouch
 * Chrome keeps desktop pointer semantics at 390px, so `(hover: hover)` matches
 * when it should not and `(pointer: coarse)` does not match when it should.
 * Concretely, in a shot taken without them: the photo carousel's prev/next
 * arrows (`[@media(pointer:fine)]:grid`) appear and never would on a phone,
 * and the comment overflow menu (`[@media(pointer:coarse)]:opacity-100`) is
 * invisible and always shows on a phone. Tailwind v4 wraps every `hover:`
 * variant in `@media (hover:hover)` too, so it is not three call sites.
 */
export function viewport(mobile) {
  return mobile
    ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { width: 1440, height: 900 };
}

/** `e2e/.shots/screenshot-<n>[-suffix].png`, one past the highest n there. */
function nextShotPath(suffix = "") {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const existing = existsSync(SHOTS_DIR)
    ? readdirSync(SHOTS_DIR).filter((f) => f.endsWith(".png"))
    : [];
  const nums = existing
    .map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? "0"))
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return join(SHOTS_DIR, suffix ? `screenshot-${next}-${suffix}.png` : `screenshot-${next}.png`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Take the shot.
 *
 * @param {object} o
 * @param {string} o.url            the page to photograph
 * @param {boolean} [o.authed]      sign in as `email` first
 * @param {string} [o.email]        defaults to ADMIN_EMAIL inside `_dev-login`
 * @param {boolean} [o.mobile]      a real phone, not a narrow window
 * @param {string} [o.out]          a filename in `e2e/.shots`; omit for the
 *                                  auto-incremented `screenshot-<n>` name
 * @param {string} [o.suffix]       appended to that auto-incremented name
 * @param {boolean} [o.full]        capture the whole page, not the viewport
 * @param {number} [o.settleMs]     wait after arrival, before the shutter
 * @param {boolean} [o.watchConsole] collect console errors, page errors, the
 *                                   HTTP status and any error-overlay text
 * @returns {Promise<{ outPath: string, viewport: object, status: number|string, errors: string[] }>}
 */
export async function shoot({
  url,
  authed = false,
  email,
  mobile = false,
  out,
  suffix = "",
  full = false,
  settleMs = 0,
  watchConsole = false,
}) {
  const vp = viewport(mobile);
  mkdirSync(SHOTS_DIR, { recursive: true });
  const outPath = out ? join(SHOTS_DIR, out) : nextShotPath(suffix);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(), // undefined => puppeteer's bundled browser
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  /** @type {string[]} */
  const errors = [];
  let status = "?";
  try {
    const page = await browser.newPage();
    await page.setViewport(vp);

    if (watchConsole) {
      page.on("console", (m) => {
        if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160));
      });
      page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 180)));
    }

    if (authed) {
      /* Land on the origin first so the cookie has a domain to attach to. */
      const origin = new URL(url).origin;
      await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 15000 });
      await devLogin(page, origin, email);
    }

    try {
      const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      status = resp ? resp.status() : "no-resp";
    } catch {
      /* networkidle2 gives up on a page that keeps a socket open -- which is
         most of this app in dev. Falling back to domcontentloaded and waiting
         is what the two screenshot scripts always did; verify-shot did not,
         and reported NAV-ERR for pages that had loaded perfectly well. */
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        status = resp ? resp.status() : "no-resp";
        await sleep(2000);
      } catch (e) {
        status = "NAV-ERR";
        errors.push("nav: " + String(e.message).slice(0, 140));
      }
    }

    if (settleMs) await sleep(settleMs);

    /* A full-page capture photographs the page as laid out, but every `<img
       loading="lazy">` below the first viewport has not been asked for yet, so
       the shot showed paper-coloured holes where photographs belonged. Walk the
       page a viewport at a time so each one loads, then return to the top. */
    if (full) {
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await sleep(2500);
    }

    if (watchConsole) {
      const overlay = await page.evaluate(() =>
        /Application error|Unhandled Runtime Error|could not be found/i.test(
          document.body?.innerText || "",
        ),
      );
      if (overlay) errors.push("overlay: error text visible");
    }

    await page.screenshot({ path: outPath, fullPage: full });
  } finally {
    await browser.close();
  }

  return { outPath, viewport: vp, status, errors };
}
