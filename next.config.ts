import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

/* Everything below that pushes a browser towards https is gated on this. In
 * development the dev server speaks http and nothing else, so a header that
 * says "fetch this over https instead" has nothing to reach. */
const isProd = process.env.NODE_ENV === "production";

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
    "https://va.vercel-scripts.com", // Vercel Web Analytics loader
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    // Where every uploaded photograph is served from since 2026-08-21. This
    // has to move in step with R2_PUBLIC_BASE_URL and the remotePatterns
    // below: without it the browser refuses every image on the site and the
    // only sign is a console line, so the page looks broken with no error.
    "https://images.rishivalley.space",
    // The bucket's old free address. Kept alongside for the same reason
    // `publicBaseFor` keeps it: a URL that escaped the rewrite must still
    // render rather than be blocked.
    "https://*.r2.dev",
    "https://*.posthog.com",
    "https://*.razorpay.com",
    "https://i.scdn.co", // Spotify album art on Catch-up answers
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
    "https://images.rishivalley.space",
    "https://*.r2.dev",
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
    "https://*.posthog.com",
    "https://va.vercel-scripts.com", // Vercel Analytics beacon
    "https://vitals.vercel-insights.com", // Vercel Speed Insights beacon
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
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Tree-shake large icon/animation barrels so dev recompiles and prod client
  // chunks only pull the icons actually used. Next auto-optimizes lucide-react
  // but NOT @phosphor-icons/react (a 4500-line barrel), which is the big win here.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
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
    remotePatterns: [
      // Cloudflare R2, served from its own domain since 2026-08-21. This is
      // what `R2_PUBLIC_BASE_URL` points at and what every new upload writes.
      {
        protocol: "https",
        hostname: "images.rishivalley.space",
      },
      // The free `pub-<hash>.r2.dev` address the bucket used before that.
      // Kept because it is one of the bases `publicBaseFor` still accepts: an
      // image URL that escaped the rewrite must render rather than 404 behind
      // a config that has forgotten where it came from.
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

/* `npm run analyze` opens a treemap of what is actually in the client bundle.
 * Dev-only and opt-in: without ANALYZE=true this wrapper is a no-op, so it
 * costs members nothing and does not touch a normal build.
 *
 * Worth having because this project already holds the principle -- "parked
 * code should not ride in bundles it is not used by" (progress.md, on moving
 * wood.tsx out of the app shell) -- and had no way to check it beyond
 * reasoning about imports. optimizePackageImports above is a bet about
 * @phosphor-icons/react tree-shaking that nothing has ever confirmed. */
const analyzed = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);

/* Sentry wraps last so it sees the final config. Every option here is set
 * against a default we did not want -- see src/instrumentation.ts for the
 * server-only decision this enforces at build time. */
export default withSentryConfig(analyzed, {
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
