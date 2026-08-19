import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { requireLoopbackBaseUrl } from "../scripts/qa/local-base-url.mjs";

/* ------------------------------------------------------------------ *
 *  Playwright - the picture-memory and the flow tests.
 *
 *  WHY THIS EXISTS (2026-08-19): every design change used to be checked
 *  by hand -- screenshot, read the PNG, fix, re-screenshot, compare in
 *  numbers, twice, then again at 390x844. That catches what you thought
 *  to look at and nothing else. 279 commits in the month before this
 *  landed; a regression on a page nobody opened that day was invisible.
 *  Baselines in e2e/__screenshots__ are the memory that process lacked.
 *
 *  Replaces the Puppeteer probes for anything repeatable. Playwright
 *  ships its own Chromium, so CLAUDE.md gotcha 2 (the broken bundled
 *  Chrome, PUPPETEER_EXECUTABLE_PATH) does not apply here at all.
 * ------------------------------------------------------------------ */

loadEnv({ path: ".env", quiet: true });

/* Same invariant screenshot-auth.mjs enforces: authenticated QA drives a
 * loopback origin only, so the owner's admin cookie never leaves this
 * machine. Throws rather than silently pointing at production. */
const baseURL = requireLoopbackBaseUrl(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
);

/* The two viewports CLAUDE.md mandates for every UI change. Desktop is
 * 1440x900 (the owner's laptop); mobile is 390x844 (iPhone 13/14/15). */
export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

export default defineConfig({
  testDir: ".",
  /* Baselines sit next to the suite, not in per-test folders, so the
   * whole visual memory is one browsable directory. */
  snapshotPathTemplate: "__screenshots__/{projectName}/{arg}{ext}",

  /* Per-run output stays inside e2e/ too. The owner keeps the repo root
   * clear, so nothing here writes a new top-level folder. */
  outputDir: ".output",

  /* 90s, not the 30s default. CLAUDE.md gotcha: "first hit of a cold route
   * outruns the 10s default" -- and /birds (50 plumage SVGs) plus
   * /collection (the photo grid) both blew past 30s on a cold Turbopack
   * compile the first time this suite ran for real. A full-page shot of a
   * heavy route is a slow operation, not a hanging one. */
  timeout: 90_000,

  /* Serial locally: the dev server is one Turbopack process and parallel
   * cold compiles make the first run time out. CI gets more workers. */
  workers: process.env.CI ? 2 : 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "e2e/.report" }]] : [["list"]],

  expect: {
    toHaveScreenshot: {
      /* Two dials, and the split matters.
       *
       * `threshold` (per pixel) absorbs anti-aliasing and font hinting,
       * which wobble by a hair between runs on one machine.
       *
       * `maxDiffPixels` is an ABSOLUTE count, deliberately not a ratio.
       * The first version of this config used maxDiffPixelRatio: 0.01,
       * which sounds strict and is not: 1% of a 1440x2000 full-page shot
       * is ~28,000 pixels of slack. Verified by regression on 2026-08-19 --
       * bumping /about's body copy from text-sm to text-base (~4,000
       * changed pixels) PASSED. A ratio budget scales the blind spot with
       * the page, so the biggest pages get the least scrutiny, which is
       * backwards. 100 pixels is under a single character. */
      threshold: 0.2,
      maxDiffPixels: 100,
      /* CSS animations and transitions finish instantly and rest at their
       * end state, so a mid-flight hoopoe never lands in a baseline. */
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

  use: {
    baseURL,
    /* Motion is always-on in this product by design (DESIGN-SYSTEM.md),
     * and every animation here is reduced-motion-safe. Asking for reduce
     * is what pins the JS-driven Framer/motion work, which
     * animations:"disabled" above cannot reach -- it only stops CSS.
     * Nested under contextOptions because Playwright 1.62 does not accept
     * reducedMotion as a top-level `use` key. */
    contextOptions: { reducedMotion: "reduce" },
    /* Kept only for failures, so a green run writes nothing to disk. */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    /* Signs in once via the admin-login bypass and writes the cookie to
     * e2e/.auth/admin.json (gitignored). Every other project reuses it,
     * so 30 tests cost one login. */
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: DESKTOP,
        storageState: "e2e/.auth/admin.json",
      },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: {
        ...devices["iPhone 13"],
        /* devices["iPhone 13"] is WebKit-flavoured; we run it on Chromium
         * for one engine across both viewports. The viewport and DPR are
         * what the layout actually reacts to. */
        browserName: "chromium",
        viewport: MOBILE,
        isMobile: true,
        hasTouch: true,
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],

  /* Reuses the dev server the owner already has running; only starts one
   * if the port is cold. Never restarts a server it did not start
   * (CLAUDE.md: another session may be working in this tree). */
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
