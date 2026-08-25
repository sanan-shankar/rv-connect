import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* ------------------------------------------------------------------ *
 *  The edge boundary, and the four things that never reached the other
 *  side of it.
 *
 *  proxy.ts runs before every request and cannot be imported here: it
 *  is bundled for the edge runtime and pulls in next/server. So these
 *  read the source, the way demo.test.mjs already reads its
 *  DEMO_CLOSED_PATHS block -- and each one is DERIVED from the other
 *  file it has to agree with, never a second copy of the same list.
 * ------------------------------------------------------------------ */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

const PROXY = read("src/proxy.ts");

/** The publicPaths array, as a list of the string literals in it. */
function publicPaths() {
  const block = PROXY.match(/const publicPaths = \[([\s\S]*?)\n {2}\];/);
  assert.ok(block, "publicPaths not found in proxy.ts -- this whole file is now vacuous");
  const withoutComments = block[1].replace(/\/\/.*$/gm, "");
  return [...withoutComments.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("C-111/C-136: every cron in vercel.json can get past the login redirect", () => {
  /* A cron is a cookieless server-to-server GET, so a path missing from
     publicPaths is answered 307 -> /login and the route never runs. One
     vercel.json ships to BOTH Vercel projects, so this holds for all of them.

     DERIVED from vercel.json, not a hand-kept mirror: the whole failure was
     that somebody added a third cron and forgot this list. */
  const crons = JSON.parse(read("vercel.json")).crons ?? [];
  assert.ok(crons.length >= 2, `only found ${crons.length} crons; the config has moved`);
  const paths = publicPaths();
  for (const { path } of crons) {
    const reachable = paths.some((p) => path === p || path.startsWith(p + "/"));
    assert.ok(
      reachable,
      `the ${path} cron is not in proxy.ts publicPaths, so every nightly run is ` +
        `307'd to /login before the route can answer`
    );
  }
});

test("C-202: a cookieless /api request is answered in JSON, not with a login page", () => {
  const branch = PROXY.slice(PROXY.indexOf("if (!sessionCookie) {"));
  const body = branch.slice(0, branch.indexOf("\n  }\n"));
  assert.match(
    body,
    /pathname\.startsWith\("\/api\/"\)/,
    "the no-session branch does not distinguish an API path"
  );
  assert.match(body, /NextResponse\.json\([\s\S]*?status: 401/, "and does not answer 401 JSON");
  // A page still redirects, with its destination in tow.
  assert.match(body, /NextResponse\.redirect\(loginUrl\)/, "a page path must still reach /login");
  assert.ok(
    body.indexOf("startsWith(\"/api/\")") < body.indexOf("NextResponse.redirect"),
    "the API branch has to come first, or the redirect swallows it"
  );
});

test("C-203: the crawl policy exists and is reachable", () => {
  for (const f of ["src/app/robots.ts", "src/app/sitemap.ts"]) {
    assert.ok(existsSync(resolve(ROOT, f)), `${f} is missing, so the site ships no crawl policy`);
  }
  const matcher = PROXY.match(/matcher: \[\s*"([^"]+)"/);
  assert.ok(matcher, "the proxy matcher moved");
  for (const file of ["robots.txt", "sitemap.xml"]) {
    assert.ok(
      matcher[1].includes(file),
      `/${file} is not excluded from the proxy matcher, so a crawler asking for it ` +
        `is redirected to /login and reads the sign-in page as the policy`
    );
  }
});

test("C-203: the sitemap publishes only what the proxy actually opens", () => {
  /* A page in the sitemap that is not public is an invitation to a login
     bounce. Checked against publicPaths rather than against a copy of it. */
  const sitemap = read("src/app/sitemap.ts");
  const listed = [...sitemap.matchAll(/appUrl\("([^"]*)"\)/g)]
    .map((m) => m[1])
    .filter((p) => !p.endsWith(".xml"));
  assert.ok(listed.length >= 5, `only scraped ${listed.length} urls; the sitemap shape has drifted`);
  const paths = publicPaths();
  for (const url of listed) {
    assert.ok(paths.includes(url), `the sitemap publishes ${url}, which proxy.ts does not open`);
  }
});

test("C-204: /catchups/join owns its own tokenless path", () => {
  /* Without a page here the two-segment path resolves to (main)'s
     /catchups/[catchupId] with catchupId="join" -- a generic 404 signed in, a
     login bounce signed out -- from a path the proxy deliberately lists as
     public so a stranger CAN open an invitation. */
  assert.ok(
    existsSync(resolve(ROOT, "src/app/catchups/join/page.tsx")),
    "a tokenless invite link falls through to the (main) [catchupId] segment"
  );
  assert.ok(publicPaths().includes("/catchups/join"), "the join path is no longer public");
});

test("C-139: the invite link has a loading boundary", () => {
  assert.ok(
    existsSync(resolve(ROOT, "src/app/catchups/join/[token]/loading.tsx")),
    "this route is outside (main), so nothing above it supplies one"
  );
});

test("C-119: the browser chrome follows the theme cookie", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(
    layout,
    /export async function generateViewport\(/,
    "a static viewport export can only name one colour, and it named the light one"
  );
  const fn = layout.slice(layout.indexOf("export async function generateViewport("));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.match(body, /getThemeCookie\(\)/, "the viewport does not read the theme");
  assert.match(body, /THEME_COLORS\[/, "the colours are not the shared pair");
  // Both tokens must match what globals.css actually ships.
  const css = read("src/app/globals.css");
  const colors = layout.match(/THEME_COLORS = \{ light: "([^"]+)", dark: "([^"]+)" \}/);
  assert.ok(colors, "THEME_COLORS moved");
  const light = css.match(/:root\b[\s\S]*?--background:\s*(#[0-9A-Fa-f]{6})/);
  const dark = css.match(/\.dark\s*\{[\s\S]*?--background:\s*(#[0-9A-Fa-f]{6})/);
  assert.equal(colors[1].toLowerCase(), light[1].toLowerCase(), "the light chrome is not --background");
  assert.equal(colors[2].toLowerCase(), dark[1].toLowerCase(), "the dark chrome is not .dark --background");
});
