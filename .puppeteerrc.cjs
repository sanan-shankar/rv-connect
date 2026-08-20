/**
 * Puppeteer exists for the QA scripts only (screenshots, crawls, probes);
 * nothing that runs on Vercel ever launches a browser. Without this, its
 * install step downloads a ~130MB Chrome into ~/.cache/puppeteer on EVERY
 * Vercel build -- a cache directory Vercel does not restore -- which is
 * pure deploy-time waste. Local installs keep downloading as before (the
 * scripts point PUPPETEER_EXECUTABLE_PATH at real Chrome anyway).
 */
module.exports = {
  skipDownload: process.env.VERCEL === "1",
};
