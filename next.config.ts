import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

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
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
