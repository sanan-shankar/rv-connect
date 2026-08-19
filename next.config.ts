import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  // Tree-shake large icon/animation barrels so dev recompiles and prod client
  // chunks only pull the icons actually used. Next auto-optimizes lucide-react
  // but NOT @phosphor-icons/react (a 4500-line barrel), which is the big win here.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
    // Server Actions default to a 1MB request body, which silently rejected
    // almost every real Collection photo (contributePhoto in
    // src/app/(main)/collection/actions.ts is a Server Action). 25mb covers a
    // 20MB photo plus multipart/form-data overhead.
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
      // Cloudflare R2 (pub-<hash>.r2.dev now; a custom domain can be added later).
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
