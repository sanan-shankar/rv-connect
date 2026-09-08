import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/* Everything below that pushes a browser towards https is gated on this. In
 * development the dev server speaks http and nothing else, so a header that
 * says "fetch this over https instead" has nothing to reach. */
const isProd = process.env.NODE_ENV === "production";

/* True only when this build is the public demo (demo.rishivalley.space), a
 * SECOND Vercel project built from this same repository with DEMO_MODE=1 in
 * its environment. Declared here rather than imported from src/lib/demo.ts,
 * for the same reason src/proxy.ts declares its own: this file is read by the
 * Next CLI before any application module is resolvable, and the whole value of
 * the flag is that it costs one env var to read. Only `pageExtensions` below
 * uses it. */
const IS_DEMO = process.env.DEMO_MODE === "1";

/* Every host this app's own images are served from -- and NOTHING else.
 *
 * This list feeds both the CSP (img-src, connect-src) and next/image's
 * remotePatterns, which is the reason it is not a wildcard. `*.r2.dev` used to
 * stand in all three places, and `pub-<hash>.r2.dev` buckets are free and
 * self-serve: anybody could point /_next/image at their own bucket and have
 * this project's Vercel account fetch, decode and transform their bytes, once
 * per unique URL, signed out, in a loop (bug-report-2 C-134). The endpoint is
 * deliberately public -- avatars render on /login -- so the allowlist is the
 * only thing standing there.
 *
 * upload-shared.ts already made exactly this call for the ownership check, in
 * these words: "The exact host, not a `pub-*.r2.dev` wildcard: a wildcard
 * would vouch for anybody else's bucket, and vouching is what this file
 * does." The two files now agree.
 *
 * R2_PUBLIC_BASE_URL is read so the demo deployment, which serves the same
 * bucket under its own environment, needs no second edit here. */
const R2_LEGACY_PUBLIC_HOST = "pub-a656209a5438484f9694738260255a5e.r2.dev";
const imageHosts = [
  ...new Set(
    [
      "images.rishivalley.space",
      R2_LEGACY_PUBLIC_HOST,
      (() => {
        try {
          return new URL(process.env.R2_PUBLIC_BASE_URL ?? "").hostname;
        } catch {
          return "";
        }
      })(),
    ].filter(Boolean)
  ),
];

/* Content-Security-Policy (audit H7). Built as a directive map so each entry
 * carries the reason a host is on it. The tight ones first:
 *   - frame-ancestors 'none' + X-Frame-Options: DENY are the clickjacking fix
 *     the audit called out by name (framing /settings to bait a click onto
 *     deleteAccount / adminDeleteUser).
 *   - object-src 'none', base-uri 'self', form-action 'self' close the classic
 *     injection levers.
 * script-src carries 'unsafe-inline' because the App Router emits inline
 * hydration/bootstrap scripts and there is no nonce pipeline here; it still
 * blocks loading an external <script src> that is not on the allowlist, which
 * is the injection path that matters most. 'unsafe-eval' is allowed too: an
 * analytics dependency uses eval() (a prod build proved the block fires and
 * spams the console), and once 'unsafe-inline' is already present — which Next
 * requires without a nonce — allowing eval adds no meaningful XSS surface,
 * since an attacker who can inject inline script has no need of eval. The real
 * wins here are host-allowlisting (no external <script src> off the list),
 * frame-ancestors, Referrer-Policy and nosniff. A nonce-based strict CSP that
 * could drop both 'unsafe-*' is a larger, separate piece of work.
 * The external hosts are exactly the three the browser actually talks to:
 * Cloudflare Turnstile (the bot widget + its challenge iframe), Razorpay
 * checkout (its script + payment iframe + API), and Cloudflare R2 (images).
 * PostHog is same-origin (proxied through /ingest, next.config rewrites) so it
 * needs no host here; Sentry is server-only (no browser SDK), so it needs none
 * either. Iterate against the browser console if a real flow trips a directive. */
