import * as Sentry from "@sentry/nextjs";

/* ------------------------------------------------------------------ *
 *  Sentry - the smoke alarm. SERVER SIDE ONLY.
 *
 *  WHY (2026-08-19): CLAUDE.md gotcha 3 records a Prisma `select` on a
 *  column that did not exist. It passed `tsc --noEmit`, shipped, and then
 *  500'd the feed. It was found by taking a screenshot. With 49 members,
 *  nobody reports a broken page -- they leave. This closes that gap.
 *
 *  WHAT IT DOES NOT COVER, deliberately: there is no browser SDK here.
 *  A crash inside a client component still shows the member an error
 *  boundary and tells us nothing. Adding it costs ~30KB gzipped on every
 *  page load, and the owner's standing constraint is that none of this
 *  monitoring may slow the site down (PostHog is already spending ~15-20KB
 *  of that budget). Server errors -- 500s, failed Server Actions, database
 *  errors, the whole class that actually bit us -- ARE caught.
 *
 *  Installed by hand, not by `npx @sentry/wizard`. The wizard adds a
 *  /sentry-example-page route (which the lab-registry gate in
 *  `npm run check` would reject), turns session replay on by default
 *  (refused: this is a private community with real names and addresses on
 *  screen), and writes a Sentry auth token into a new
 *  .env.sentry-build-plugin file on the machine.
 * ------------------------------------------------------------------ */

/* The DSN is a write-only identifier: it can send events to the project and
 * cannot read anything out of it. Sentry designs it to sit in public client
 * bundles. Kept inline so production, preview and local all just work with
 * no env var to forget, and still overridable if it ever needs rotating. */
const DSN =
  process.env.SENTRY_DSN ??
  "https://c2df40cc2c120f4796843cdb64b1047c@o4511937484488704.ingest.de.sentry.io/4511937491566672";

/* Deployed only. A dev server throws constantly and on purpose while you
 * work, and the free plan is 5,000 errors a month -- one afternoon of
 * hot-reload noise would spend the budget and train us to ignore the alerts.
 * Set SENTRY_DEV=1 to opt in temporarily when debugging Sentry itself. */
const ENABLED =
  Boolean(process.env.VERCEL) || process.env.SENTRY_DEV === "1";

const common = {
  dsn: DSN,
  enabled: ENABLED,

  /* preview deploys and production report separately, so a broken branch
   * never looks like a live incident. */
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  /* OFF. The default would attach IP addresses, cookies and request headers
   * to every event. This site holds alumni names, addresses, phone numbers
   * and photos; an error report is not a place to copy any of it. */
  sendDefaultPii: false,

  /* 10% of requests traced. The free plan allows 10,000 spans a month and
   * this site's traffic is tiny, so this stays comfortably inside it while
   * still showing which routes are slow. */
  tracesSampleRate: 0.1,

  /* Tree-shakes Sentry's own debug logging out of the production bundle. */
  debug: false,

  ignoreErrors: [
    /* Next.js implements redirect() and notFound() by THROWING. They are
     * control flow, not failures, and without this every redirect on the
     * site files an issue and buries the real ones. */
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    /* A member closing the tab mid-request aborts it. Not a bug. */
    "AbortError",
    /* The (main) layout throws this on EVERY page view while the database is
     * not answering, and onRequestError below would file each one: an outage
     * would spend the month's 5,000 events in an hour. The session callback
     * already reports the underlying failure, once a minute per instance
     * (src/lib/auth.ts, sessionReadFailed); that is the signal. */
    "SESSION_UNAVAILABLE",
  ],
};

export async function register() {
  /* Both runtimes get the identical config, so they are one condition rather
   * than two branches that could drift apart. The edge half is not
   * hypothetical: src/proxy.ts runs there for every request in this app. */
  const runtime = process.env.NEXT_RUNTIME;
  if (runtime === "nodejs" || runtime === "edge") {
    Sentry.init(common);
  }
}

/* Next.js hands nested React Server Component errors to this hook, which is
 * the only way to catch the ones that never reach a route handler. */
export const onRequestError = Sentry.captureRequestError;
