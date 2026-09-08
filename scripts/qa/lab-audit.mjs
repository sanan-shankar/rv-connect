#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  lab-audit.mjs — the anti-stranding check for /lab.
 *
 *  Every page file under src/app, outside (main), (auth), and the root
 *  landing page, must have a matching entry in src/app/lab/_registry.ts,
 *  and every href in that registry must point at a real one. This
 *  is what keeps rooms from going stranded again: add a preview/dev
 *  page without registering it (or delete one without updating the
 *  registry) and this script fails.
 *
 *  Reads _registry.ts as plain text (regexing out the `href:` values)
 *  rather than importing it, so this needs no build step and no ts-node:
 *
 *    node scripts/qa/lab-audit.mjs
 *
 *  Every lab room is page.lab.tsx, not page.tsx: next.config.ts puts
 *  "lab.tsx" on pageExtensions for every build EXCEPT the public demo's,
 *  which is how the lab leaves the demo's build and only the demo's. Both
 *  names count here, because the audit runs against the source tree rather
 *  than against a build.
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

/** The two names a page file can have. See the header: the lab's rooms are
 *  page.lab.tsx so the demo build can drop them. */
const PAGE_FILES = ["page.tsx", "page.lab.tsx"];

/** Recursively collect every page file under `dir`. */
function findPageFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findPageFiles(full));
    } else if (PAGE_FILES.includes(entry)) {
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
  const dir = rel.replace(/page(\.lab)?\.tsx$/, "").replace(/\/$/, "");
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
 * is that the person following it may have no account yet. Its tokenless
 * sibling /catchups/join belongs to the same surface: without it the two-segment
 * path fell through to (main)'s /catchups/[catchupId] and gave a lost link a
 * generic 404 or a login bounce (audit C-204).
 *
 * /hoopoe is the public mascot playground. It cannot sit in (main) for the
 * same reason: it is a link sent to people with no account, and the whole
 * point is that they can open it. It is not a lab room either -- the lab's
 * hoopoe control room still exists at /lab/hoopoe and is registered there.
 *
 * Keep this list short. A route belongs here only if there is a reason it
 * cannot live in a route group; "I did not want to register it" is not one.
 */
const PRODUCT_ROUTES = [/^\/catchups\/join(\/\[[^/]+\])?$/, /^\/hoopoe$/];

// ---- 1 & 2: walk disk, convert to routes, drop (main)/(auth)/root/lab ----

const allPageFiles = findPageFiles(APP_DIR);

const diskRoutes = [];
for (const file of allPageFiles) {
  const rel = relative(APP_DIR, file).split(sep).join("/");
  const segments = rel.split("/").slice(0, -1); // drop the page file name
  if (segments.some(isExcludedSegment)) continue; // (main), (auth)
  const route = toRoute(file);
  if (route === "/") continue; // the real landing page
  if (route === "/lab") continue; // the index itself is not an entry in itself
  if (PRODUCT_ROUTES.some((re) => re.test(route))) continue;
  diskRoutes.push(route);
}

// ---- 2b: the lab's page files are page.lab.tsx, and only the lab's ----
//
// This is what makes next.config.ts's demo exclusion hold. A new room named
// page.tsx would pass every other check here and then quietly ship to the
// public demo, where /lab is closed and nobody can open it; a page.lab.tsx
// outside the lab would vanish from the demo build without anybody meaning
// it to. Both are one-character mistakes, so both are checked rather than
// remembered.

const misnamed = [];
for (const file of allPageFiles) {
  const rel = relative(APP_DIR, file).split(sep).join("/");
  const inLab = rel === "lab/page.lab.tsx" || rel === "lab/page.tsx" || rel.startsWith("lab/");
  const isLabName = rel.endsWith("/page.lab.tsx");
  if (inLab && !isLabName) misnamed.push([rel, "under src/app/lab, so it must be page.lab.tsx"]);
  if (!inLab && isLabName) misnamed.push([rel, "outside src/app/lab, so it must be page.tsx"]);
}

if (misnamed.length > 0) {
  console.error(`\nWrongly named page files (see next.config.ts's pageExtensions):`);
  for (const [rel, why] of misnamed) console.error(`  - src/app/${rel} — ${why}`);
  console.error("\nlab audit FAILED. Rename the file; the demo build depends on this name.");
  process.exit(1);
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
  console.error(`\nDead links: in the registry, no matching page file on disk:`);
  for (const href of deadLinks) console.error(`  - ${href}`);
}

if (!ok) {
  console.error("\nlab audit FAILED. Add the missing registry entries or fix/remove the dead hrefs.");
  process.exit(1);
}

console.log(`lab audit clean: ${registryHrefs.length} routes registered`);
process.exit(0);
