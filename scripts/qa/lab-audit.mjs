#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  lab-audit.mjs — the anti-stranding check for /lab.
 *
 *  Every page.tsx under src/app, outside (main), (auth), and the root
 *  landing page, must have a matching entry in src/app/lab/_registry.ts,
 *  and every href in that registry must point at a real page.tsx. This
 *  is what keeps rooms from going stranded again: add a preview/dev
 *  page without registering it (or delete one without updating the
 *  registry) and this script fails.
 *
 *  Reads _registry.ts as plain text (regexing out the `href:` values)
 *  rather than importing it, so this needs no build step and no ts-node:
 *
 *    node scripts/qa/lab-audit.mjs
 *
 *  Dynamic segments (e.g. src/app/preview/[dir]/page.tsx) are handled by
 *  turning each disk route into a matcher where a bracketed segment
 *  matches any single path segment, then testing routes and registry
 *  hrefs against those matchers in both directions.
 * ------------------------------------------------------------------ */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..", "..");
const APP_DIR = join(ROOT, "src", "app");
const REGISTRY_FILE = join(ROOT, "src", "app", "lab", "_registry.ts");

/** Route groups + the root page are the app's real, shipped surface: out of scope for /lab. */
function isExcludedSegment(segment) {
  return /^\(.*\)$/.test(segment);
}

/** Recursively collect every page.tsx under `dir`. */
function findPageFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findPageFiles(full));
    } else if (entry === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

/** src/app/preview/delight/page.tsx -> /preview/delight (POSIX separators, always).
 *  Also handles the root src/app/page.tsx, whose relative path ("page.tsx") has no
 *  leading slash for a `/page\.tsx$` pattern to match against. */
function toRoute(filePath) {
  const rel = relative(APP_DIR, filePath).split(sep).join("/");
  const dir = rel.replace(/page\.tsx$/, "").replace(/\/$/, "");
  return "/" + dir;
}

/** Build a RegExp for a route that may contain bracketed dynamic segments, e.g. /preview/[dir]. */
function routeMatcher(route) {
  const pattern = route
    .split("/")
    .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${pattern}$`);
}

/**
 * Real product routes that live outside (main) and (auth) on purpose, and so
 * are not lab rooms however much the folder layout looks like it.
 *
 * /catchups/join/<token> is the shared Catch-up invite link. It cannot sit in
 * (main), because that layout demands a session and the whole point of the link
 * is that the person following it may have no account yet.
 *
 * Keep this list short. A route belongs here only if there is a reason it
 * cannot live in a route group; "I did not want to register it" is not one.
 */
const PRODUCT_ROUTES = [/^\/catchups\/join\/\[[^/]+\]$/];

// ---- 1 & 2: walk disk, convert to routes, drop (main)/(auth)/root/lab ----

const allPageFiles = findPageFiles(APP_DIR);

const diskRoutes = [];
for (const file of allPageFiles) {
  const rel = relative(APP_DIR, file).split(sep).join("/");
  const segments = rel.split("/").slice(0, -1); // drop "page.tsx"
  if (segments.some(isExcludedSegment)) continue; // (main), (auth)
  const route = toRoute(file);
  if (route === "/") continue; // the real landing page
  if (route === "/lab") continue; // the index itself is not an entry in itself
  if (PRODUCT_ROUTES.some((re) => re.test(route))) continue;
  diskRoutes.push(route);
}

// ---- 3: parse the registry as text ----

const registrySource = readFileSync(REGISTRY_FILE, "utf8");
const hrefPattern = /href:\s*["']([^"']+)["']/g;
const registryHrefs = [...registrySource.matchAll(hrefPattern)].map((m) => m[1]);

if (registryHrefs.length === 0) {
  console.error(`lab audit: found zero href entries in ${relative(ROOT, REGISTRY_FILE)}. Check the regex still matches its format.`);
  process.exit(1);
}

// ---- 4: reconcile in both directions, dynamic segments handled by regex ----

const diskMatchers = diskRoutes.map((route) => ({ route, re: routeMatcher(route) }));

const stranded = diskRoutes.filter(
  (route) => !registryHrefs.some((href) => routeMatcher(route).test(href)),
);

const deadLinks = registryHrefs.filter(
  (href) => !diskMatchers.some(({ re }) => re.test(href)),
);

// ---- 5: report ----

let ok = true;

if (stranded.length > 0) {
  ok = false;
  console.error(`\nStranded: on disk, missing from ${relative(ROOT, REGISTRY_FILE)}:`);
  for (const route of stranded) console.error(`  - ${route}`);
}

if (deadLinks.length > 0) {
  ok = false;
  console.error(`\nDead links: in the registry, no matching page.tsx on disk:`);
  for (const href of deadLinks) console.error(`  - ${href}`);
}

if (!ok) {
  console.error("\nlab audit FAILED. Add the missing registry entries or fix/remove the dead hrefs.");
  process.exit(1);
}

console.log(`lab audit clean: ${registryHrefs.length} routes registered`);
process.exit(0);