const csp: Record<string, string[]> = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'", // see the note above: an analytics dep needs it, and it is free of extra risk given 'unsafe-inline'
    "https://challenges.cloudflare.com",
    "https://checkout.razorpay.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    // Where every uploaded photograph is served from, plus the bucket's old
    // free address for any URL that escaped the 2026-08-21 rewrite. Named
    // hosts, never a wildcard -- see imageHosts above. Without an entry here
    // the browser refuses every image on the site and the only sign is a
    // console line, so the page looks broken with no error.
    ...imageHosts.map((h) => `https://${h}`),
    "https://*.razorpay.com",
    "https://i.scdn.co", // Spotify album art on Catch-up answers
    /* ...and where that art actually lives now. `resolveSpotify` stores
       whatever `thumbnail_url` the keyless oembed returns, and as of
       2026-09-06 that endpoint answers with `image-cdn-fa.spotifycdn.com`
       and `image-cdn-ak.spotifycdn.com`, never `i.scdn.co`. So every
       resolved song has been storing an art URL the browser then refused
       to load, with no symptom but a console line: the card renders its
       fallback glyph and looks like a song nobody had a cover for. Found
       while drawing the Catch-ups sketches, on a real answer whose entire
       text reads "Honestly I just want to see if the album covers render
       properly".

       A wildcard here and NOT in `imageHosts`: the shard letters rotate,
       so an exact host would break again on their next deploy, and this
       list only tells the browser which images may be painted. The
       optimizer allowlist, which is the one an attacker abuses, is
       untouched and still exact. */
    "https://*.spotifycdn.com",
    /* YouTube still frames, the sibling of the line above. The brief asks
       for both by name (para 16: "why can't we have a beautiful UI that
       shows YouTube previews or Spotify previews"; para 49: "It doesn't
       work for YouTube or Spotify"), and a thumbnail cannot be judged, let
       alone shipped, while the browser refuses to load one.

       img-src only, and deliberately NOT added to `imageHosts` above:
       that list feeds next/image's remotePatterns, which is the allowlist
       an open optimizer endpoint is abused through. A still is drawn with
       a plain <img>, the way the Spotify card beside it already is. */
    "https://i.ytimg.com",
  ],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://challenges.cloudflare.com",
    // The bucket's S3 endpoint, which is where a DIRECT upload actually goes:
    // the server presigns a PUT and the browser sends the file straight there,
    // bypassing Vercel's ~4.5MB body cap. That is a `fetch`, so it is governed
    // by connect-src, and this list had no R2 entry at all -- so the browser
    // refused the PUT, `uploadDirect` caught it, and every upload quietly took
    // the fallback route through the server and its 4.5MB ceiling. A silent
    // downgrade of the one mechanism that exists to avoid that ceiling.
    //
    // Wildcarded rather than pinned to the account id, which would put a
    // build-time environment variable into a static header. The URL is
    // presigned by our own server with our own credentials and the browser
    // only ever sends what it was handed, so the breadth costs nothing that
    // script-src is not already preventing.
    "https://*.r2.cloudflarestorage.com",
    // And the public image host, because the photo viewer's Download button
    // FETCHES the image in order to save it under a filename rather than just
    // opening it in a tab. Same reasoning as img-src above: it moves in step
    // with R2_PUBLIC_BASE_URL.
    ...imageHosts.map((h) => `https://${h}`),
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
  ],
  "frame-src": [
    "https://challenges.cloudflare.com",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
  ],
  "worker-src": ["'self'", "blob:"],
  // Production only, and this is not housekeeping: sent in development it is
  // what broke Safari on http://localhost:3000 (2026-08-24). WebKit applies
  // the directive to localhost, so every stylesheet, script and font on the
  // page was re-requested over https from a dev server that only speaks http;
  // all of them failed and the page rendered as bare unstyled HTML with no
  // error anywhere but the network tab. Chromium exempts localhost as a
  // potentially-trustworthy origin, which is why Brave looked perfectly fine
  // and the bug read as "Safari is broken". Production is https end to end, so
  // gating it here costs nothing there.
  ...(isProd ? { "upgrade-insecure-requests": [] } : {}),
};

