import type { MetadataRoute } from "next";
import { IS_DEMO } from "@/lib/demo";
import { appUrl } from "@/lib/email";

/**
 * The crawl policy, which this site did not have (audit C-203).
 *
 * Without a robots.ts, /robots.txt fell through the proxy's matcher, met the
 * no-session branch and was answered with a 307 to /login -- so every crawler
 * that asked read the sign-in page as the policy. The proxy now lets
 * /robots.txt and /sitemap.xml past the matcher; this decides what they say.
 *
 * Almost everything here is behind a session and always will be: the feed, the
 * directory, letters, Catch-ups, profiles, the Collection. None of it should be
 * indexed even in the impossible event a crawler could reach it, so the rule is
 * an explicit disallow rather than a shrug. What IS allowed is the handful of
 * pages a stranger is meant to find: the landing page, the two doors, the three
 * policy documents and the mascot playground.
 *
 * `/api/*` is disallowed too. Everything under it is either gated or
 * server-to-server, and nothing there is a page.
 *
 * The demo deployment disallows everything. It is a showcase reachable by a
 * link the owner hands out, and two copies of the same site competing in
 * search results is worse than one.
 */
export default function robots(): MetadataRoute.Robots {
  if (IS_DEMO) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/login", "/signup", "/privacy", "/terms", "/guidelines", "/hoopoe"],
      disallow: "/",
    },
    sitemap: appUrl("/sitemap.xml"),
  };
}
