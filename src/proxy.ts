import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The old default Vercel-assigned domain. Exact match only -- preview
// deployment hosts (e.g. "rv-alumni-git-branch-team.vercel.app" or
// "rv-alumni-<hash>.vercel.app") must keep working unredirected, so this is
// never a prefix/suffix/contains check.
const LEGACY_HOST = "rv-alumni.vercel.app";
const CANONICAL_ORIGIN = "https://rishivalley.space";

/* ------------------------------------------------------------------ *
 *  Demo deployment (DEMO_MODE=1, separate Vercel project, separate
 *  database of invented people). Two jobs, both of which must happen
 *  before any of the real-site logic below.
 *
 *  1. There is no session cookie in demo mode -- identity is a constant
 *     resolved in src/lib/auth.ts -- so the cookie check further down
 *     would bounce every single request to /login. The demo branch
 *     returns before it can.
 *  2. Shut the doors that lead somewhere the demo has no business going,
 *     before the route code runs at all. This is the outermost of the
 *     three layers (proxy -> per-action guard -> Prisma allowlist).
 * ------------------------------------------------------------------ */
const IS_DEMO = process.env.DEMO_MODE === "1";

// Page routes the demo does not open: the admin surface, the dev/preview
// rooms, and every flow that only makes sense when accounts are real.
// Mirrors DEMO_CLOSED_PATHS in src/lib/demo.ts (kept honest by demo.test.mjs;
// this file cannot import it, because proxy is bundled for the edge runtime).
const DEMO_CLOSED_PATHS = [
  "/admin",
  "/lab",
  "/signup",
  "/verify",
  "/catchups/join",
  // The email flows. The demo persona has no password to reset and no mailbox
  // to confirm (sendMail refuses outright in demo mode), so these three could
  // only ever show a stranger a form that does nothing.
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // The real account-setup wizard (register/houses/photo/done). It reads and
  // edits Meera's actual row -- the one persona every visitor shares -- so one
  // visitor stepping through it changes what the next one sees, and the photo
  // step calls updateAvatar, which is a demo upload every visitor already gets
  // refused with a clear sentence. It is also simply not this deployment's
  // story: nobody arrives at the demo mid-signup (bug audit M63).
  "/welcome",
];

// API routes the demo refuses outright. Each either spends real money,
// writes real bytes to a real bucket, or hands out a real session:
//   /api/upload   -- an anonymous stranger putting files into R2 is the
//                    single most dangerous thing a public link can offer.
//   /api/razorpay -- live payment intents and the payment webhook.
//   /api/auth     -- the credentials sign-in endpoint. The demo has one
//                    invented visitor and no real accounts, so every call
//                    here is either an attack or a mistake. (Until
//                    2026-08-19 this line also guarded admin-login, which
//                    minted an ADMIN session from an email address alone;
//                    that route is deleted -- security audit C1-b.)
//   /api/resend   -- delivery reports write to the real OutboundEmail rows.
//                    The demo has no business recording anything about mail
//                    sent to real members.
//
// /api/places USED to be closed here as "a metered geocoding provider, i.e.
// a billing amplifier pointed at the owner's account" -- true of an earlier
// design, not of the route that shipped: src/app/api/places/search/route.ts
// is a plain `SELECT ... FROM "Place"` over this project's own Postgres, no
// external call and no per-request cost. Layer 3 (demoWriteAllowed) already
// treats it as an ordinary read and lets it through; closing it here only
// meant the "Where you are" city search never worked in the demo (bug audit
// M64). The demo's Place table is seeded with the cities ALL_DEMO_PEOPLE
// actually live in (src/lib/demo-seed/places.ts) so the search has
// something real to find.
const DEMO_CLOSED_APIS = [
  "/api/upload",
  "/api/razorpay",
  "/api/auth",
  "/api/resend",
];

/* Not a session and not an identity: a per-browser id for one sitting, used
   only to attribute page views to one Visit row. Rolling, so it expires 30
   minutes after the LAST page view rather than the first. */
const VISIT_COOKIE = "rv-visit";
const VISIT_TTL_SECONDS = 30 * 60;

/* FNV-1a. Synchronous (the proxy is not async), stable, and only ever used to
   agree on an arbitrary key -- nothing here is a security boundary, so a
   non-cryptographic hash is the right tool. */
