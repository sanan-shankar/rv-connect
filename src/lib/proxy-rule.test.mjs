import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, read, decomment, balancedBody } from "./test-kit.mjs";

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

test("every cron in vercel.json checks the secret through the one helper", () => {
  /* The reason this is derived rather than listed: the three cron routes each
     wrote out the same fail-closed, constant-time comparison, and the newest
     copy carried the comment "matching the two sibling cron routes" -- a
     sameness a comment cannot enforce. requireCronSecret is where it lives
     now, and a fourth scheduled route that forgets it fails here. */
  const crons = JSON.parse(read("vercel.json")).crons ?? [];
  for (const { path } of crons) {
    const file = `src/app${path}/route.ts`;
    assert.ok(existsSync(resolve(ROOT, file)), `${path} has no route file at ${file}`);
    assert.match(
      decomment(read(file)),
      /requireCronSecret\(/,
      `${path} does not call requireCronSecret, so its door is its own again`
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
  const body = balancedBody(layout, "export async function generateViewport");
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

test("C-117/C-200: both sign-in gates carry the destination, not just the proxy", () => {
  /* Two gates decide "you need to sign in", and only one of them kept the
     link. The proxy adds `next` when there is NO session cookie (B-022); a
     cookie that exists but no longer authenticates -- what a password reset or
     a block deliberately leaves on every other device -- passes the proxy's
     presence check and lands in the (main) layout, which redirected to a bare
     /login and dropped the member on /feed.

     Both halves are pinned here because they only work together: the layout
     can only preserve the query string if the proxy forwards it. */
  const LAYOUT = read("src/app/(main)/layout.tsx");

  assert.ok(
    /loginUrl\.searchParams\.set\("next", pathname \+ search\)/.test(PROXY),
    "the proxy stopped sending the destination with the sign-in redirect (B-022)"
  );
  assert.ok(
    /withPath\.set\("x-search"/.test(PROXY),
    "x-search is no longer forwarded, so the layout's next= loses the query string"
  );
  assert.ok(
    /withPath\.set\("x-pathname"/.test(PROXY),
    "x-pathname is no longer forwarded"
  );

  const gate = LAYOUT.slice(LAYOUT.indexOf("if (!session?.user)"));
  const branch = gate.slice(0, gate.indexOf("\n  }") + 4);
  assert.ok(branch.length > 40, "the layout's auth gate did not slice; this test is vacuous");
  assert.ok(
    /next=/.test(branch),
    "the (main) layout redirects to a bare /login again: a revoked session " +
      "following a deep link loses it (C-117/C-200)"
  );
  assert.ok(
    /encodeURIComponent/.test(branch),
    "the destination is not encoded, so a path with & or # truncates the next param"
  );
  // The header it must read is the one WITH the query string. x-pathname alone
  // is the page touchLastSeen records, and /directory is not the same
  // destination as /directory?batch=2011.
  assert.ok(
    /currentTarget\(/.test(branch),
    "the layout builds next= from something other than currentTarget(); if that " +
      "is x-pathname it has silently dropped every query string"
  );
  assert.ok(
    /x-search/.test(LAYOUT),
    "currentTarget no longer reads x-search"
  );
});

test("the visit cookie is never set on a server action", () => {
  /* Next treats any cookie modified during a server action as a
     revalidation, and answers a revalidated action like a navigation: the
     page renders again on the server, the tree is re-applied on the client,
     and the window scrolls to the top (isCookieRevalidated, in Next's
     action handler). Sliding the rolling visit cookie on action POSTs
     therefore made EVERY action in the app re-render its page under the
     reader -- and on /collection, where a `?when=` address hands the
     re-render a page that fires another action, a loop the owner had to
     reload out of (2026-08-29). Measured on the response itself:
     `set-cookie: rv-visit` beside `x-action-revalidated: 1`.

     Pinned as a shape rather than exercised, for the reason at the top of
     this file: proxy.ts is edge-bundled and cannot be imported. The guard
     has to name the `next-action` header, which is how Next marks an
     action request, and the set has to sit inside it. */
  const src = decomment(PROXY);
  const guard = src.match(
    /const isServerAction = request\.method === "POST" && request\.headers\.has\("next-action"\);/
  );
  assert.ok(guard, "the proxy no longer recognises a server action by its next-action header");
  const setter = src.indexOf("res.cookies.set(VISIT_COOKIE");
  assert.notEqual(setter, -1, "the visit cookie is no longer set at all; the sitting cannot be attributed");
  const between = src.slice(guard.index, setter);
  assert.ok(
    /if \(!isServerAction\) \{\s*$/.test(between),
    "the visit cookie is set outside the server-action guard again -- every action is a navigation"
  );
});
