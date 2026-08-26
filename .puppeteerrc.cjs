/**
 * Puppeteer exists for the QA scripts only (screenshots, crawls, probes);
 * nothing that runs on Vercel ever launches a browser. Its install step
 * otherwise downloads a ~130MB Chrome into ~/.cache/puppeteer -- on EVERY
 * Vercel build, into a cache directory Vercel does not restore, and on every
 * local install after a puppeteer bump.
 *
 * Skipped everywhere, not just on Vercel, because the bundled browser does
 * not work on this machine: `puppeteer.launch()` with no executablePath dies
 * with "Failed to launch the browser process" (CLAUDE.md gotcha 2, re-proved
 * 2026-08-26). The scripts already go around it -- screenshot.mjs and
 * screenshot-auth.mjs default to /Applications/Google Chrome, and
 * verify-shot.mjs and crawl.mjs require PUPPETEER_EXECUTABLE_PATH pointed
 * there. Nothing was ever reaching the 357MB this had accumulated.
 */
module.exports = {
  skipDownload: true,
};