function derivedVisitId(seed: string): string {
  const bucket = Math.floor(Date.now() / (VISIT_TTL_SECONDS * 1000));
  const input = `${seed}:${bucket}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `v-${bucket.toString(36)}-${h.toString(36)}`;
}

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /* Analytics never sees a session token.
   *
   * posthog-js fires at the same-origin `/ingest` path (the rewrites in
   * next.config.ts exist so ad blockers cannot see a third-party hostname),
   * and a same-origin request carries every cookie this site has set --
   * including the HttpOnly session token. The rewrite then hands the whole
   * request, cookies and all, to PostHog. The comment on the public-path list
   * below used to claim these requests "carry no session by design"; a real
   * signed-in browser proved otherwise, with the full authjs.session-token
   * arriving at the rewrite's destination (bug-report-2 C-198).
   *
   * PostHog identifies events from the payload, never from our cookies, so
   * there is nothing here to lose by stripping them. Done in the proxy rather
   * than in the rewrite because a rewrite cannot edit headers -- and done for
   * every /ingest path, event endpoint and SDK asset alike, since both are
   * same-origin and both were carrying it. */
  if (pathname === "/ingest" || pathname.startsWith("/ingest/")) {
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    return NextResponse.next({ request: { headers } });
  }

  if (IS_DEMO) {
    // JSON for APIs, not a redirect: a fetch() handed a 302 to an HTML page
    // fails far more confusingly in the client than a plain 403 does.
    if (isUnder(pathname, DEMO_CLOSED_APIS)) {
      return NextResponse.json({ error: "Not available in the demo." }, { status: 403 });
    }
    // Closed pages go to the feed rather than 404: the visitor clicked
    // something that does not apply to them, and a dead end reads as a
    // broken site when the whole purpose here is to look finished.
    if (isUnder(pathname, DEMO_CLOSED_PATHS)) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    // "/" keeps its landing page (it is some of the best work on the site);
    // everything else is already signed in, so nothing is gated.
    return NextResponse.next();
  }

  // Canonical-domain redirect: send the old Vercel host to the real domain,
  // preserving the full path and query string. Runs before the auth check
  // below (and before the public-path allowlist) so it applies to every
  // route, logged in or not. NEXTAUTH_URL on Vercel should also be checked
  // against the env dashboard -- if it still points at the legacy host,
  // auth callbacks/cookies can mismatch even though this redirect fires.
  //
  // Reads the raw `Host` header rather than `request.nextUrl.hostname`:
  // verified locally (curl with a spoofed Host header against `next dev`)
  // that `nextUrl.hostname` stays "localhost" and does NOT pick up the
  // incoming Host header, while `headers.get("host")` reflects it exactly --
  // and that's also what Vercel's edge sets from the actual request domain,
  // so this is the reliable field in both places. Split off a port defensively
  // even though production Vercel traffic never carries one on this header.
  const requestHost = (request.headers.get("host") ?? request.nextUrl.hostname).split(":")[0];
  if (requestHost === LEGACY_HOST) {
    const target = new URL(pathname + request.nextUrl.search, CANONICAL_ORIGIN);
    return NextResponse.redirect(target, 308);
  }

  // Check for NextAuth session cookie (lightweight check — actual session
  // validation happens server-side in the layout)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  // Signed-in visitors typing the bare domain want the app, not the sales
  // pitch. Handled here rather than in `app/page.tsx` so the landing page
  // stays statically rendered for logged-out visitors: calling `auth()` in
  // the page would opt the whole route into dynamic rendering for everyone.
  //
  // A stale cookie sends them "/" -> "/feed" -> "/login" (the (main) layout
  // does the real session check). That chain is self-correcting and lands
  // them exactly where a logged-out visitor to "/feed" belongs anyway.
  if (pathname === "/" && sessionCookie) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // Groups was retired as a user-facing feature (owner, 2026-07-25): a
  // Catch-up is now started from a set of people, and the Group row survives
  // only as the hidden membership container underneath. Old links, bookmarks
  // and notification deep links still exist, so send them somewhere real
  // rather than to a 404.
  if (pathname === "/groups" || pathname.startsWith("/groups/")) {
    return NextResponse.redirect(new URL("/catchups", request.url));
  }

  // Same shape, same reason: the school-donation framing was dropped and
  // supporting the platform's hosting lives at /support. This was a page under
  // (main) whose entire body was `redirect("/support")`, which meant it sat
  // behind auth -- so a signed-out holder of an old /donate link bounced
  // through /login before finding out where it went. Answering here costs one
  // fewer route in the build and gets the answer in before the session check.
  if (pathname === "/donate") {
    return NextResponse.redirect(new URL("/support", request.url));
  }

  // Public routes that don't require auth
  // NOTE: "/lab" is NO LONGER public (audit M19). It was the one index over
  // every dev/preview room, and /lab/everything served an internal audit log
  // with quoted source paths. It is now admin-only: removed from this list, so
  // it requires a session, and gated to the admin role in src/app/lab/layout.tsx
  // (a non-admin gets a 404, which also hides that the tree exists).
  // "/catchups/join" is public so a shared invite link can be OPENED by
  // someone with no account (the whole point of it). Only the join page is
  // exposed: prefix matching means /catchups and /catchups/<id> stay gated,
  // because neither equals "/catchups/join" nor starts with "/catchups/join/".
  // The page itself shows a stranger only the Catch-up's name, its Keeper and
  // a member count, never anything anyone wrote.
  // "/hoopoe" is the mascot playground, a link handed to people who do not
  // have an account and are being shown the character rather than the site.
  // Gating it behind a session would defeat the only reason it exists. It
  // reads nothing and writes nothing: the page is one client component
  // driving the SVG rig, with no database call anywhere behind it.
  // "/api/razorpay" is public because Razorpay's webhook is a server-to-server
  // POST with no session cookie -- gated, every webhook would be answered with
  // a redirect to /login and no payment would ever be recorded when the payer
  // closed their tab. The route authenticates the request itself, by HMAC over
  // the raw body against RAZORPAY_WEBHOOK_SECRET.
  // "/forgot-password", "/reset-password" and "/verify-email" are public
  // because every one of them is reached by somebody who CANNOT sign in, or is
  // opening a link on whichever device holds their inbox rather than the one
  // they signed up on. Gating them behind a session would bounce exactly the
  // people they exist for. Each is guarded by its own single-use token instead
  // (src/lib/auth-tokens.ts); /forgot-password takes only an address and
  // answers identically whether or not it matches an account.
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    // The three policy documents (audit H12). Public on principle: someone
    // deciding whether to sign up must be able to read the privacy policy
    // BEFORE handing over an email address, and the signup consent line
    // links all three.
    "/privacy",
    "/terms",
    "/guidelines",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/auth",
    "/api/razorpay",
    // The local tooling sign-in (screenshots, the visual suite, the
    // chrome-devtools MCP). It has to be reachable WITHOUT a session --
    // handing one out is its whole job -- but it answers 404 unless
    // NODE_ENV is not production AND DEV_LOGIN_SECRET is set and matches,
    // so on every Vercel build, preview included, this path is dead.
    "/api/dev-login",
    // Resend's delivery reports. Server-to-server, no session cookie, so
    // without this every webhook is answered with a redirect to /login and
    // Svix retries it into oblivion. Authenticated by its Svix signature in
    // the route itself; nothing there trusts an unsigned body.
    "/api/resend",
    // PostHog's reverse proxy (rewrites in next.config.ts). Analytics fires on
    // the signed-out landing page too, so without this the very events we
    // proxied to save from ad blockers would be lost to a redirect instead.
    // These requests DO carry the session cookie -- same origin, so the
    // browser attaches everything -- which is why the branch at the top of
    // this file strips it before the rewrite (C-198). This entry used to
    // claim they carried no session "by design"; they always had.
    "/ingest",
    // The nightly Catch-up advance cron (audit M27). A server-to-server GET
    // from Vercel with no session cookie; authenticated by CRON_SECRET inside
    // the route, so it is exposed here only to get past the redirect-to-login.
    // Exact path, not a prefix, so the member-facing /api/catchups routes stay
    // gated.
    "/api/catchups/tick",
    // The nightly retention sweep (audit M34), same shape as the tick above:
    // a server-to-server GET from GitHub Actions carrying CRON_SECRET, no
    // session cookie. Exact path; nothing else lives under /api/retention.
    "/api/retention/sweep",
    // The nightly demo reset, the third cron and the one that was forgotten
    // here (audit C-111/C-136). Same shape again: a cookieless
    // server-to-server GET, CRON_SECRET-checked inside the route. ONE
    // vercel.json ships the crons to BOTH Vercel projects, so this fires
    // against production too -- where the route answers a deliberate 200
    // no-op, written so the nightly run reports success instead of raising a
    // failed-cron alert. It could never run: the proxy 307'd it to /login
    // first, and a permanently non-2xx nightly cron is exactly what teaches
    // somebody to stop reading cron logs. Exposing the path adds no surface:
    // the GET is CRON_SECRET-gated and the POST answers 404 off the demo.
    "/api/demo/reset",
    "/catchups/join",
    "/hoopoe",
  ];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    /* An API answers in the language it speaks (audit C-202).
       Every gated path used to be 307'd to /login, /api included -- and a
       redirect to an HTML page is not something a `fetch` can act on. The
       browser follows it, `res.ok` is true, and `res.json()` throws a
       SyntaxError on the login markup, so the caller lands in a generic catch
       and the member is shown "something went wrong" for what is really "sign
       in again". Note this fires only for a TRULY absent cookie: a revoked
       session still HAS its cookie, passes here, and gets the route's own 401.
       Pages still redirect, because a person following a shared link should
       arrive at the sign-in form with their destination in tow. */
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    // `next`, not `callbackUrl`. This used to write a parameter nothing read:
    // the login page and safeNextPath both look only at `next`, so every
    // shared deep link -- a letter, a profile, a Catch-up invitation --
    // dropped the visitor on /feed after they signed in (bug audit B-022).
    // The search string travels too, so a filtered directory link survives.
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  /* The path, forwarded as a request header so a SERVER component can read it.
     A layout has no usePathname and Next exposes no reliable equivalent, and
     the alternative -- a client component reporting its own location back over
     fetch -- would be a second round trip on every navigation to learn
     something this process already knows. Consumed by touchLastSeen
     (src/lib/last-seen.ts) to record which page a member is actually on. */
  const withPath = new Headers(request.headers);
  withPath.set("x-pathname", pathname);
  /* And the query string, separately, for the (main) layout's own sign-in
     redirect (audit C-117/C-200). That gate fires for a cookie this one waved
     through on presence alone -- a revoked session after a password reset --
     and without the search string a filtered directory link or a Catch-up
     invitation comes back stripped. Kept apart from x-pathname rather than
     appended to it because touchLastSeen records that header as the page
     somebody was on, and a search term is not part of the page's name. */
  withPath.set("x-search", search);

  /* THE VISIT ID, held in a rolling 30-minute cookie.
     touchLastSeen used to find-then-create ("is there an open visit? no ->
     make one"), which races: several page loads land together, all read "no
     open visit" before any of them has written one, and each creates its own.
     The owner saw the result as four separate 0-second visits from one person
     in one sitting.
     A cookie removes the guess entirely. The browser carries its own visit's
     identity, so the write is an upsert on a known primary key with nothing to
     race over, and the 30-minute session gap comes free from the cookie's own
     expiry -- refreshed on every request, so it slides. */
  /* Cookie first. On a COLD browser there is no cookie yet and several
     requests land in parallel -- the page, its RSC payload, a prefetch -- so a
     random id per request would have each of them mint a different one and
     only the last Set-Cookie would win. That is what still produced six rows
     from one sitting after the first fix.
     So the fallback is DERIVED, not random: the same session token in the same
     30-minute bucket always yields the same id, which means a burst of
     simultaneous requests agrees without needing to coordinate. The cookie
     then takes over and slides, so a long visit never splits at a bucket
     boundary the way a bucket alone would. */
  const existing = request.cookies.get(VISIT_COOKIE)?.value;
  const visitId =
    existing && /^[0-9a-z-]{8,64}$/.test(existing)
      ? existing
      : derivedVisitId(sessionCookie?.value ?? request.headers.get("user-agent") ?? "anon");
  withPath.set("x-visit-id", visitId);

  const res = NextResponse.next({ request: { headers: withPath } });

  /* NEVER ON A SERVER ACTION. Next treats any cookie modified while an action
     runs as a revalidation (`isCookieRevalidated` in its action handler), and
     answers a revalidated action the way it answers a navigation: it renders
     the page again on the server, re-applies the tree on the client, and
     scrolls to the top. Sliding this cookie on an action POST therefore
     turned every `loadPhotos` call -- a page of photographs, nothing more --
     into a full re-render of /collection with a jump to the top of it, and
     with a `?when=` in the address it closed a loop the owner had to reload
     out of. Measured on the action's own response: `set-cookie: rv-visit`
     beside `x-action-revalidated: 1`, and an RSC GET straight after.

     An action is not a page view, so it has nothing to say about the
     visit's 30-minute window; the page and RSC requests around it keep the
     cookie sliding exactly as before. The `x-visit-id` header still goes
     through above, so anything the action records is attributed to the
     same sitting. */
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (!isServerAction) {
    res.cookies.set(VISIT_COOKIE, visitId, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: VISIT_TTL_SECONDS,
    });
  }
  return res;
}

/* robots.txt and sitemap.xml are excluded for the same reason as the brand
 * assets below, one step further out: the thing fetching them is never signed
 * in and never can be. Without the exclusion a crawler was 307'd to /login and
 * read the sign-in page as this site's crawl policy, so the site shipped no
 * policy at all (audit C-203). Both are generated by src/app/robots.ts and
 * src/app/sitemap.ts.
 *
 * The brand assets (icon.svg, apple-icon.png, manifest.webmanifest) are
 * excluded because the thing fetching them is usually NOT signed in: a phone
 * doing "Add to Home Screen" from the landing page, a link preview, a browser
 * filling in a tab. Redirecting those to /login hands the installer an HTML
 * page where it expected an image, which is how iOS ended up drawing a plain
 * letter "R" instead of the mark. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|images/|uploads/).*)",
  ],
};