const cspHeader = Object.entries(csp)
  .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  // Clickjacking: DENY plus frame-ancestors 'none' above (X-Frame-Options for
  // older browsers, the CSP directive for current ones).
  { key: "X-Frame-Options", value: "DENY" },
  // Reset/verify tokens ride in URLs; keep them out of the Referer sent to any
  // outbound link, while still sending the bare origin same-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Powerful features nothing here uses. Camera is left available: the avatar
  // and Collection flows may let a phone take a photo.
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  // Vercel sets HSTS by default; stated explicitly so it does not depend on the
  // platform default and survives a move off Vercel. Two years, subdomains.
  // Production only, for the reason above: a browser is meant to ignore HSTS
  // arriving over plain http, but "meant to" is not a thing to rely on for two
  // years of pinning against a hostname every dev machine here uses.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  /* THE LAB LEAVES THE DEMO'S BUILD, AND ONLY THE DEMO'S (owner, 2026-09-08,
   * question 23: "8 remove it from the demo").
   *
   * Every room under src/app/lab is `page.lab.tsx`, not `page.tsx`, so Next
   * only sees it as a page when "lab.tsx" is on this list. The demo build
   * leaves it off; every other build keeps it. The lab is 47 routes, ~113
   * files and 44,363 lines of the TypeScript program, and on the demo
   * deployment /lab is in DEMO_CLOSED_PATHS -- so the demo was compiling,
   * type-checking and shipping a tree that literally nobody there can open.
   *
   * It stays in his own build deliberately: /lab/collection is the Collection
   * rework's test fixture (the real /collection holds two photographs), two
   * committed Playwright suites drive it, and npm run verify:crawl,
   * npm run dev:centroid and the two apple-edge scripts all reach lab routes.
   * A main-build exclusion would break all of those; this one breaks none,
   * because none of them runs against the demo.
   *
   * The 63 Google font files that /lab/type and /lab/craft download at build
   * time ride along: with no page importing _fonts.ts, next/font never fetches
   * them, and nothing outside those two rooms imports either file.
   *
   * "tsx"/"ts" stay first and stay present because pageExtensions governs
   * proxy.ts and instrumentation.ts too, not just pages.
   *
   * scripts/qa/lab-audit.mjs knows this filename. If you change it, change
   * that too, or every registry href becomes a dead link. */
  pageExtensions: IS_DEMO ? ["tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js", "lab.tsx"],
  devIndicators: false,
  /* WHO MAY LOAD THE DEV SERVER'S ASSETS. Development only -- Next ignores
   * this in a production build.
   *
   * Since Next 15.2 the dev server answers /_next/* with a 403 to any request
   * whose Origin is not localhost. That is a sensible default (a page on the
   * open web should not be able to read your dev bundle) and it has one
   * casualty: looking at the site on your own phone. The Mac's dev server is
   * reachable at http://192.168.x.x:3000 and the HTML arrives fine, so the
   * page renders its background and its one server-rendered word -- and then
   * every script 403s, nothing hydrates, and every element still sitting at
   * the opacity-0 start of an entrance animation stays invisible. It reads as
   * a blank page with no error on it, which cost a session on 2026-09-02.
   *
   * The three RFC1918 ranges, not one machine's address, because the router
   * hands out a different one every so often and a config that needs editing
   * to keep working is a config that will be wrong when it matters. This
   * widens dev access from "this Mac" to "anything already on your home
   * Wi-Fi", which is the same trust boundary the dev server has always had:
   * it binds to every interface regardless.
   *
   * This is what makes `npm run dev` testable on a real iPhone -- which for a
   * mobile-first project is the difference between checking a change and
   * deploying to find out. */
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /* The world atlas (public/geo/*.json) is immutable reference data --
       * coastlines, fetched by the directory map instead of being compiled
       * into its JavaScript. It carries no build hash, so without this it
       * would revalidate on every navigation; with it, it is fetched once
       * ever. That is the trade: to change one of these files you must RENAME
       * it, because a same-named replacement will never be re-fetched by a
       * browser that already has it. alumni-map.tsx says so at the callsite. */
      {
        source: "/geo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      /* Development only, and the reason is Safari (2026-08-24). Node closes an
       * idle keep-alive connection after six seconds and tells no one -- measured
       * on this server, not assumed. Safari then sends its next navigation into
       * that already-dead socket and, unlike Chromium, gives up rather than
       * retrying on a fresh one, so the first load after any pause was reliably
       * "Safari can't open the page ... the server unexpectedly dropped the
       * connection" and only a cache-bypassing reload got past it. Closing every
       * dev response means there is never an idle connection left to reuse, so
       * the race has nothing to land on. The cost is one TCP handshake per
       * request over loopback, which is microseconds, and it is confined to dev.
       * It does not touch hot reload: an upgrade never passes through headers(),
       * and the HMR socket was verified still delivering built/serverComponentChanges. */
      ...(isProd ? [] : [{ source: "/:path*", headers: [{ key: "Connection", value: "close" }] }]),
    ];
  },
  // Tree-shake large icon/animation barrels so dev recompiles and prod client
  // chunks only pull the icons actually used. Next auto-optimizes lucide-react
  // but NOT @phosphor-icons/react (a 4500-line barrel), which is the big win here.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
    // Turns on forbidden() and its forbidden.tsx boundary, which is how a
    // non-admin is turned away from /admin (src/lib/admin.ts). Experimental
    // only in the sense that the API may still be renamed; it is the one
    // primitive that both TERMINATES the segment render -- so no admin page
    // body is ever built for a member -- and lands on a boundary of its own,
    // separate from not-found. That separation is the point: three admin
    // pages call notFound() for a row that is genuinely gone, and reusing
    // that boundary would show an admin "nice try" for a deleted thread.
    authInterrupts: true,
    // Server Actions default to a 1MB request body, which silently rejected
    // almost every real Collection photo (contributePhoto in
    // src/app/(main)/collection/actions.ts is a Server Action). 25mb covers a
    // 20MB photo plus multipart/form-data overhead.
    //
    // It does NOT raise the real ceiling. On Vercel the PLATFORM refuses a
    // request body over roughly 4.5MB with a 413 the function never sees, so
    // this only lifts Next's own guard and nothing here can lift that one. The
    // way a big photo actually reaches storage is the presigned direct PUT
    // (src/lib/upload-client.ts), which never touches a function; everything
    // that does go through a function is shrunk in the browser first
    // (shrinkForUpload in src/lib/image-downscale.ts, bug audit B-030).
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // src/proxy.ts runs on every route, so ANY request body here (Server
    // Actions, /api/upload, everything) is also capped by this separate
    // limit -- default 10MB -- before it ever reaches the route/action. Past
    // it the body is silently truncated mid-multipart-boundary, which surfaced
    // as a raw "Unexpected end of form" 500 rather than a friendly error, and
    // is the most likely explanation for the owner's "fails maybe 1-in-6"
    // Collection uploads (any real photo over 10MB). Must stay >= the Server
    // Actions bodySizeLimit above.
    proxyClientMaxBodySize: "25mb",
  },
  /* PostHog, served from our own domain. Ad blockers ship lists of known
   * analytics hostnames and posthog.com is on all of them, so a direct
   * connection loses roughly 10-25% of visitors silently. These rewrites make
   * the browser talk only to rishivalley's own /ingest path; the forwarding
   * happens server-side where no blocker can see it. Costs a few extra
   * function invocations, well inside the free tier.
   *
   * The static rule MUST come first: /ingest/static/* is the SDK bundle and
   * lives on a different host from the event endpoint. Ordering it second
   * would let the catch-all swallow it and the SDK would 404. */
  async rewrites() {
    return [
      /* posthog-js probes its optional feature bundles at a VERSIONED path
       * first (/static/1.418.1/web-vitals.js), which the asset host does not
       * serve; it then falls back to /static/web-vitals.js?v=1.418.1, which
       * it does. The scripts always loaded, but every page paid three 404s
       * in the console — the "three PostHog 404s" baseline noise every
       * verify:shot has carried since Phase 1 (SECURITY-FIX-PLAN trap 3),
       * which made a real fourth error easy to miss. Mapping the versioned
       * probe onto the query-string form the host answers removes the noise
       * without disabling the features. MUST come before the general static
       * rule, or that one swallows it. */
      {
        source: "/ingest/static/:version(\\d+\\.\\d+\\.\\d+)/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*?v=:version",
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },

  /* PostHog's API is sensitive to the trailing slash; Next's default redirect
   * would break the capture endpoint. */
  skipTrailingSlashRedirect: true,

  images: {
    // The optimizer will fetch and transform anything matching this list, for
    // anybody, without a session -- so it is the exact hosts and nothing more.
    // See imageHosts above for what a wildcard here was paying for.
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    /* 1456 is the only addition to Next's defaults, and it exists for one
     * reason: a full-width feed card is 728 CSS px, so a retina screen wants
     * exactly 1456. Without this rung the nearest permitted width below it is
     * 1080, and a photograph rendered at 1.48x rather than 2x reads as soft on
     * a Mac -- on a site whose members post landscapes. The optimizer refuses
     * any width not on this list, so the ladder in src/lib/image-cdn.ts and
     * this array have to agree. */
    deviceSizes: [640, 750, 828, 1080, 1200, 1456, 1920, 2048, 3840],
  },
};

/* `npm run analyze` opens a treemap of what is actually in the client bundle.
 * It runs Next's own `experimental-analyze`, not @next/bundle-analyzer: that
 * wrapper is webpack-only and every build here is Turbopack, so it printed
 * "not compatible with Turbopack builds, no report will be generated" and
 * produced nothing, for as long as it was installed (2026-08-26).
 *
 * Worth having because this project already holds the principle -- "parked
 * code should not ride in bundles it is not used by" (progress.md, on moving
 * wood.tsx out of the app shell) -- and had no way to check it beyond
 * reasoning about imports. optimizePackageImports above is a bet about
 * @phosphor-icons/react tree-shaking that nothing has ever confirmed. */

/* Sentry wraps last so it sees the final config. Every option here is set
 * against a default we did not want -- see src/instrumentation.ts for the
 * server-only decision this enforces at build time. */
const sentryNextConfig = withSentryConfig(nextConfig, {
  org: "sanan-l0",
  project: "javascript-nextjs",

  /* Source map upload needs a SENTRY_AUTH_TOKEN. There isn't one, on purpose:
   * the wizard would have written it into a .env.sentry-build-plugin file on
   * the owner's laptop. Without it, server stack traces point at compiled
   * output rather than the original line -- readable, just less precise.
   * To turn it on later: create an org auth token in Sentry, add it to
   * Vercel's env settings only (never .env), and this flips itself on. */
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },

  /* Quiet during builds; a monitoring tool narrating itself in the deploy
   * log is how real build errors get missed. */
  silent: true,

  /* No build-time telemetry to Sentry. It reports the bundler, the SDK
   * version and build timings on every deploy, and none of it is anything
   * this project gets back. */
  telemetry: false,

  /* NO RELEASE PER DEPLOY. Owner, 2026-08-20: "don't let sentry send me
   * emails for each commit or deployment... I don't need an email from them
   * and blow up my inbox."
   *
   * A Sentry "release" is what a deploy notification is attached to, so not
   * creating one is what actually stops the mail. Today this is already the
   * effective behaviour, because release creation needs a SENTRY_AUTH_TOKEN
   * and there is none -- but that makes the quiet accidental, and it would
   * end the moment anybody added a token to turn source maps on. Stated
   * explicitly so the two decisions stay independent.
   *
   * This cannot switch off mail Sentry sends from its own dashboard --
   * new-issue alerts and the weekly summary are account settings, not build
   * settings. Those live in Sentry under Settings > Notifications, and the
   * Vercel-Sentry integration sends its own deploy mail from Vercel's side. */
  release: { create: false, deploy: undefined },

  /* No browser SDK is initialised (server-only), so widening the client
   * upload would ship source maps for code Sentry never reports on. */
  widenClientFileUpload: false,

  webpack: {
    /* Strips Sentry's internal debug logging from the production bundle.
     * Lives under `webpack` because the flat `disableLogger` and
     * `automaticVercelMonitors` options are deprecated in SDK 10 and warn
     * on every build (AGENTS.md: heed deprecation notices). */
    treeshake: { removeDebugLogging: true },

    /* OFF: this would auto-create Sentry cron monitors for the two jobs in
     * vercel.json. Cron monitoring is a real gap, but it is the owner's
     * call to make deliberately, not something a config flag turns on
     * behind him. */
    automaticVercelMonitors: false,
  },
});

/* Sentry's wrapper sets `experimental.clientTraceMetadata` unconditionally on
 * Next >= 15 (getFinalConfigObjectUtils.ts, maybeSetClientTraceMetadataOption),
 * which stamps <meta name="sentry-trace"> and <meta name="baggage"> into every
 * HTML document -- about 400 bytes carrying the Sentry public key, the org id
 * and a sample rate. They exist for a BROWSER SDK to read and continue the
 * server's trace from, and there is no browser SDK here on purpose
 * (src/instrumentation.ts). So nothing has ever read them.
 *
 * There is no option for this: the only early return in that function is for
 * `cacheComponents`. Deleting the key off the returned object is the whole
 * mechanism. If a browser SDK is ever added, delete these lines with the same
 * commit that adds it. */
delete sentryNextConfig.experimental?.clientTraceMetadata;

export default sentryNextConfig;
