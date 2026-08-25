import type { MetadataRoute } from "next";
import { IS_DEMO } from "@/lib/demo";
import { appUrl } from "@/lib/email";

/**
 * The seven pages a stranger is meant to find (audit C-203).
 *
 * Deliberately hand-written rather than derived from the route tree: every
 * other route in this app is behind a session, and a sitemap that discovered
 * routes automatically would be one refactor away from listing them. The list
 * here is the same one `publicPaths` in src/proxy.ts opens, minus the flows
 * that only make sense with a token in hand (/forgot-password,
 * /reset-password, /verify-email) and the machine endpoints.
 *
 * No `lastModified`: none of these pages has a modification date this process
 * can know, and inventing `new Date()` would tell every crawler the whole site
 * changed on every deploy. Omitted is the honest answer.
 *
 * The demo publishes nothing, matching its robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (IS_DEMO) return [];
  return [
    { url: appUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: appUrl("/login"), changeFrequency: "yearly", priority: 0.5 },
    { url: appUrl("/signup"), changeFrequency: "yearly", priority: 0.8 },
    { url: appUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: appUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: appUrl("/guidelines"), changeFrequency: "yearly", priority: 0.3 },
    { url: appUrl("/hoopoe"), changeFrequency: "yearly", priority: 0.4 },
  ];
}
