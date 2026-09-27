# T8b — shell-common-config
Agent: T8b · Started: 2026-09-24 ~02:20 BST · Model: Fable 5.1
Charter: the shell everything else sits inside — `src/proxy.ts` and its public allowlist against the
route inventory; the root, (main), (policies) and (auth) layouts and what each awaits before any page
can paint; every error.tsx / not-found.tsx / forbidden.tsx and what a member actually sees and what
gets reported when a segment throws; the landing page, about, guide, hoopoe, manifest, robots,
sitemap; `src/components/layout/*` (not the bell), the non-T4b/T6 half of `src/components/common/*`,
`src/components/ui/*`, `src/components/landing/*`, `src/components/pwa/*`, `src/components/guide/*`;
`instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts` (CSP, headers, rewrites, body
limits, pageExtensions), `vercel.json`, `package.json`, `tsconfig.json`, eslint, playwright config;
`src/lib/api-gate.ts`, `page-label.ts`, `origin.ts`, `utils.ts`, `local-storage.ts`, `theme.ts`,
`next-path.ts` (on the way), `globals.css` only where a runtime bug led (it did not). Seeded questions
taken and answered: the proxy's page redirect for a session-less action POST (T8b-03); `bodySizeLimit`
25 MB vs the platform (verified clean, lead to T4a); the privacy page as a contract (T8b-06, folding the
T7a, T6 and orchestrator rows); the after()/cookies() attribution (verified clean, argue-only); the
(main) layout's four-query `Promise.all` and which query losing the race produces which screen
(T8b-02); the layout's cost per action-triggered re-render (T8b-12); the dialog primitive's refused
close vs the back gesture (T8b-01); the 25 s crawl timeouts on `/` and `/guide` (verified clean).

Method note. Every file listed under Coverage was read end to end. Three things were probed live,
read-only, without a cookie: `curl` of public routes (the `//` prefix, the matcher-bypass shapes,
trailing slashes) and one cookieless POST carrying a bogus `next-action` id (which the proxy 307s
before any code runs; the replay at `/login` is answered by Next's own "Server action not found"
branch). No sign-in, no database write, no `npm run` gate. The Next internals cited are the installed
`next@16.3.3` sources; the `@auth/core`, Sentry and Base UI facts are from the installed packages too.

## Findings

### T8b-01 — Press Back on a dialog that refuses to close (busy, unsaved) and the NEXT Back leaves the page, taking the dialog's work with it: the primitive spends the history entry before the caller has answered
- Severity: High (T4b-02 is the Collection instance: "Discard 40 photographs?" → Cancel → Back → the page is gone and the wall with it; four more dialogs share the hole)
- Confidence: certain (read from the primitive; the coordinator's T4b-02 is the live reproduction)
- Where: `src/components/ui/dialog.tsx:15-29` (`useBackClosableRoot`: `useBackCloses(open ?? uncontrolledOpen, () => actions.current?.close())`); `src/lib/back-closes.ts:172` (`const closing = stack.filter((l) => l.pushed && l.seq > at)`), `:179-182` (`stack.splice(stack.indexOf(l), 1); l.close();` — the layer is removed and the entry is already popped BEFORE the caller decides), `:194-201` (`release`: `if (i === -1) return; // back already closed it`), `:214-222` (the effect keyed on `[open]` only, so a refused close re-runs nothing). The five refusal sites: `src/components/common/confirm-dialog.tsx:71-75` (`close()` returns while `busy`), `src/components/collection/edit-photo-dialog.tsx:142` (`!v && !saving && onClose()`), `src/components/collection/contribute-room.tsx:225-235` (`if (!v && wall > 0) { setLeaving(true); return; }`), `src/components/settings/avatar-crop-dialog.tsx:269-273` (`if (!open && !confirming) onCancel()`), `src/components/admin/moderation-dialog.tsx:59-66` (`handleClose` returns while `submitting`).
- Taxonomy: 6b (effect keyed on the wrong thing; a listener whose side effect outlives its guard) · 6a (state machine hole) · L7
- Expected: `back-closes.ts:1-13`: "each one, while open, owns one history entry at the SAME address. Back pops that entry and the overlay closes". While a dialog is open it always owns an entry, so Back can never reach the page underneath it.
- Actual: Back pops the entry; `onPop` splices the layer off the stack and calls `close()`; the caller refuses (busy/dirty) and keeps `open` true; the `[open]` effect does not re-run, so no entry is pushed again and the dialog now covers a page whose own entry is next in line. The next Back (or the swipe that produced the first one, repeated because nothing visibly happened) lands on the previous page: the in-flight save is orphaned, the crop is lost, the contribute wall is discarded, the confirm dialog's action races the navigation. On Android the swipe-back is the reflex that opened this whole module (the owner's own words at the top of the file).
- Why: the primitive treats the pop as the close. `l.close()` is Base UI's `actions.close()`, which for a controlled `open` only ASKS via `onOpenChange(false, details)`; the answer arrives (or does not) on a later render. Nothing observes that render. When the dialog later closes normally, `release()` finds `i === -1` and returns — correct for the accepted case, silent for the refused one.
- Proof: any of the five, with the throwaway account, on a phone or with chrome-devtools' history: open the Collection contribute room, drop two photographs, press Back → "Discard?" → Cancel → press Back again → the page navigates away (T4b-02). Cheaper: open Edit photo on any photograph, press Save on a slow network (throttle), press Back during "Saving…" (refused), press Back again → previous page. Read-only variant: `window.history.length` and `history.state` in the console before and after the first Back — the marked entry is gone while the dialog is still open.
- Fix direction (in the primitive, not per site): keep the layer in the stack across a pop and let the hook re-arm. In `onPop`, mark `l.pushed = false` and call `l.close()` WITHOUT splicing; in `useBackCloses` add an effect with no deps that, while `open` and `!layer.pushed && !rewinding`, calls `pushEntry(layer)` — a refused close always re-renders the dialog (setLeaving / setBusy / the toast), so the entry comes back on that render; an accepted close flips `open`, the `[open]` cleanup runs `release()`, which now removes the layer (it is still in the stack) and, because `pushed` is false, rewinds nothing. For the one refusal that does NOT re-render (`confirm-dialog`'s `if (busy) return`), either make the refusal set state, or add a deferred check in `onPop` (`setTimeout(0)`: if the layer is still in the stack and its latest `open` ref is true, push again). Keep `release()`'s `i === -1` guard for the accepted path.
- Gate: `src/lib/back-closes-rule.test.mjs` already pins that nothing else touches history; add a unit test for the module with a fake `window.history` (push/back/popstate) asserting: open → pop → close refused (the `close` callback leaves `open` true and re-renders) → the stack still holds the layer and one marked entry exists again; and open → pop → close accepted → stack empty, no rewind. The T4b-02 Playwright reproduction as the integration pin.
- Known-related: T4b-02 (the Collection instance, routed here for the primitive fix).

### T8b-02 — One five-second pool wait in the signed-in shell shows four different screens depending on which query lost, and none of them paints until the shell has waited: blank, then a sign-in form, or a full-screen apology with no navigation, or nothing wrong at all
- Severity: Medium (the login-bounce face is O-03, High; this is the other three faces and the blank that precedes all four, and the fix is shared)
- Confidence: certain for the mechanism (boundary nesting from Next's own rule; the queries' catch shapes read); the timings are `src/lib/prisma.ts`'s numbers
- Where: `src/app/(main)/layout.tsx:26` (`await auth()`), `:83-103` (the four-way `Promise.all`), `:36-37` (`redirect("/login?next=…")`); `src/lib/notification-count.ts:14-18` (no catch), `src/lib/email-queue.ts:963-1023` (`verificationMailState`, no catch), the inline `prisma.catchup.findFirst` at `layout.tsx:98-101` (no catch), `src/lib/catchups.ts:526-533` (`advanceDueCatchups` swallows and `reportSwallowed`s); `src/app/error.tsx:15-31` (the root boundary: full screen, no shell); `src/app/(main)/error.tsx:6-26` (its own comment: it wraps the (main) layout's children, so a throw in the layout itself passes it); `src/lib/prisma.ts:45-51` (`max: 5`, `connectionTimeoutMillis: 5000`, `query_timeout: 20000`).
- Taxonomy: 6k (DB slow mid-request: does the member see something actionable? no) · 6b (one boundary shape gating a whole tree; the layout's awaits sit above every `loading.tsx`) · 6a (`Promise.all` where one rejection should not abort siblings) · 6d/6j (the pool of five under Fluid compute)
- Expected: a slow database reads as "give it a moment" and the member keeps their page and their navigation (the sign-in door already has that sentence for the same condition).
- Actual, in order of time: (1) nothing paints. The (main) layout is an async server component outside any Suspense boundary, so the document's first byte (hard load) or the RSC response (client navigation, the old page stays on screen with the browser's own spinner) waits for `auth()` — up to 5 s to get a connection plus up to 20 s for the row read — and THEN for the slowest of three more queries, another 5 s + 20 s worst case; the page's own `loading.tsx` is inside the layout and cannot show. (2) Then one of four screens, chosen by which query timed out: `auth()`'s `findUnique` → `@auth/core` logs and returns a null session → `redirect("/login?next=…")` (O-03: signed out mid-form, cookie still valid). `unreadNotificationCount`, the Catch-up `findFirst`, or (unconfirmed members only) `verificationMailState` → the layout throws → the ROOT `error.tsx`: "Something went wrong … Try again", full screen, no sidebar, no bell, no way to the feed except the browser (exactly the state `(main)/error.tsx` was written to end, audit M05). `advanceDueCatchups` → swallowed, one Sentry event, page renders. The PAGE's own query → `(main)/error.tsx`, shell kept. Same cause, four experiences; the member cannot tell which they got or why.
- Why: `Promise.all([...])` at `:83-103` rejects on the first rejection; three of its four members have no catch; the layout has no boundary of its own above it but the root's. The comment at `:40-58` argues the advance must block "to make the page you are about to read correct" — true of the advance, not of a badge count or a sidebar row.
- Proof: argue-only against production; locally safe: point a dev server's `DATABASE_URL` at a host that accepts TCP and never answers (or at a Supavisor pool sized 1 while another client holds it) and load `/feed` with the throwaway cookie: blank for ~5 s, then `/login?next=/feed`. Then make `auth()` succeed and only the notification count hang (e.g. a `pg_sleep` trigger is a write, so instead reduce `query_timeout` to 1 ms in a scratch env and watch which face appears) — the root apology with no shell. `grep -c JWTSessionError .next/dev/logs/next-development.log` (12 today) is the login face's live count.
- Fix direction: (a) T5-17/O-03's `SessionUnavailable` for the auth read. (b) In the layout, make the three non-essential reads degrade instead of throw: wrap `unreadNotificationCount`, the Catch-up `findFirst` and `verificationMailState` so a failure yields `0` / `null` / `null` and one `reportSwallowed` — the shell paints with a badge of 0 and the Catch-ups row hidden for one page view rather than no shell at all. (c) Let the shell paint before the count: stream `unreadCount` and `hasCatchup` to the sidebar as promises (`use()` behind a Suspense boundary in `AppShell`), so `loading.tsx` and the rail appear on `auth()` alone; keep the advance where the comment wants it or move it to `after()` for action-triggered renders (T8b-12). (d) L5's half: the pool arithmetic under Fluid compute.
- Gate: a layout test that renders `MainLayout` with each of the three helpers rejecting and asserts the shell still renders (and that a rejecting `auth()` never redirects to `/login` once T5-17 lands); `session-revocation.test.mjs`'s pin from O-03.
- Known-related: O-03 / T5-17 (the auth face), T5-02 (the outage is invisible), L5 (capacity). This finding is the shell-side half the orchestrator asked T8b to build; it does not re-derive O-03.

### T8b-03 — An action POST whose cookie has lapsed is bounced to /login, replayed there by the browser, forwarded by Next back to its own page, bounced again, and comes home as `200 {}`: three invocations to produce "Check your connection"
- Severity: Medium (every server action in the app after the 90-day absolute cookie lapses, or after a revocation on another device — a launch cohort hits it on the same day; T5-06 owns the member-facing sentence, this is its shell-side mechanism and the fix that belongs in the proxy)
- Confidence: certain (traced through the installed Next 16.3.3 sources and reproduced cookieless with a bogus action id: `307 → /login?next=%2Ffeed`, then `404 text/plain "Server action not found."` from the replay)
- Where: `src/proxy.ts:304-326` (no cookie: `/api/*` gets a JSON 401 at `:315-317`, everything else `NextResponse.redirect(loginUrl)` at `:325` — status 307 by default, `node_modules/next/dist/server/web/spec-extension/response.js:98-99`); `node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:43-58` (the client `fetch` follows redirects), `:135-143` (`if (!isRscResponse && !redirectLocation)` → throws `'An unexpected response was received from the server.'`, or the body text when `status >= 400 && text/plain`); `node_modules/next/dist/server/app-render/action-handler.js:494-508` (`selectWorkerForForwarding(actionId, page)` — at `/login` the action's page is elsewhere, so the request is forwarded), `:125-231` (`createForwardedActionResponse`: server-side `fetch(origin + workerPathname, { redirect: 'manual', headers: forwarded })` → the proxy 307s it again (no cookie) → not RSC, not NOT_FOUND → `return RenderResult.fromStatic('{}', JSON_CONTENT_TYPE_HEADER)`); `node_modules/next/dist/server/app-render/manifests-singleton.js:256-270`; `src/lib/call-action.ts:43-58` (every rejection → `ACTION_FAILED`).
- Taxonomy: 6c (server actions are public HTTP endpoints; the proxy answers in the wrong language) · 6e (deleted/lapsed cookie window) · 6f (invocations spent for nothing)
- Expected: a request the app can recognise as an action gets an answer the client router can act on — "sign in again", with the destination in tow — the way `/api/*` already gets its 401 (`:305-314`, audit C-202).
- Actual: 307 → the browser re-POSTs the action body and headers to `/login?next=<page>` → Next's action handler at `/login` finds the action id in another page's worker set and forwards it server-side to `<origin>/<that page>` with the (absent) cookie → the proxy answers 307 → `redirect: 'manual'` leaves it unfollowed → the handler returns `200 {}` `application/json` → the reducer throws "An unexpected response was received from the server." → `callAction` → "That did not go through. Check your connection and try again." Cost per attempt: two edge invocations and one function invocation, plus the replay's body. A no-JS `<form action>` post replays as an MPA action at `/login` and executes there (the action's own auth check still refuses).
- Why: `NextResponse.redirect` defaults to 307, which preserves method and body; the proxy's `isServerAction` test (`:392`) is computed AFTER the redirect branch and only guards the visit cookie.
- Proof: cookieless, from a shell: `curl -s -o /dev/null -X POST -H 'next-action: <any 42-hex id>' -H 'accept: text/x-component' --data '[]' -w '%{http_code} %{redirect_url}' http://localhost:3000/feed` → `307 …/login?next=%2Ffeed`; add `-L` → `404 text/plain Server action not found.` (bogus id). With the throwaway account in a browser: sign in, delete the session cookie in DevTools, press Save on any form → the network tab shows POST `/letters/new` 307, POST `/login?next=…` 200 `application/json` `{}`, and the toast "Check your connection".
- Fix direction: in `src/proxy.ts`, before the page redirect, `if (request.method === "POST" && request.headers.has("next-action"))` answer with something the client router understands. Two choices for the fix session: (1) `new NextResponse(null, { status: 303, headers: { "x-action-redirect": "/login?next=<path>;replace", "content-type": "text/plain" } })` — the reducer (`:110-134`, `:274-279`) treats a response with `x-action-redirect` and no flight data as a redirect and hard-navigates to the sign-in form (`completeHardNavigation`), which is exactly a `redirect()` thrown from an action; the header name is Next-internal but has carried this meaning since 13.4. (2) `401 text/plain "Please sign in again."` — the reducer surfaces a `text/plain` body as the rejection message (`:143`), so `callAction` can map that exact sentence to a sign-in sentinel and navigate. Either way the two extra invocations disappear. T5-06's letters-desk local belt is unaffected by the choice.
- Gate: `security-regressions.test.mjs` or a proxy unit test: an action-shaped POST without a cookie must not be answered with a 307 to a page; the login-page HTML must never be served to a request carrying `next-action`.
- Known-related: T5-06 (member-facing), O-04 (the sentence), C-202 (the API half, fixed).

### T8b-04 — "5m ago" is computed at render inside client components the server also renders, so any feed with a fresh post or comment hydrates against a different clock and React throws the boundary away and redraws it
- Severity: Medium (invisible on today's 25 day-old posts; at launch, minute-granularity timestamps on every fresh post and comment make the mismatch routine — one crossing per card per minute, ~2-3 s of SSR-to-hydration gap)
- Confidence: likely (argued from the call sites and React 19's hydration rules; O-01 is the same class, confirmed live for a date string; what would change my mind: React 19 tolerating text-only mismatches without regenerating the boundary — it does not, it logs "Hydration failed … this tree will be regenerated on the client")
- Where: `src/lib/utils.ts:73-109` (`formatTimeAgo(date)` reads `new Date()` at call time). Client-component callers rendered on the server: `src/components/posts/post-card.tsx:406`, `src/components/posts/comments-section.tsx:1075`, `src/components/layout/notification-bell.tsx:481` (T7b's file, same defect), `src/components/admin/content/content-list.tsx:180`, `src/components/admin/mail/mail-rows.tsx:111`, `src/components/admin/review/review-room.tsx:651`, `src/components/admin/reports/report-list.tsx:88`. Server-only callers (safe): `admin/audit/page.tsx:96,126`, `admin/(index)/page.tsx:201`, `messages/thread-list.tsx:70`, `messages/conversation.tsx:88`, `admin/messages/thread-list.tsx:62`.
- Taxonomy: 6b (hydration mismatch; server/client clocks) · 6h dates (a relative time is a date computed on two machines) · L3
- Expected: the HTML the server sent and the client's first render agree; timestamps that must move do so after mount.
- Actual: the server prints "just now" at 00:59.8 after the post; the client hydrates at 01:00.9 and computes "1m ago"; React 19 reports a recoverable hydration error and client-renders the nearest Suspense boundary — the feed list's `m.div` entrances replay (`FadeRise`, `initial={{ opacity: 0 }}`), images re-request, and the console fills with "Hydration failed"; the same at 59→60 minutes, 23→24 hours, 6→7 days, and at every year boundary for the `otherYear` branch. `post-card.tsx:406` renders it inside `metaLine`, so the whole byline string differs.
- Why: `formatTimeAgo` has no `now` parameter and no `suppressHydrationWarning` on any of the seven elements; the server's `Date.now()` is the render time, the client's is the hydration time.
- Proof: with the throwaway account, post a comment, then load `/feed` in a fresh tab at seconds :57-:59 of the comment's minute with the dev server's multi-second SSR (or throttle the network); read the console for `Hydration failed` naming `post-card.tsx`/`comments-section.tsx`. Or `grep "Hydration failed" .next/dev/logs/next-development.log` after any session that commented and reloaded.
- Fix direction: give `formatTimeAgo` a `now` argument and pass a request-time `now` down as a prop (one `Date` per request, serialised as a number), or wrap each relative timestamp in `<time dateTime={iso} suppressHydrationWarning>` (React allows a one-level text mismatch under that flag) and refresh it from a `useNow()` hook after mount; either way the seven call sites stop reading the clock during render.
- Gate: extend `src/lib/valley-day.test.mjs` (already sweeping date rendering): every `formatTimeAgo(` inside a `"use client"` file must be under a `suppressHydrationWarning` element or take the `now` prop; it fails today on the seven sites.
- Known-related: O-01 (the date twin, `drafts-strip.tsx`), bugs.md #6 (the latent-class note). Not the same instance: this is the clock, not the time zone.

### T8b-05 — The (i) tooltip opens on hover and toggles on click, so a finger's tap opens it and closes it in the same gesture on Android; the note needs two taps, and on a desktop the 6 px gap closes it before the pointer can reach it
- Severity: Medium (it is the only explanation next to the signup's batch year and the contribute room's description hint — the two forms the owner has asked to be calm — and a control that does nothing on the first tap reads as broken)
- Confidence: likely (argued from the compatibility mouse-event order every touch browser fires: `mouseover/mouseenter → mousemove → mousedown → mouseup → click`; iOS additionally suppresses the click when the mouseenter handler changes the DOM, which makes iOS open on the first tap and Android not — a real Android or DevTools touch emulation settles it)
- Where: `src/components/common/info-tooltip.tsx:50-58` (`onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen((o) => !o)}`), `:60-63` (`sideOffset={6}` and `onMouseEnter`/`onMouseLeave` on the content). Callers: `src/components/common/float-field.tsx:283-285` (every `FloatArea` with a `hint`: the Collection's contribute and edit dialogs), the signup batch note and the settings note named in the file's own header (`:19-21`).
- Taxonomy: 6b (pointer-type assumptions in a client primitive) · L7 · 6h (coarse pointer as an input class)
- Expected: `:13-17`: "reveals a short explanation on hover (desktop) or tap (mobile … so tap genuinely opens and closes it on touch devices)".
- Actual: Chromium on Android: tap → `mouseenter` sets open → `click` toggles it closed → nothing visible; the second tap (the virtual pointer is still over the element, so no second `mouseenter`) toggles it open. iOS: the first tap opens (WebKit withholds the click because the DOM changed on mouseenter); a tap elsewhere fires `mouseleave` and closes it, which is fine. Desktop: the trigger's `onMouseLeave` fires in the 6 px gap between trigger and note, so the note closes before the pointer arrives and its text cannot be selected or its link (if ever) clicked.
- Why: hover and press are wired as two independent open/close channels on the same state with no pointer-type discrimination.
- Proof: chrome-devtools with a touch-emulated device on `/signup`: tap the (i) beside the batch year once (nothing), twice (opens). Read-only.
- Fix direction: open on hover only for `pointerType === "mouse"` (`onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}`, same for leave), keep `onClick` as the toggle for everything, and either bridge the gap (`sideOffset` 0 with padding inside the panel, or a small close delay) or drop the content's mouse handlers. Base UI's Popover has `openOnHover`/`delay` for exactly this if the fix session prefers the primitive's own.
- Gate: a Playwright touch test on `/signup` (after the answer is known in the MCP): one tap opens the note; `focus-recipe.test.mjs`-style sweep that no `onMouseEnter` opener in `src/components/common` lacks a pointer-type guard.
- Known-related: none in the baseline.

### T8b-06 — The privacy policy promises things the code does not keep, and is silent about the two telemetry tables it keeps longest
- Severity: Medium (the owner is the named controller, in the UK; the page is the one document a member and a regulator read as a contract; every item below is either a sentence to change or one retention step to add before launch)
- Confidence: certain for each item as cited (the cross-territory ones cite the finder's row)
- Where: `src/app/(policies)/privacy/page.tsx` — every line is quoted below; `src/lib/retention.ts:28-77` (`KEEP_DAYS`), `:116-132` (the sweep's steps: reports, contributions, notifications, loginAttempts, auditLogs, outboundEmails, visits, searches; `:199` adminMessages) — no step for `ContentView`; `prisma/schema.prisma:1598-1628` (`ContentView`: viewer, kind, target, count, firstAt, lastAt; `@@unique([viewerId, kind, targetId])`, never expired); `src/lib/last-seen.ts:44-54, 91-111` (what a `Visit` row holds: referrer host, device, os, browser, language, country, city, region, the path trail); `vercel.json:3` (`"regions": ["bom1"]`); `src/app/manifest.ts`/`next.config.ts:139` (voice recordings live on the image host under `audio/`).
- Taxonomy: 6h identity states (deleted, deletion-requested) · L9 (a document that lies about the code) · 6j (the unbounded table it does not mention)
- The sentences NOT kept, in page order:
  1. `:99` "which you can undo at any time in settings", `:160` "You can delete your account yourself, from settings", `:177` "You can see and change everything on your profile in settings", `:178` "from the same place" — there is no `/settings` route (`src/lib/auth.ts:285` says so in its own words: "Not \"/settings\": that route does not exist"; `sidebar.tsx:557-561`: "There is no settings page any more: your profile IS it"). The word should be "your profile" (the pencil on your own profile page).
  2. `:177` "change everything" — the sign-in email cannot be changed anywhere (T5-01, T6-06: there is no email-change path, only the mailbox reset; and no signed-in password change).
  3. `:177-178` "You can download a copy of your data, as one file" — the export is not a copy of everything held (T6-03 lists what `api/account/export` omits; at minimum the `Visit`, `SearchLog` and `ContentView` rows about the member, which this same page calls "usage records").
  4. `:168-169` "A few things outlive deletion, deliberately: … reports that were part of moderation decisions" — the purge deletes every report the member filed (T7a-01), so what outlives deletion is not what the sentence says.
  5. `:145-154` the retention table has no row for the presence and search telemetry — `Visit` and `SearchLog`, 90 days (`retention.ts:57-77`, `docs/SECURITY.md:88`) — although `:191` discloses "one short-lived cookie that groups a browsing session for the visit statistics"; and no row for `ContentView` (which profiles, letters, posts, photographs and Editions you opened, with first and last time and a count), which has NO retention step at all and is bounded only per (viewer, kind, target) — it outlives everything on the table except the account itself (it cascades on delete: `schema.prisma:1618`).
  6. `:63-66` "Security and usage records: sign-in attempts, the network address … and basic, first-party usage analytics" — a member's `Visit` rows carry device class, OS, browser, language, country, city, region, referrer host and a 40-stop page trail per sitting; `SearchLog` carries their search terms; `ContentView` carries what they looked at. "basic usage analytics" is not a description a member could recognise their trail in; GDPR Art. 13 wants the categories named. PostHog is a separate, third-party processor (EU cloud) rather than "first-party".
  7. `:129` "Vercel — Hosts and serves the website (United States and global edge)" — the functions run in Mumbai (`vercel.json` `bom1`); only the edge is global. `:130` "Cloudflare — Stores and serves images" — and the voice recordings (`audio/` on the same host since the Catch-ups rework).
  8. `:189-192` cookies: "one that keeps you signed in, one that remembers your theme, one … for the visit statistics, and the analytics described above" — NextAuth also sets `authjs.csrf-token` and `authjs.callback-url` during sign-in, and PostHog persists its own identifier; "a small number" is true, the list is not complete.
- The sentences that ARE kept (so the fix session does not touch them): the email kinds (`:89-91` confirm, reset, security notices ⇔ `OutboundEmail.kind` "verify" | "reset" | "password-changed", `schema.prisma:632`; Catch-up reminders are bells, not mail); the table's numbers (2 y / 3 y / 10 y / 30 d / 1 y / 180 d ⇔ 730 / 1095 / 3650 / 30 / 365 / 180); "60 days" ⇔ `DELETION_GRACE_DAYS = 60` (with T7a-19's note that the sweep lands the morning after D+60); the CDN caveat at `:112-115`; "Backups age out … within a few weeks" ⇔ `backup.yml:161-178` prunes at 30 days (monthlies kept); "signing in again cancels the deletion" (C-075 fixed, T7a/T5 territory).
- Proof: read-only — the file against the constants above. For item 5: `node scripts/dev/run-sql.mjs --inline "SELECT count(*), min(\"firstAt\") FROM \"ContentView\""` shows rows older than every window on the table.
- Fix direction: rewrite the eight sentences (words, not code) and add two rows to the table ("Visit statistics and search history — 90 days"; "Which pages you opened — <window>") — the second needs a real window: add a `contentViews` step to `retention.ts` (`lastAt < cutoff(KEEP_DAYS.presence)` is the honest default, since the analytics room's deepest lookback is 90 days per `retention.ts:74`) and pin it in the retention test. Item 6 wants one sentence naming the categories. Item 3 is T6's export fix plus one sentence here until it lands.
- Gate: a `privacy-contract.test.mjs` that greps the page for the numbers in `KEEP_DAYS` and fails on "settings"; the retention sweep test extended to `ContentView`.
- Known-related: T5-01, T6-03, T6-06, T7a-01, T7a-19, C-164 (why 90 days), the refactor-audit-2 ORCH-04 note in `retention.ts:41-50` (the last time this page and the code disagreed on a number).

### T8b-07 — A crash inside the root layout's own client components, or a failed chunk for one of them, shows Next's unstyled "Application error" page; and no client-side error anywhere is reported to anyone
- Severity: Low (the five components are small and have not thrown; the consequence, when they do, is the ugliest screen the app can show and nobody will hear about it)
- Confidence: certain (no `src/app/global-error.tsx` exists; `src/app/error.tsx` wraps the root layout's CHILDREN, not the layout; `instrumentation.ts:11-17` says there is no browser SDK by decision; neither `error.tsx` logs anything)
- Where: `src/app/layout.tsx:90-107` (`PostHogProvider`, `MotionFeatures`, `ThemeProvider`, `FocusModality`, `MascotFlightLayer`, `Toaster` — all inside `<body>`, outside the root boundary); `src/app/error.tsx:5-14` and `src/app/(main)/error.tsx:28-33` (neither reads `error`, neither reports); `src/instrumentation.ts:84-86` (`onRequestError` is server-only); `src/instrumentation-client.ts` (only `onRouterTransitionStart`); `src/components/analytics/posthog-client.ts` (`capture_exceptions` is not set although the SDK is already loaded on every page).
- Taxonomy: 6b (Suspense/boundary without a reporter) · L4 (a guard that hides its own breakage) · 6k
- Expected: a member never sees a bare "Application error: a client-side exception has occurred" page, and a crash that only happens on one phone reaches a log someone reads.
- Actual: a throw in `MascotFlightLayer` (T9's) or a failed dynamic import in `MotionFeatures`' feature chunk on a flaky connection unmounts the whole tree to Next's default page; a hydration crash inside `(main)` shows the house apology and is recorded nowhere — the console of a phone nobody is looking at.
- Proof: argue-only in production. Locally, throw inside `FocusModality`'s effect and load any page.
- Fix direction: add `src/app/global-error.tsx` in the house voice (it must render its own `<html>`/`<body>`); decide client error visibility as an owner call — the cheapest honest option is PostHog's `capture_exceptions: true` in `posthog-client.ts` (no new bundle, PII-free by construction of what it sends, and the owner already reads that room), with `error.tsx` boundaries calling `posthog.captureException(error)` in an effect; the alternative is the Sentry browser SDK the file refuses for its 30 KB.
- Gate: lab-registry-style file-existence check for `global-error.tsx`; a test that both `error.tsx` files call the chosen reporter.
- Known-related: none; T9 for `MascotFlightLayer`'s own robustness.

### T8b-08 — A 404 inside the signed-in shell renders a second `<main>` sized to the whole viewport inside the padded first one, so the apology is taller than the screen and scrolls for nothing; "Back to home" goes through two redirects
- Severity: Low (cosmetic-with-teeth: it is the page every deleted letter, profile or photograph link lands on)
- Confidence: certain (structure: only the root has a `not-found.tsx`; `src/app/not-found.tsx:23-25` says it renders under the (main) layout for a nested `notFound()`)
- Where: `src/app/not-found.tsx:35` (`<main className="relative flex min-h-svh …">`), `src/components/layout/app-shell.tsx:85-90` (the shell's own `<main className="flex w-full flex-1 flex-col p-5 sm:p-7 lg:p-10">` around `ContentColumn`), `src/app/not-found.tsx:45-47` (`<Link href="/">` → proxy `:185-187` → `/feed`); no `src/app/(main)/not-found.tsx`.
- Taxonomy: 6b · L7
- Expected: the in-app 404 fills the content column like `(main)/forbidden.tsx` does (`min-h-[75vh]`, one `<main>`), and its way out names the feed.
- Actual: `min-h-svh` + the shell's 40/56/80 px of padding + the `mb-6` header slot → 1,000 px of page for two lines; two `<main>` landmarks for screen readers; the button's `/` costs a 307 before `/feed`.
- Proof: read-only: sign in as the throwaway account and open `/letters/does-not-exist` at 1440×900; `document.querySelectorAll("main").length === 2` and `document.documentElement.scrollHeight > innerHeight`.
- Fix direction: add `src/app/(main)/not-found.tsx` shaped like `forbidden.tsx` (a `div`, `min-h-[75vh]`, link to `/feed`), keep the root one for unmatched URLs; or make the root one a `div` and read `useSoloHoopoe` as it does.
- Gate: `loading-boundary-rule.test.mjs`-style check that a `(main)/not-found.tsx` exists; visual baseline for the route.
- Known-related: bugs.md #5b (signed-out never sees the custom 404 — different half; note that `/login/anything` and `/hoopoe/anything` DO reach it signed out, via the proxy's prefix matching).

### T8b-09 — The public landing page links to no policy document: the only public Privacy / Terms / Guidelines links are in the showcase footer, which is switched off
- Severity: Low (the signup consent line links all three, so a stranger CAN reach them before handing over an address; the landing itself, the page robots and the sitemap advertise, has no footer at all)
- Confidence: certain (`src/app/page.tsx:31-38` renders only `LandingHero`; `src/components/landing/showcase.tsx:16-21` records this as a thing "to settle BEFORE it ships"; `landing-footer.tsx:64-76` holds the links)
- Where: `src/app/page.tsx:31-38`, `src/components/landing/showcase.tsx:16-21`, `src/components/landing/landing-footer.tsx:64-76`, `src/app/robots.ts:34` / `src/app/sitemap.ts:24-30` (they list the three documents; nothing on `/` points at them).
- Taxonomy: L10 (the stranger's empty state) · L9 (an in-code TODO that no ledger tracks)
- Expected: security audit H12's "transparency layer's front door": the documents a stranger should be able to find before an account exists.
- Actual: `/` is the hero and the two doors; a visitor who wants the privacy policy before pressing "Join" has to type the URL or open `/signup` first.
- Proof: read-only: `curl -s http://localhost:3000/ | grep -c '/privacy'` → 0.
- Fix direction: one quiet line under the hero's CTAs or a three-link footer strip (the `LandingFooter`'s nav block, extracted) — owner's call on the landing's look; it is his page.
- Gate: a test that the landing HTML contains `href="/privacy"`.
- Known-related: the showcase header's own note; not in bugs.md.

### T8b-10 — The proxy's public-path test admits any path that begins with `//`, and only Next's own repeated-slash redirect stands in front of it
- Severity: Low (latent: no member-visible consequence today, and every route behind it re-checks the session itself)
- Confidence: certain (the expression; the live probe `//feed` → `308 /feed` from `base-server.js:574-581`, and in dev `resolve-routes.js:101-110`, before the page renders)
- Where: `src/proxy.ts:237-238` (`"/"` in `publicPaths`), `:296-298` (`pathname === path || pathname.startsWith(path + "/")` — for `path === "/"` that is `startsWith("//")`), `:300-302` (`NextResponse.next()` without the `x-pathname`/`x-visit-id` rewrite and without stripping a client-supplied one).
- Taxonomy: 6c (allowlist drift; prefix matching side effects) · 6h (`//` as an input class)
- Expected: `/` is public exactly; nothing else is admitted by it.
- Actual: `//feed`, `//api/users/search`, `///anything` pass the proxy's cookie gate; Next then 308s them to the single-slash path, and the proxy runs again on that. If Next's normalisation were ever bypassed (a platform router in front of the function that does not normalise, or a future Next that stops), the (main) layout's own `auth()` still refuses a stranger and every API route vets itself, so the exposure is one skipped header rewrite; `safeNextPath` rejects a `//`-prefixed `next` (`src/lib/next-path.ts:21`), so the spoofed-`x-pathname` variant is closed too.
- Proof: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' 'http://localhost:3000//feed'` → `308 http://localhost:3000/feed`.
- Fix direction: `if (pathname.startsWith("//")) return NextResponse.redirect(new URL(pathname.replace(/^\/+/, "/") + search, request.url), 308)` at the top of `proxy()`, or test `path === "/" ? pathname === "/" : …`; and a comment that says why.
- Gate: `security-regressions.test.mjs`: `//feed` and `//api/presence` must not satisfy the public test.
- Known-related: none (C-111/C-202/C-203/C-204 are other proxy rows).

### T8b-11 — The proxy says the landing page "stays statically rendered for logged-out visitors"; every route in the app has been dynamic since the root layout began reading the theme cookie
- Severity: Low (a comment that lies; it will mislead the next person who tries to "protect" a static-ness that does not exist, and the true cost — one function invocation per landing visit — is nowhere written where the proxy claims the opposite)
- Confidence: certain (`src/app/layout.tsx:63-68` `generateViewport` and `:80` both `await getThemeCookie()` → `cookies()`; `src/app/(policies)/layout.tsx:8-9` and `src/app/(main)/guide/[area]/page.tsx:8-13` both say the consequence out loud)
- Where: `src/proxy.ts:177-180` ("Handled here rather than in `app/page.tsx` so the landing page stays statically rendered for logged-out visitors: calling `auth()` in the page would opt the whole route into dynamic rendering for everyone").
- Taxonomy: L9 (comment lies) · 6c (the full route cache the comment believes in is not in play)
- Expected / Actual: the redirect's real reason still holds (a redirect in the proxy is cheaper than an `auth()` in the page), but "statically rendered" is false: `/` is server-rendered per request, not served from the CDN; the dedup baseline's "root layout dynamic (theme cookie)" is the settled fact.
- Proof: `curl -sI http://localhost:3000/ | grep -i cache-control` (private/no-store; a prerendered route would carry `s-maxage`), or `next build`'s route table (ƒ, not ○).
- Fix direction: rewrite the comment to say "so `/` needs no `auth()` call and no session read at all — it is still dynamic because of the theme cookie".
- Gate: none needed; a doc fix.
- Known-related: dedup baseline A ("root layout dynamic (theme cookie)" is settled — the comment is the finding, not the dynamic-ness).

### T8b-12 — Every revalidating server action re-runs the signed-in shell: about five render-blocking queries and one more behind the response, per action, on top of the page's own
- Severity: Low (informational for L5; nothing the two `after()` callbacks assume is broken by it; it is the multiplier behind T1-06's autosave measurement)
- Confidence: certain (counted; `server-action-reducer.js:300`: "Currently the server always renders from the root in response to a Server Action")
- Where: `src/app/(main)/layout.tsx:26, 83-103, 116-122, 131`; 103 `revalidatePath`/`revalidateTag` call sites in 14 non-lab files (`catchups/actions.ts` 40, `feed/actions.ts` 15, `messages/actions.ts` 10, `collection/actions.ts` 9, `admin/people/actions.ts` 9, `onboarding/actions.ts` 5, `settings/actions.ts` 3, `admin/review` 3, `admin/reports` 3, `profile-actions.ts` 2, `support/actions.ts` 2, `admin/mail` 2, `notifications/actions.ts` 1, `catchups/(index)/page.tsx` 1) — the coordinator's 135/19 includes lab rooms and comment lines.
- Taxonomy: 6c (per-request logic in a layout; the action response re-renders it) · 6j · L5
- Per re-run, a confirmed non-teacher member: `auth()` 1 (`User.findUnique`), then concurrently `notification.count` 1 (`@@index([userId, read])`), `catchup.findFirst` 1 (`GroupMember @@index([userId])`, 0.117 ms), `advanceDueCatchups` 1 `findMany` (writes only when an Edition is due) — three connections at once from the pool of five; behind the response `drainMailQueue`'s pre-check `count` 1 (then nothing when the queue is empty) and `touchLastSeen` 0 (throttled by the row's fresh `lastSeenAt`, one `updateMany` per 15 min). A teacher: one fewer. An unconfirmed member: `verificationMailState` adds a `findFirst` + `dailyBudget`'s two counts (+ `verifySendingAt`) — 8-10 in all. T1-06's 2.5 s autosave is therefore ~2.4 shell queries per second per writing member plus the edit page's own.
- Why it is not worse: the two `after()` callbacks were written for "every authenticated page view" and an action refresh is one more of those; `touchLastSeen` reads `lastSeenAt` fresh from the same request's session row; `drainMailQueue` claims rows before sending. The one thing worth a sentence: `advanceDueCatchups` runs render-blocking inside the ACTION's response too, so the member whose autosave coincides with an Edition falling due pays for the advance (writes plus notifications) in that autosave's round trip.
- Fix direction: none required on its own; the shape belongs to T8b-02(c) (paint the shell on `auth()` alone) and L5's pool arithmetic. If a cheaper shell is wanted: skip the advance when `headers().get("next-action")` is present, and let the nightly tick and navigations carry it.
- Gate: none; a measurement.
- Known-related: T1-06, the L5 rows on `maxWait` and the pool, T5's lead on `verificationMailState` on the hottest path.

### T8b-13 — Two guide comments describe a sidebar "Guide" row that does not exist, which is the already-known reason the guide's contents page is unreachable
- Severity: Low (the bug is bugs.md's "guide contents page unreachable"; the comments are what will make the next reader believe it is fixed)
- Confidence: certain
- Where: `src/components/guide/guide-door.tsx:7-9` ("the guide has two doors: the Guide row in the sidebar, which is the findable one, and this"); `src/components/guide/guide-layer.tsx:26-27` ("guide-areas.ts is plain data the sidebar and the door both import"); `src/components/layout/sidebar.tsx:59-69` (`NAV`: feed, directory, collection, letters, catchups, support, about — no guide; the file imports nothing from guide-areas); `src/app/(main)/guide/page.tsx:12-18` (the index "has to be findable").
- Taxonomy: L9 (comment lies)
- Expected / Actual: the index at `/guide` is reachable only by typing it (and `page-label.ts:29` even names it "the guide"). The title-press door works; the "findable" half is missing.
- Proof: read the three files.
- Fix direction: the bugs.md item's own (add the row, or a Guide link under About); then fix or delete the two comments in the same commit.
- Gate: a test that `NAV` contains `/guide` once the row exists.
- Known-related: bugs.md open item "guide contents page unreachable".

---

### Continuation run, 2026-09-24 (the first run was cut off by the usage limit after T8b-13)

Agent: T8b (continuation) · Model: Opus 5.5. Everything above this line is the first run's, kept as written.
Before continuing, every citation in T8b-01 to T8b-13 was re-read against the tree. They hold, with the
corrections below. New findings start at T8b-14.

**Errata for T8b-01 to T8b-13**
- **T8b-01, lines:** the `[open]` effect is `back-closes.ts:215-223`, not 214-222. The five refusal sites verify:
  `confirm-dialog.tsx:71-75` (bound at `:98`), `edit-photo-dialog.tsx:142`, `contribute-room.tsx:225-237` (the
  refusal itself is `:230-233`), `avatar-crop-dialog.tsx:269-273`, `moderation-dialog.tsx:59-66`.
- **T8b-01, fix direction, correction:** only ONE of the five refusals re-renders anything (`contribute-room`'s
  `setLeaving(true)`). The other four refuse by returning while their busy flag is ALREADY set (`if (busy) return`,
  `!saving && …`, `!confirming && …`, `if (submitting) return`). The wrapper's own `setUncontrolledOpen(false)`
  (`dialog.tsx:26`) is a same-value bail-out for a controlled dialog (it starts `false` and stays `false`), so
  nothing re-renders the `Dialog` component. The "effect with no deps re-arms on the refusal's render" half of
  the fix therefore covers one site in five. The deferred check in `onPop` is the mechanism that covers all
  five, not the fallback: keep the layer in the stack with `pushed = false`, give it a ref to its latest `open`,
  and one macrotask after `l.close()` (by then React has committed an accepted close, whose cleanup has already
  released the layer) re-push its entry if the layer is still in the stack and still open.
- **T8b-01, the complete sweep the lead asked for** (every `onOpenChange` in 41 non-lab files plus the three
  direct `useBackCloses` callers, `alumni-map.tsx:287`, `image-viewer.tsx:402`, `edition/reader.tsx:445`):
  - Refuse a close. These are the five above, all on `ui/dialog`. `ConfirmDialog` alone has 12 mounts in 8 files
    (post-card, comments-section, letter-menu, drafts-strip, collection-client, contribute-room, admin
    person-detail, admin-profile-tools). `ModerationDialog` is mounted from content-list, report-list,
    post-card, comments-section and letter-menu; `AvatarCropDialog` from letterhead-profile and photo-step;
    `EditPhotoDialog` from collection-client.
  - Refuse, but not a back-closes layer: `verified-mark.tsx:70-73` refuses only `reason === "trigger-press"`
    and is a `Popover`. `ui/popover`, `select`, `dropdown-menu` and `combobox` never call `useBackCloses`, so
    Back does not reach them at all.
  - Always accept. Everything else: edit-post-dialog `:74`, report-dialog `:95`, settings-surface `:985`
    (closes even while `busy`), people-door `:325/332`, catchup-home `:304/308`, collecting `:204`,
    picture-picker-dialog `:186` (unmounted anywhere, T3-01), photo-aim `:237`, attach-image-dialog `:221`,
    get-in-touch `:336`, flag-person-dialog `:63`, member-verify/verify-email dialogs, create-post-form
    `:1212`, letterhead-profile's delete-account dialog `:1485`, guide-overlay `:53`, the mobile menu sheet
    (`sidebar.tsx:697`), alumni-map's drill sheet `:782`, filter-sheet's callers, house-chain-editor `:304`, and
    the three direct callers (each closes by `setX(false)`/`setViewer(null)`).
  - No discard-guard dialog exists outside `contribute-room` (grep for "Discard"), and nothing uses Base UI's
    `details.cancel()`. So the lead's "the letters desk, the composer" are not on this list: the desk is a page,
    and the composer's only dialog (`askShortLetter`) always accepts.
- **T8b-04, one misclassified caller:** `messages/conversation.tsx:88` is listed as server-only (safe). It is
  also rendered inside the client `components/admin/messages/thread-view.tsx` (`"use client"`, imports
  `Conversation`), so in the admin queue it is an eighth client-rendered site (admin-only). The other five
  server-only callers are server-only (both thread lists are imported only by server pages).
- **T8b-05, reach narrower than written:** `InfoTooltip` has exactly one consumer, `float-field.tsx:283-285`
  (lazy-loaded), and exactly one field passes it a `hint`: the Collection's description
  (`collection/photo-questions.tsx:159-171`), in both the contribute room and the edit dialog. The "signup
  batch year" and "settings' batch-year note" named in the header (`info-tooltip.tsx:19-21`) are stale
  comment claims, not callers. The mechanism stands, but the severity is revised to **Low**.
- **T8b-02, 03, 06 to 13:** verified as written: proxy `:177-187, 237-238, 296-326, 392`; (main) layout
  `:26-38, 40-58, 83-103, 116-131`; `notification-count.ts:14-18`; `email-queue.ts:963-1023`;
  `catchups.ts:526-533`; `prisma.ts:45-51`; privacy page lines; root layout `:63-68, 80, 90-107`;
  `not-found.tsx:23-25, 35, 45-47`; `app-shell.tsx:85-90`; landing, showcase, footer, robots, sitemap and
  guide lines; `auth.ts:285`; `next-path.ts:21`.

### T8b-14 — Every server error sends the member's live session cookie, and their city, coordinates and postcode, to Sentry: `sendDefaultPii: false` no longer strips them in the installed SDK
- Severity: Medium. A bearer credential valid for up to 90 days, plus near-exact location, is copied to a
  third-party processor on every server error. The code comment and the privacy page both say this does not
  happen. It is the same class as audit 2's C-198 (the same token going to PostHog), which was fixed in the proxy.
- Confidence: certain for what leaves the server. I reproduced it offline through `@sentry/nextjs` 10.70's own
  `init` and `captureRequestError`, with a `beforeSend` that printed the event and sent nothing. Possible for
  what Sentry STORES: Sentry's server-side Data Scrubber (on by default for new projects) may redact cookie
  values under sensitive key names before storage. That is a dashboard setting on the owner's account, and I
  could not check it.
- Where: `src/instrumentation.ts:50-53` (the comment "OFF. The default would attach IP addresses, cookies and
  request headers to every event", then `sendDefaultPii: false`) and `:86` (`onRequestError =
  Sentry.captureRequestError`); `node_modules/@sentry/nextjs/build/cjs/common/captureRequestError.js:8-13`
  (`normalizedRequest: { headers: core.headersToDict(request.headers), method }`);
  `node_modules/@sentry/core/build/cjs/utils/data-collection/defaultPiiToCollectionOptions.js` (`false` maps to
  `cookies: { deny: [...] }` and `httpHeaders: { request: { deny: [...] } }`, which are objects, not `false`);
  `node_modules/@sentry/core/build/cjs/integrations/requestdata.js:25-35` (`cookies: dataCollection.cookies !==
  false`, so it is true; `headers: dataCollection.httpHeaders.request !== false`, also true) and `:111-135`
  (`extractNormalizedRequestData` keeps `headers.cookie` when cookies are "included", deletes only the
  IP-bearing header names, and parses the cookie header into `request.cookies`). The deny-list filtering
  exists only in `utils/request.js:150` (`httpHeadersToSpanAttributes`), which serves SPAN attributes and is
  never applied to an error event. Also `src/lib/report-error.ts:37` (`reportSwallowed` →
  `Sentry.captureException`): whether those events carry the request depends on the isolation scope's
  `normalizedRequest`, which I did not reproduce.
- Taxonomy: 6e (the session token copied out of the app) · L9 (a comment describing an SDK behaviour that has
  gone) · privacy
- Expected: `instrumentation.ts:50-53`: with PII off, no cookies, IP addresses or request headers go with an
  event. The privacy page's processor table (`privacy/page.tsx:134`) lists Sentry for "Error reporting, so
  breakages get noticed and fixed" and nothing more.
- Actual: every server-side error during a signed-in request sends `request.cookies` =
  `{ "__Secure-authjs.session-token": "<the member's live JWE>", "rv-visit": …, "rv-theme": … }`, plus the same
  string again as `request.headers.cookie`. That covers a 5 s pool timeout in any render (T8b-02/O-03 produce
  them in bursts), a Prisma error, and an action that throws. The event also carries `x-vercel-ip-city`,
  `x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-postal-code`, `x-vercel-ip-country(-region)`,
  `referer` (whose query string can hold a directory search) and `user-agent`. Only
  `x-forwarded-for`/`x-real-ip` and the other IP-named headers are removed. The token is the bearer
  credential: whoever holds it IS that member until the 90-day absolute expiry or a `credentialVersion` bump.
- Why: Sentry 10.x replaced the boolean with "data collection" options. `sendDefaultPii: false` now resolves to
  deny-list objects, and `requestDataIntegration` treats any non-`false` value as "include". Its deny list
  (`SENSITIVE_KEY_SNIPPETS`: "auth", "token", "session", …) would have caught the token, but it only runs for
  spans.
- Proof (read-only and offline; nothing leaves the machine because `beforeSend` returns null):
  `node -e 'const S=require("@sentry/nextjs");S.init({dsn:"https://abc@o1.ingest.de.sentry.io/1",enabled:true,sendDefaultPii:false,beforeSend(e){console.log(JSON.stringify(e.request,null,1));return null}});S.captureRequestError(new Error("x"),{path:"/feed",method:"GET",headers:{cookie:"__Secure-authjs.session-token=SECRET; rv-visit=v",["x-vercel-ip-city"]:"Mumbai",["x-vercel-ip-latitude"]:"19.07"}},{routerKind:"App Router",routePath:"/feed",routeType:"render"});setTimeout(()=>process.exit(0),1500)'`
  run from the repo root. It prints `cookies: { "__Secure-authjs.session-token": "SECRET", … }` and the
  geo headers. Run 2026-09-24 with the exact `common` options from `instrumentation.ts`.
- Fix direction: add a `beforeSend` (and `beforeSendTransaction`) to `common` in `instrumentation.ts` that
  deletes `event.request.cookies`, `event.request.headers.cookie`, every `x-vercel-ip-*` header and the
  `referer`, or keeps an allowlist (`user-agent`, `content-type`, `next-action`). It covers both runtimes,
  since `register()` feeds the same object to both. Do not reach for the new `dataCollection` option on its
  own: supplying it at all flips the base to the PERMISSIVE defaults (`resolveDataCollectionOptions.js:18`:
  `options.dataCollection != null ? DEFAULTS : …`), so every key would have to be spelled out. Rewrite the
  comment at `:50-53`. **Owner:** check Sentry → Project Settings → Security & Privacy that "Data Scrubber" and
  "Use Default Scrubbers" are on, and search existing issues for `authjs`. If any token was stored, rotating
  `AUTH_SECRET` ends every session (everyone signs in again). That is his call.
- Gate: export the scrubber from `instrumentation.ts` (or a small `sentry-scrub.ts`) and add a `node --test`
  that builds an event through `@sentry/nextjs` with a cookie header and `x-vercel-ip-*` headers, the way the
  probe above does, and asserts none survive. It runs offline in about a second.
- Known-related: C-198 (the same token to PostHog, fixed in `proxy.ts:128-132`). C-166 (`instrumentation.ts:58`)
  was the traces sample rate, a different question.

### T8b-15 — "Try again" on every error screen shows the same failure again: all three boundaries call `reset`, which never goes back to the server, so a database hiccup can only be escaped by reloading
- Severity: Medium. Every server-side failure a member can meet (the layout's pool timeouts in T8b-02, a page
  query throwing) lands on a screen whose one primary button does nothing. On the root boundary it is the only
  control on the screen.
- Confidence: certain (from the installed `next@16.3.3` source and its own docs). What would change my mind: a
  server error whose errored RSC chunk is not what `reset` re-renders. There is none in the App Router: the
  segment's payload holds the error, and re-rendering it re-throws.
- Where: `src/app/error.tsx:5-6, 24-30`, `src/app/(main)/error.tsx:28-29, 44-46` and
  `src/app/(auth)/error.tsx:19-20, 34-36` (each destructures `reset` and binds it to "Try again");
  `node_modules/next/dist/client/components/error-boundary.js:39-47` (`this.reset = () => this.setState({
  error: null })`; `this.retry = () => startTransition(() => { this.context?.refresh(); this.reset(); })`) and
  `:108-115` (both are handed to the error component); `node_modules/next/dist/client/components/
  error-boundary.d.ts` (`ErrorInfo = { error; reset; retry }`, a typed and stable prop);
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:117-121, 155-157` ("In most
  cases, you should use `retry()` instead. … if you have a specific reason to clear the error state and
  re-render the error boundary's children without re-fetching the contents, you can use `reset()`").
- Taxonomy: 6k (DB slow mid-request: is there anything actionable? no) · 6b (error boundary wiring) · L4 (a
  control that silently does nothing)
- Expected: `(auth)/error.tsx:12-13` names this very failure as the reason the boundary exists: "a generic
  apology with a 'Try again' that re-runs the same render". Every "Try again" in the app promises a retry.
- Actual: the press clears the boundary's state, and React re-renders the segment from the SAME cached
  payload. The same error re-throws in the same frame and the same screen comes back, so the button looks dead
  and no request is made. The root boundary is what T8b-02's layout failures reach, along with every
  (policies), landing, `/hoopoe` and `/catchups/join` failure. It has no other control (no shell, no link), so
  the member must know to reload. The orchestrator's live observation today fits this: a 5 s pool timeout
  during onboarding, then the root boundary, then "Try again", then the same screen.
- Why: `reset` was the only prop before Next 16. The 16.x boundary passes `retry` beside it, and the three
  files predate that.
- Proof: argue-only against production. Read-only on the dev server: on any page that has reached a boundary,
  open DevTools' Network panel and press "Try again": no RSC request is sent and the fallback re-renders.
  Code: `error-boundary.js:39-47`.
- Fix direction: bind `retry` instead of `reset` in all three files (and in T8b-07's future
  `global-error.tsx`). Give the root boundary a way out as well ("Go to the feed", or a plain reload), since it
  sits outside the shell. Once T8b-02(b) makes the layout degrade instead of throw, far fewer members reach the
  root boundary at all.
- Gate: a grep test beside `loading-boundary-rule.test.mjs`: every `src/app/**/error.tsx` (and
  `global-error.tsx`) must bind `retry` to its primary button and must not reference `reset`.
- Known-related: audit M05 (it added the (main) and (auth) boundaries, and this is their button), T8b-02, T8b-07.

**Two more errata, found while reading on**
- **T8b-01, what the escaping Back costs in the contribute room:** `useLeaveGuard` (`common/use-leave-guard.ts:18-28`) listens
  only for `beforeunload`. The second Back that leaves the page is a same-document popstate handled by the App
  Router, not an unload, so the guard never fires. The photographs still climbing are dropped with no prompt,
  the one outcome that hook exists to prevent.
- **T8b-07, the motion-chunk half is wrong about the consequence:** a failed `motion-features-max` chunk does NOT
  unmount the tree. `LazyMotion` calls `features().then(...)` with no `catch`
  (`node_modules/framer-motion/dist/es/components/LazyMotion/index.mjs`, the `useEffect` after the synchronous
  branch). The rejection is unhandled, the features never load, and every `m.*` element whose `initial` hides it
  stays hidden. That covers `FadeRise` (`common/motion.tsx:118-141`, `initial={{ opacity: 0, y }}`) around the
  directory, the profile page and the Catch-up completion cards, and 73 other `initial={{ opacity: 0 …` sites. The
  page renders with those regions blank, no error is shown and nothing is reported. The root-layout-throw half of
  T8b-07 stands as written. If the fix session touches `MotionFeatures`: `features={() => loadDomMax().catch(() =>
  loadDomMax())}` (one retry) plus a `reportSwallowed`-style beacon once T8b-07's client reporter exists.

### T8b-16 — "Go to the Feed" (and the other five chapter doorways) does nothing when the guide was opened from that page's own title, which is how the guide is opened
- Severity: Low. It is a dead control on six surfaces, the one button every chapter ends on, and nothing is lost:
  the X and Back still close the sheet.
- Confidence: likely. It is read from the three files, and every `GuideDoor` mount passes its own page's area. What
  would change my mind is a live press on /feed's title and then "Go to the Feed" that closes the sheet. Nothing
  in the code path would.
- Where: `src/components/guide/guide-kit.tsx:72-83` (`Doorway`: a plain `<Link href={href}>`);
  `src/components/guide/chapters/{feed,directory,collection,letters,catchups,birds}.tsx` (`<Doorway
  href="/feed">` … `href="/birds"`); `src/components/guide/guide-layer.tsx:48-52` (the sheet closes only when
  `usePathname()` changes); `src/components/layout/page-header.tsx:135` (the title is the door); the six mounts,
  `feed/page.tsx:81` (`guide="feed"`), `directory-client.tsx:555`, `collection-client.tsx:1445`,
  `letters/(index)/page.tsx:120`, `catchups/(index)/page.tsx:263/282`, `birds/page.tsx:30`, each opening its OWN
  chapter.
- Taxonomy: 6b (a close condition keyed on the wrong signal) · L7
- Expected: `guide-kit.tsx:65-66`: "The way back into the product. A chapter that only stops is a dead end." The
  button should put the member on the page, sheet gone.
- Actual: pressing the title on /feed opens the Feed chapter over /feed. Its last line is "Go to the Feed", a Link
  to /feed, the address already on screen. The App Router navigates to the same URL (a fresh RSC fetch for the page
  and the (main) layout, since dynamic data is never fresh), the pathname does not change, `GuideLayer`'s effect
  does not fire, and the sheet stays exactly where it was. The page behind it may scroll to the top, unseen. It is
  the same on all six surfaces. Only the standalone `/guide/<area>` page (a mailed link, the index) makes the
  button mean anything.
- Why: the sheet's lifetime is tied to `pathname` (`guide-layer.tsx:48-52`), and the one link inside it that
  matters most points at the pathname it was opened on.
- Proof: read-only in a browser with any account: press "Feed" (the title) on /feed, scroll the sheet to the
  end, press "Go to the Feed". The sheet stays and the Network panel shows an RSC request for /feed.
- Fix direction: have `Doorway` close the guide when it is rendered inside the overlay: call `closeGuide()` (or
  the sheet's own `onOpenChange(false)`) on click when `href` equals the current pathname, and let the Link
  navigate otherwise. Or hide the doorway inside the overlay and keep it on the standalone page. One small
  context flag set by `GuideOverlay` is enough.
- Gate: an e2e step in the existing guide spec (if any) or a new one: open the Feed chapter from the title,
  press the doorway, assert the sheet's geometry leaves (`expect.poll`, per CLAUDE.md gotcha 7).
- Known-related: bugs.md "guide contents page unreachable" and T8b-13 (the other half of the guide's doors).

### T8b-17 — Editing a published letter opens a 384px-wide dialog taller than the screen: for the median letter the Save button sits about a thousand pixels below the fold, and nothing can scroll to it
- Severity: Medium. A member cannot save an edit to any published letter of typical length (and to a long post),
  and the only way out is to close and lose the edit. The live median published letter is 4,278 characters and
  the longest 7,494; posts reach 1,465 (SELECT on `Post`, 2026-09-24).
- Confidence: likely (from the CSS, with the live lengths; the pixel figures are estimates from the box width and
  line height). What would change my mind: a CSS rule elsewhere capping `[data-slot=dialog-content]`. There is
  none (`grep` of `globals.css` and every consumer).
- Where: `src/components/ui/dialog.tsx:101-127` (`DialogContent`'s popup, className at `:109`: `fixed top-1/2 left-1/2 …
  -translate-y-1/2 … sm:max-w-sm`, with no `max-h-*` and no `overflow-y-*`); `src/components/posts/
  edit-post-dialog.tsx:74-119` (no className on `DialogContent`, and a `RichTextArea` with `minHeight` 240/120
  and no maximum, `:97-104`); callers `letters/letter-menu.tsx:211-223` (`kind="letter"`, the published letter's
  "Edit") and `posts/post-card.tsx:742`. The five consumers that learned this by hand and patched it locally:
  `edit-photo-dialog.tsx:157` (`max-h-[90vh] overflow-y-auto`, commented "the tiles … can outgrow a short laptop
  window"), `contribute-room.tsx:240`, `people-door.tsx:344`, `catchup-home.tsx:319`, `collecting.tsx:210`.
  `ui/sheet.tsx:287` has its own `max-h-[85svh]`.
- Taxonomy: 6h (limit-sized input: a 20,000-character letter is legal, `post-caps.ts:20`) · 6b (a shared
  primitive with no bound) · L7
- Expected: every dialog fits the viewport and scrolls inside itself. The owner's own rule for this dialog
  (`edit-post-dialog.tsx:17-20`) is "the dialog register is for things that take seconds, never for writing".
- Actual: the popup is centred with `translate(-50%, -50%)` and grows with its content. At `sm` and up it is 384px
  wide, so the text box is about 322px wide, roughly 43 characters a line at 16px/1.7. The median letter is then
  about 100 lines, around 2,700px of text. On a 1440×900 laptop the dialog's top, with the title field, sits about
  1,000px above the viewport and its bottom, with Cancel and Save, about 1,000px below. Base UI's modal scroll
  lock holds the page still, and a fixed box has no scroll container, so neither the wheel, the keyboard's caret
  follow nor a touch can bring Save into view. A phone is the same at 358px wide. Even the longest live POST
  (1,465 characters, about 35 lines) overflows a 900px-tall window by a little.
- Why: `DialogContent` has no height bound and the one caller carrying the longest text adds none.
- Proof: read-only in a browser, as the author of any published letter over about 1,500 characters (the
  throwaway account can write one; that is the orchestrator's call, since it is a write). Open the letter, then
  "…" → Edit, then run `document.querySelector('[data-slot=dialog-content]').getBoundingClientRect()` in the
  console: `top < 0` and `bottom > innerHeight`. Or `npm run screenshot:auth` of that state at 1440×900.
- Fix direction: (1) in the primitive, give the popup `max-h-[calc(100dvh-2rem)] overflow-y-auto
  overscroll-contain` so no dialog can outgrow the screen again. The five local patches then become optional
  tighter caps. (2) For letters, the owner's own register rule suggests "Edit" on a published letter should open
  the whole-page desk (`/letters/[id]/edit`, which already exists for drafts) rather than a 384px dialog. That is
  his call. Until then, at least `sm:max-w-2xl` on the letter's `DialogContent`, and a bounded, scrolling
  `RichTextArea` (`max-h-[55dvh] overflow-y-auto`) so the title and the buttons stay put.
- Gate: a `focus-recipe.test.mjs`-style grep that `ui/dialog.tsx`'s Popup className carries a `max-h-` and an
  `overflow-y-auto`; a visual-suite state for the edit dialog over a long fixture letter (a lab room already
  renders letters).
- Known-related: none in the baseline. T1 read `edit-post-dialog.tsx` for its data path (T1.md:361) and did not
  look at its geometry.

### T8b-18 — The public demo reports into production's Sentry project, labelled "production", and nothing on the demo side can change that; the demo that 500s on every data route shares the 5,000-events-a-month alarm the real site depends on
- Severity: Low. Nothing member-facing, but it can quietly deafen the one alarm the site has. The demo is known
  to be broken and deferred. The finding is that its brokenness is wired into production's alarm, which the
  bugs.md entry does not say.
- Confidence: certain for the wiring (read); possible for any quota actually spent (the Sentry dashboard is the
  owner's; the bugs.md entry says the demo is serving an old build, which may or may not predate Sentry, added
  2026-08-19).
- Where: `src/instrumentation.ts:31-33` (the DSN is inline, overridable only by `SENTRY_DSN`), `:39-40`
  (`ENABLED = Boolean(process.env.VERCEL)`, true on BOTH Vercel projects), `:48` (`environment:
  process.env.VERCEL_ENV ?? …`, which is "production" on the demo's production deployment as well);
  `node_modules/@sentry/nextjs/build/cjs/server/index.js` (`environment: options.environment ||
  process.env.SENTRY_ENVIRONMENT || …`: because `common` always sets `environment`, a `SENTRY_ENVIRONMENT=demo`
  on the demo project would be IGNORED); nothing tags `IS_DEMO`. On the demo, `src/lib/demo.ts:183-205`
  (`DemoWriteError`, whose comment says "the real cause goes to Sentry") and every `reportSwallowed`
  (`report-error.ts:25-46`), for example `advanceDueCatchups` on each page view (`catchups.ts:532`), report
  under the same label. `docs/planning/bugs.md:535-546` records that the demo 500s on `/feed`, `/collection`,
  `/directory`, `/letters` and `/catchups`.
- Taxonomy: 6j third-party quotas (Sentry during an error storm) · 6k (Sentry quota exhausted) · L4 (an alarm
  that can be silenced by something else)
- Expected: `instrumentation.ts:46-47`: "preview deploys and production report separately, so a broken branch
  never looks like a live incident". The same should hold for a second deployment of the same code.
- Actual: every error the demo throws is filed as a production incident in the owner's only project. The two
  deployments' identical stacks group into the same issues, and the demo's standing 500s draw on the free plan's
  5,000 events a month (`report-error.ts:34`). Once that is spent, Sentry answers 429 and the SDK drops events,
  so the real site's next failure goes unreported for the rest of the month. T8b-02's pool timeouts would do the
  same thing from production's own side in one bad hour. No per-issue or per-environment cap is set in code, and
  whether Spike Protection is on is a dashboard fact.
- Why: the demo was built as "this same repository with DEMO_MODE=1", and the Sentry config keys everything off
  Vercel's own variables, which are identical in shape on both projects.
- Proof: read-only: `grep -n "environment\|ENABLED\|DSN" src/instrumentation.ts`. The owner can confirm in Sentry
  by filtering issues on `request.headers.host:demo.rishivalley.space` (the host header survives, T8b-14), and
  by checking Stats for how much of the month's error quota is left.
- Fix direction: in `common`, `environment: process.env.DEMO_MODE === "1" ? "demo" : (process.env.VERCEL_ENV ??
  process.env.NODE_ENV)`, plus `initialScope: { tags: { deployment: IS_DEMO ? "demo" : "main" } }`. Or disable
  Sentry on the demo outright (`ENABLED = Boolean(VERCEL) && DEMO_MODE !== "1"`) while the owner's "let it fail"
  stands, which also stops the quota draw. Owner: turn on Spike Protection and consider an inbound filter or rate
  limit per project key in the Sentry dashboard. That is the only cap on T8b-02's storm.
- Gate: a unit assertion on the exported config (once `common` is exported for T8b-14's test) that
  `DEMO_MODE=1` yields a non-production environment.
- Known-related: bugs.md "the public demo returns 500 on every data route" (deferred by the owner: this finding
  is about its reach into production's alarm, not the 500s); T8b-14 (same file); C-166 (sample rate).

### T8b-19 — The landing page, the site's front door, ships every visible element at opacity 0: until JavaScript has downloaded, hydrated, fetched the motion chunk and decoded the photo, a stranger sees an empty beige page, and with any of those failing, sees it for good
- Severity: Low. It is the owner's deliberate "hold on beige until the photo decodes" design. The finding is its
  failure mode: the escape hatches (the 220 ms loader, the 6 s safety net) are themselves JavaScript, so they
  cannot help when JavaScript is what is slow or missing.
- Confidence: certain for the HTML (a cookieless `curl` of `/` on the dev server: the photo layer, the washes, the
  brand, the headline and both CTAs all carry `style="…opacity:0…"`, and there is no `<noscript>` anywhere in
  `src`). The time to first visible pixel on a slow Indian 3G phone is argued, not measured.
- Where: `src/components/landing/landing-hero.tsx:244-250` (`<m.section … initial="loading"`, the variants at `:60-122` and
  `:152-161`), `:188-211` (the loader timer and the 6 s `setTimeout(reveal, 6000)`, both inside a
  `useEffect`, so both wait for hydration), `:289-301` (the `Image` whose `onLoad` reveals);
  `src/components/common/motion-features.tsx:37-40` (`LazyMotion` with an async feature chunk; a failed
  chunk never animates anything, see the T8b-07 erratum above); `src/app/page.tsx:31-38`.
- Taxonomy: 6k (a dependency failing at load) · L10 (the stranger's first impression) · 6b
- Expected: `landing-hero.tsx:26-35`: the hold is on the photo's decode, with a hopping hoopoe if it is slow and
  "never strand the page on beige if the photo stalls or errors" (`:199`).
- Actual: before hydration nothing moves. The hoopoe loader and the 6 s net start only once React has hydrated,
  and the reveal then waits for the motion feature chunk before any `opacity: 1` can be animated. A stranger on a
  slow connection who followed a link to `/` watches a blank warm page with no mark, no words and no loader for as
  long as the JavaScript takes. If the JavaScript or the motion chunk fails (a flaky mobile connection, a
  content blocker, JavaScript switched off), that page stays blank. The two CTAs are live links underneath, but
  invisible.
- Why: the hold is implemented as SSR'd `initial` styles plus JavaScript-driven variants, with no CSS-level
  fallback.
- Proof: `curl -s http://localhost:3000/ | grep -o 'opacity:0' | wc -l` against the dev server (read-only,
  cookieless). In a browser: DevTools, disable JavaScript, load `/` and see a blank page; or throttle to "Slow 4G"
  with the cache disabled and watch the first seconds.
- Fix direction: a CSS-only floor under the JavaScript hold, so the design is unchanged when things are healthy.
  For example a `@keyframes` reveal on the hero's hidden layers that forces `opacity: 1` after about 3 s unless a
  `data-hero-armed` attribute set on hydration cancels it, plus a `<noscript><style>` that shows everything. The
  headline and CTAs could also be excluded from the hold (only the photo needs to wait for its decode).
- Gate: a test that the landing HTML's h1 and both CTA links are visible without JavaScript
  (`page.setJavaScriptEnabled(false)` in Playwright, or a grep that the landing HTML carries a `noscript`
  reveal).
- Known-related: T8b-07 (the motion-chunk erratum is the same mechanism app-wide); bugs.md #9 (landing hoopoe
  flight), which is different.

### T8b-20 — A second finger, or a parent re-render, during a bottom sheet's swipe leaves the sheet stuck partway down the screen with its transition switched off
- Severity: Low. Nothing is lost, and the next drag or the X recovers it. But it is the app's one bottom sheet
  (filters, the guide, a profile's house picker, a Catch-up's Settings and People), and a panel frozen half off
  the bottom edge with its buttons cut off reads as broken.
- Confidence: certain for the second-finger path (read from the handlers); likely for the re-render path (it
  needs a caller whose `onOpenChange` identity changes mid-gesture: `people-door.tsx:325` and
  `house-chain-editor.tsx:304` pass inline arrows).
- Where: `src/components/ui/sheet.tsx:164-239` (`useSwipeDownToClose`). The `start` handler at `:191-197`
  resets `dragging = false` and `armed = e.touches.length === 1` on EVERY `touchstart`, including a second finger
  landing mid-drag, without restoring `el.style.transform` or `el.style.transition`. `end` at `:219-226` returns
  early when `!dragging`, so the reset never happens. The effect's deps at `:238` (`[ref, mounted, onClose]`) and
  `BottomSheet`'s `close = useCallback(() => onOpenChange(false), [onOpenChange])` at `:268` mean an unstable
  `onOpenChange` re-runs the effect mid-gesture: listeners are rebuilt with fresh `dragging = false` state and the
  transform is left in place.
- Taxonomy: 6b (effect keyed on an unstable callback; listener state that outlives its reset) · L7
- Expected: `sheet.tsx:150-164`: the sheet follows the finger, then either closes or settles back.
- Actual: drag the sheet down 100 px, put a second finger on it (or have the roster finish loading behind People
  mid-drag), lift. The sheet stays 100 px down with `transition: none`, its footer or last rows below the
  screen edge, until another single-finger drag or the X.
- Why: gesture state lives in closure variables that `start` and an effect re-run both reset, while the DOM
  side effects of the old gesture (transform, transition) are never unwound.
- Proof: on a phone, or chrome-devtools with touch emulation and two touch points (the MCP cannot easily
  multi-touch, so a real phone is the proof): open the directory's filter sheet, drag down, add a finger, lift.
- Fix direction: in `start`, if a drag is in progress (`dragging`), treat the new touch as a cancel: restore
  `transition = SETTLE` and `transform = ""` before resetting. Unwind the same way in the effect's cleanup.
  Hold `onClose` in a ref (the `latest.current` pattern `back-closes.ts:210-213` already uses) so the effect
  depends only on `[ref, mounted]`.
- Gate: none practical in unit tests (touch events on a real element). A Playwright mobile spec with
  `page.touchscreen`, after the behaviour is reproduced in the MCP (CLAUDE.md gotcha 7).
- Known-related: none.

### T8b-21 — The batch-range filter lets "From" exceed "To" and then answers with nobody: "Batch: 2020 to 2010", 0 people, and no hint that the range is backwards
- Severity: Low (a self-inflicted, recoverable dead end on the directory and the admin lists).
- Confidence: certain (read both halves).
- Where: `src/components/common/filters/range-facet-pill.tsx:86-112` (two independent `<select>`s, each offering
  every year, with no constraint between them); `:47-53` (the label prints the inverted pair as given);
  `src/app/(main)/directory/where.ts:99-100` (`batchYear.gte = yearFrom; batchYear.lte = yearTo`, an empty
  intersection when `from > to`).
- Taxonomy: 6h (invalid input: a range whose ends are swapped) · L6
- Expected: a range picker either cannot express an empty range or reads it the way the member meant it.
- Actual: picking From 2020 and then To 2010 (easy on a phone, where the two native wheels are side by side)
  shows "Batch: 2020 to 2010" and an empty directory. The member has to work out that the order was the problem.
- Fix direction: normalise at one of the two ends. The pill can swap on change (`if (from && to && +from > +to)`)
  or narrow the "To" options to years at or after From; the server's `parseDirectoryYears` can swap the pair
  before building the `where`. The server fix also covers a hand-typed URL.
- Gate: a unit test on the where-builder that `{yearFrom: 2020, yearTo: 2010}` produces the same `where` as
  `{2010, 2020}`.
- Known-related: none. T6 owns `where.ts`; the pill is shared kit.

## Verified clean

**The proxy's public allowlist against the route inventory** (`src/proxy.ts:237-326`, `work/charters.md:926-944`)
- All 19 public entries map to real routes: `/`, `/login`, `/signup`, the three policies, the three email-token
  flows, `/api/auth/[...nextauth]`, `/api/razorpay/webhook`, `/api/dev-login` (404 unless dev plus secret),
  `/api/resend/webhook`, `/ingest/*` (rewrites), the three crons, `/catchups/join` (+`[token]`) and `/hoopoe`.
- Every route that must work signed out is on the list, and nothing gated is needed signed out. The signed-out
  surfaces (`(auth)`, the join pages, `/hoopoe`, the landing, the mascot) make no `/api` fetch at all (grep).
  `/api/places/search` and `/api/users-by-batch` are called only from onboarding, the profile and the Catch-up
  people picker, all signed in.
- Prefix side effects are harmless. Every extra segment under a public prefix 404s (`curl /login/x` → 404), the
  public cron paths have nothing beneath them, and `/catchups/join/<token>/x` has no route. The `//` case is T8b-10.
- The matcher's exclusions cover every asset a signed-out installer or crawler fetches: the manifest's four icons
  live under `/images/icons/` (`manifest.ts:29-60`), plus `apple-icon.png`, `icon.svg`, `favicon.ico`,
  `robots.txt` and `sitemap.xml`. There is no `opengraph-image`. `public/geo/` (the atlas) goes through the
  gate, and its only consumer is the signed-in directory map. `public/images/collection/` holds only demo and
  lab fixtures, no member photographs.
- `x-pathname`, `x-search` and `x-visit-id` are overwritten on every gated request (`:336-372`). They are read
  only by the (main) layout (`layout.tsx:200-205`) and by `readPresence` via `/api/presence` (`last-seen.ts:231,
  257`), both gated. A client-supplied value can therefore only reach a public path, where nothing reads it.
- The stale-cookie chain terminates: `/` → `/feed` → `/login?next=/feed`, and `(auth)/login/page.tsx` has no
  `auth()` and no redirect, so there is no loop.
- Trailing slashes: `/login/` 200, `/privacy/` 200, `/feed/` 307 to `/login?next=%2Ffeed%2F`
  (`skipTrailingSlashRedirect` keeps both forms working; the `next` survives).
- `LEGACY_HOST` is an exact-match 308 (`:165-169`); `/ingest` strips the cookie header before the rewrite
  (`:128-132`, C-198 holds); the demo branch returns before the cookie gate (`:134-149`).
- The visit cookie is never slid on an action POST (`:392-401`). It IS slid on RSC prefetches, which only extends
  a sitting by a prefetch and is harmless.

**The CSP against every host the browser talks to** (`next.config.ts:77-182`)
- Images, `img-src`: `images.rishivalley.space`, the legacy `pub-…r2.dev`, and `R2_PUBLIC_BASE_URL`'s host
  (`:37-51`). Audio, `media-src`: the same hosts plus `blob:` for the recorder. The direct PUT, `connect-src`:
  `*.r2.cloudflarestorage.com` (a CSP `*.` wildcard matches any depth, so path-style and virtual-host URLs both
  pass). The viewer's Download goes through same-origin `/api/photo/download` (`image-viewer.tsx:242-244, 687`).
  The contact-card photo goes through the same-origin optimizer via `photoSrc`.
- Turnstile (script, frame and connect), Razorpay (script, frame, connect and `*.razorpay.com` images), and
  PostHog (same-origin `/ingest`, including its `/static/` extensions) are all covered. Spotify art
  (`i.scdn.co`, `*.spotifycdn.com`) and YouTube stills (`i.ytimg.com`, the only still host
  `link-preview-core.ts:193` builds) are covered. Link-preview thumbnails are re-hosted into our bucket
  (`link-preview.ts:270-333`), so an arbitrary site's `og:image` never reaches `img-src`.
- Live data agrees (SELECT, 2026-09-24): every stored image URL is on `images.rishivalley.space`
  (`LinkPreview.thumbUrl` 7, `User.photoUrl` 13) or relative (`CatchupSeries.pictureSrc` 8), and no
  `CatchupEntry.songArt` exists yet.
- There are no iframes, map tiles, third-party fonts or CDN scripts anywhere in `src` (grep). The three
  third-party `fetch`es in `src/lib` (the NYT Wordle, Razorpay orders, Turnstile siteverify) are server-side
  (`wordle.ts:8`, `razorpay.ts:74`, `turnstile.ts:159`). Every client `fetch` is same-origin, or the presigned PUT.
- `worker-src 'self' blob:`, `font-src 'self' data:` (next/font self-hosts), `frame-ancestors 'none'` with
  `X-Frame-Options: DENY`, and HSTS and `upgrade-insecure-requests` gated to production (TRAPS). Two notes are
  under Leads (no `report-to`; `interest-cohort`).

**The error-boundary map: what catches what, what it shows, whether anyone hears**
- `src/app/error.tsx` (root): catches a throw in `(main)/layout.tsx` itself (T8b-02), in `(policies)/layout.tsx`
  and the three documents, in the landing page, `/hoopoe` and both `/catchups/join` pages. It shows a full-screen
  "Something went wrong" with one button (T8b-15) and no link out. Reporting: a server throw reaches Sentry via
  `onRequestError`; a client throw reaches nobody (T8b-07).
- `src/app/(main)/error.tsx`: catches every (main) page and the nested `admin/layout.tsx` and `catchups/layout.tsx`.
  The shell stays; it offers "Try again" (T8b-15) and "Go to the feed". Reporting is the same as above.
- `src/app/(auth)/error.tsx`: catches the five auth pages (there is no `(auth)` layout). It offers "Try again"
  (T8b-15) and "Back to sign in".
- No `global-error.tsx` (T8b-07). The root `not-found.tsx` serves every `notFound()` (T8b-08; the signed-out
  half is bugs.md #5b). `(main)/forbidden.tsx` catches the only `forbidden()` caller, `requireAdminPage`, which
  is render-only (the admin layout and 14 admin pages; no action calls it). There is no `unauthorized()` anywhere,
  so authInterrupts' 401 boundary is not needed.
- Reporting filters: Next drops navigation and abort errors before `onRequestError`
  (`create-error-handler.js:50-52, 67, 187`), so the stale `"NEXT_NOT_FOUND"` in `instrumentation.ts:67-68`
  (Next 16 throws `NEXT_HTTP_ERROR_FALLBACK;404`) is harmless; nothing it was meant to catch arrives.

**The leads routed to T8b, answered**
- *Action POST without a session gets a page redirect*: confirmed and traced, T8b-03.
- *`serverActions.bodySizeLimit` 25 MB vs Vercel's 4.5 MB*: clean. It only lifts Next's own guard. Every
  function-bound byte path goes through `shrinkForUpload`, whose budget is `UPLOAD_BODY_LIMIT = 4 MB`
  (`image-downscale.ts:84-135`). That includes the Collection's proxied fallback (`contribute-room.tsx:744-759`).
  `upload-size-rule.test.mjs` is the tripwire for a new path. The presigned PUT never touches a function. A body
  over 4.5 MB is reachable only by a hand-made request (the platform's 413 would read as "Check your connection",
  T8b-03's family). No lead to T4a.
- *The privacy page as a contract*: T8b-06 (all four named sentences, plus four more).
- *Every revalidating action re-runs the (main) layout (T1-06)*: T8b-12, with the counts.
- *The Dialog primitive's refused close*: T8b-01, plus the complete refusal sweep and the fix-direction
  correction in the errata above.
- *`cookies()` inside `after()` on `/profile/[id]` (O-02)*: clean, and now explained from the source. When the
  response closes (the crawl aborted at 25 s), `AfterContext` flips `phase = 'after'` on every work-unit store
  that registered an `after()` (`node_modules/next/dist/server/after/after-context.js:35-42`). The (main)
  layout registers two on every render. A page render still running then reads the theme cookie
  (`profile/[id]/page.tsx:403`, after its own awaits). For a render outside an after task,
  `isRequestApiAllowedInCurrentPhase` returns false (`server/request/utils.js:56-80`: "we must be in a page, in
  the `after` phase"), and `cookies()` throws E1381 with exactly the logged text. No `after()` body reads a
  cookie or a header (`last-seen.ts:222-231` splits the read from the write; `drainMailQueue` reads neither).
  Only an aborted request produces it, and by then the client has gone.
- *The (main) layout's four-query `Promise.all`*: T8b-02. The verified details: `unreadNotificationCount` is
  `cache()`d per request (`notification-count.ts:14-18`); the Catch-up `findFirst` is skipped for teachers; the
  mail state is skipped for confirmed members; `advanceDueCatchups` swallows and reports (`catchups.ts:526-533`);
  both `after()`s catch their own errors.
- *The 25 s crawl timeouts on `/`, `/guide`, `/birds`, `/profile`*: not a hang. `/guide`, `/guide/[area]`,
  `/birds`, `/about` and `/hoopoe` await nothing but `params`. `/` signed in is a proxy 307 to `/feed`, so the
  crawl's `/` measured the feed. The only render-blocking awaits are the root layout's cookie read and the (main)
  layout's session read plus three queries, each bounded by `connectionTimeoutMillis` 5 s and `query_timeout`
  20 s. No `fetch` without a timeout sits on these paths. Cold Turbopack compiles, plus at worst T8b-02's pool
  waits.
- *(Orchestrator, from T8a-16) does any surface bypass BirdAvatar's photo-before-bird precedence?* No. Every
  identity avatar goes through `BirdAvatar` (`bird-avatar.tsx:90`: `if (user.photoUrl)`), directly, via
  `IdentityRow`, or via `FlushAvatar` (`flush-avatar.tsx`, which wraps it). The direct `BirdGlyphV2` renders are
  species-by-index, not identity: the `/birds` gallery (`birds/page.tsx:40`), the support picker, the plate and
  the wood (`bird-picker.tsx:115,162`, `bird-plate.tsx:115`, `wood.tsx:237`). The only inline users without
  `birdOverride` are decorative (the Konami flock at `konami-eggs.tsx:121`, a guide illustration at
  `chapters/catchups.tsx:58`); the alumni map passes it (`alumni-map.tsx:844`). **So the precedence rule is
  encoded in exactly three places, and a fix to T8a-16 must change all three:** `BirdAvatar`
  (`bird-avatar.tsx:90`), `contactPhotoSrc` for the saved contact card (`bird-avatar.tsx:46-47`), and the
  profile letterhead's own branch (`letterhead-profile.tsx:362` `hasPhoto`, `:765` `PerchedBird` only when there
  is no photo, `:795-866` the photo). Two captions name the member's bird by the same chain
  (`letterhead-profile.tsx:1639`, `onboarding/steps/photo-step.tsx:42`) and follow whatever the drawing does.
  Nothing guards that a surface's query selects `birdOverride` (there is no test); `IDENTITY_SELECT`
  (`people-select.ts:35-40`) is the convention, in 19 files.

**Other checks that came back clean**
- `api-gate.ts`: the five upload routes use `vetUploadRequest` (origin, session, verified member, meter); the two
  lookup routes use `vetLookupRequest`; the download route uses `vetPhotoDownload`; the three crons use
  `requireCronSecret` (fails closed, constant-time). Every other route carries its own door: `auth()` for export,
  presence and places (places also meters with the shared `search` budget of 120 a minute), HMAC for Razorpay,
  Svix for Resend, the dev secret, NextAuth's handlers. `auth` is `cache(guardedSession)` (`auth.ts:526-528`),
  so every door refuses revoked, blocked and deleted sessions.
- `safeNextPath` (`next-path.ts:16-25`) rejects `//`, backslash and control characters. `%2F%2F` is decoded once
  by `URLSearchParams` and then rejected; `%252F` stays a same-origin path. There is no open redirect.
- `RichTextArea` hydrates through `innerHTML` (`rich-text-area.tsx:58`), but `renderRichText` escapes before any
  markup (`rich-text.ts:109-114, 161-164`). No stored-XSS path runs through the edit dialogs.
- `PostHogIdentify` sends an opaque id plus `accountType`, `batchYear` and `isOwner` only (`posthog-identify.tsx:53`).
- `robots.ts`/`sitemap.ts` list only public pages, the demo disallows everything, and `appUrl` is `APP_URL` or the
  canonical origin in production (`email.ts:48-63`).
- `pg` sits in devDependencies, but `@prisma/adapter-pg` depends on `pg ^8.16.3` itself, and nothing in `src`
  imports `pg`.
- Sidebar: the admin counts come from a module store the admin layout publishes (no fetch,
  `admin-counts.tsx:26-78`); the account rows follow the route during render; the mobile drawer closing on a link
  press leaves its history entry DEAD inside `NAV_WINDOW_MS` rather than rewinding under the navigation.
- Guide: the door is a real `href` (open-in-new-tab works), modified clicks pass through, the touch two-step
  disarms on scroll, a tap elsewhere or 4 s, and the layer closes on a pathname change (T8b-16 is the one gap).
- Hooks: `use-closing-dialog` cancels its rAF on unmount; `use-deferred-autofocus` is desktop-only and cancels
  both rAFs; `focus-modality`, `use-wide-viewport`, `use-coarse-pointer`, `konami-eggs` (skips inputs) and
  `search-pill` all remove their listeners; the viewport hooks default to `false` so hydration agrees.
  `use-user-search` drops stale responses by request id.
- `install-prompt` is caught at module scope (one per evaluation); the tile's Install button unmounts once the
  event is spent, so the `busy` flag a rejected `prompt()` would strand is never seen.
- `ContentColumn` and `AppShell`: the width choice and padding are pure CSS off `usePathname`; there is no
  hydration swap.
- The landing's Catch-up pool pictures (1.6–3.3 MB WebPs in `public/images/catchups/`) are always drawn through
  `next/image` with `sizes`, never raw.

## Leads for other territories
- **T7b** — `posthog-identify.tsx:48-53` and `sidebar.tsx:485`: there is no `posthog.reset()` at sign-out, so
  the device keeps the previous member's `distinct_id`. The landing and login events after sign-out are
  attributed to them. A second member signing in on that browser switches ids without an `$identify`
  (posthog-js only sends one from an anonymous state, `posthog-core.js:2343+`), so their person record never gets
  its `$set` properties. Worse, `opt_out_capturing()` for an excluded account (`posthog-identify.tsx:52`)
  persists in storage, and there is no `opt_in_capturing()` for a non-excluded member, so everyone who later
  signs in on a browser the owner, an admin or the test account used is silently opted out.
- **T7b** — `posthog-client.ts:91`: `autocapture: true` with no `mask_all_text`. `$el_text` of a clicked
  non-input element (a directory card, an identity row, a mention) carries other members' names to PostHog's
  EU cloud, which the privacy page calls "first-party usage analytics" (T8b-06 item 6).
- **T5** — `sidebar.tsx:485` `signOut({ callbackUrl: "/" })` has no catch. A failed CSRF or signout fetch
  (`next-auth/react.js:187-199`) is an unhandled rejection and the button silently does nothing.
- **T6** — `directory/where.ts:99-100` is T8b-21's server half. `common/filters/facet-search-select.tsx:70-72`
  matches options with a plain `toLowerCase().includes`, with no diacritic folding ("Sao Paulo" does not find
  "São Paulo", "Zurich" does not find "Zürich") and no aliases. C-091 fixed the server's city facet, not this
  client-side option filter.
- **T1** — T8b-17 is `edit-post-dialog.tsx`'s geometry. T1's data-path verdict on it (T1.md:361) stands.
- **T8a** — the T8a-16 question is answered in Verified clean: three places encode photo-first.
- **L8 / owner** — `next.config.ts:207` `interest-cohort=()`: an unrecognised Permissions-Policy feature in
  current Chromium, which logs "Error with Permissions-Policy header: Unrecognized feature: 'interest-cohort'" on
  every page (likely; the same class of console noise the rewrites at `:353-362` were added to remove). Drop it.
- **L8 / owner** — the CSP has no `report-to`/`report-uri`, so every future directive miss stays a console line.
  TRAPS records three that were found by chance (the image host move, the R2 PUT, Spotify art). Sentry accepts
  CSP reports on the same project.
- **L5** — T8b-18's quota point: one bad hour of T8b-02's pool timeouts at 2,000 members can spend the month's
  Sentry error budget. Spike Protection is a dashboard setting.
- **L7** — `ui/input.tsx:33` and `ui/textarea.tsx:11` drop to `md:text-sm` (14px) from 768px up. iPadOS
  Safari zooms the page when an input under 16px takes focus (possible: iPad's desktop mode may not).
- **Owner (copy)** — `(main)/about/page.tsx:13-15`: the whole About page reads "indefinitely procrastinated",
  and it has a row in the sidebar (`sidebar.tsx:68`).
- **T3** — T3-01 independently confirmed: `PicturePickerDialog` has zero importers.

## Inputs for the live naughty-strings pass
- The feed's search pill (`search-pill.tsx:150-157` → `/feed?q=`): 100k characters (URL length), `%`, `&`, `#`,
  RTL override, emoji ZWJ, a query that survives a sign-in detour (`proxy.ts:324` carries `pathname + search`
  into `next`, which becomes very long).
- `/login?next=` (`next-path.ts:16-25`): `//evil`, `/\evil`, `%2F%2Fevil`, `%252F%252Fevil`, `/%09/evil`,
  `javascript:`, a 10k-character path, and the Unicode slashes U+2215 and U+FF0F (they stay same-origin paths,
  but check the login page's rendering of them).
- The post and letter quick edit (`edit-post-dialog.tsx` → `editPost`): exactly 5,000 and 20,000 characters and
  one over; HTML and script payloads (escaped by `renderRichText`); a 20k paste into `RichTextArea` (T8b-17's
  geometry); Zalgo stacks in a 322px-wide box.
- The Collection description `FloatArea` (`photo-questions.tsx:159-171`): a long paste grows the textarea
  without a cap inside the contribute room's own scroll.
- The facet option search (`facet-search-select.tsx:70`): accents, combining marks, Turkish dotted İ
  (`toLowerCase` gives `i̇`, two code points), emoji.
- The batch range (T8b-21): From > To in the pill; `?yearFrom=abc&yearTo=1e9` by hand.
- `/guide/<area>`: `../`, encoded slashes and a 10k-character slug. All should 404 through `findGuideArea`'s
  exact match.
- `page-label.ts`: analytics paths with unicode segments, or a real route segment of 20+ lowercase
  alphanumerics (none today), which would be collapsed to `:id`.

## Coverage
- **Read completely (this run):** `src/proxy.ts`; `src/app/layout.tsx`; `src/app/(main)/layout.tsx`;
  `src/app/(policies)/layout.tsx`; `src/app/error.tsx`, `(main)/error.tsx`, `(auth)/error.tsx`, `not-found.tsx`,
  `(main)/forbidden.tsx`; `src/app/page.tsx`, `(main)/about`, `(main)/guide/page.tsx`, `(main)/guide/[area]`,
  `(main)/birds/page.tsx` (awaits only), `hoopoe/page.tsx`, `catchups/join/page.tsx`,
  `catchups/join/[token]/{page,loading}.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`; `src/instrumentation.ts`,
  `src/instrumentation-client.ts`; `next.config.ts`, `vercel.json`, `package.json`, `tsconfig.json`,
  `eslint.config.mjs`, `e2e/playwright.config.ts` (the options); `src/lib/{api-gate,page-label,origin,
  local-storage,next-path,theme,back-closes,guide-open,guide-areas,report-error}.ts`, `utils.ts` (the date and
  time half); `components/layout/{app-shell,content-column,page-header,sidebar,search-pill,app-bar-title,
  konami-eggs,rail-grid}`; `components/ui/{dialog,sheet,popover,sonner,button,input,textarea}`;
  `components/common/{info-tooltip,confirm-dialog,use-closing-dialog,use-leave-guard,focus-modality,
  use-deferred-autofocus,use-wide-viewport,use-coarse-pointer,motion,motion-features,motion-features-max,
  rich-text-area,share-button,love-button,bookmark-button,use-user-search,flush-avatar,float-field
  (FloatArea)}`, `filters/{range-facet-pill,facet-search-select (logic)}`, `bird-avatar.tsx`;
  `components/guide/*` (all 12); `components/pwa/{install-prompt,install-app-tile (logic)}`;
  `components/landing/landing-hero.tsx`; the privacy page. Also every `onOpenChange` site in 41 files (for
  T8b-01), `admin-counts.tsx`, `posthog-identify.tsx`, `posthog-client.ts` (init options), and these installed
  sources: Next's `error-boundary.js`/`.d.ts`, `error.md`, `after-context.js`, `request/{cookies,utils}.js`,
  `create-error-handler.js`, `navigate-reducer.js`; `@sentry/{nextjs,core}` (`captureRequestError`,
  `requestdata`, the data-collection options, server init); `framer-motion`'s `LazyMotion`; `posthog-js`'s
  `identify`; `next-auth/react`'s `signOut`.
- **Read in the first run (its own header):** everything above, plus `page-label`, the privacy page, the retention
  constants, the Next action-handler and reducer internals for T8b-03, and the guide and landing citations
  re-verified in the errata.
- **Skimmed:** `ui/{select,dropdown-menu,combobox,card,label,separator,field-focus,menu-material}` (thin Base UI
  wrappers, no logic of their own); `common/{segmented-pills,meta-dots,skeleton,control-geometry}`, the rest of
  `filters/*` (presentational); `layout/peaks-mark.tsx` (pure SVG); the dormant landing showcase
  (`showcase`, `ambient-leaves`, `perching-birds`, `footer-hoopoe`, `feature-section`, `landing-footer`,
  `landing-nav`, `section-reveal`, `showcase-shot`, `shots`, `trust-section`), which is mounted on no live
  route (`page.tsx:18-29`); I counted listener adds and removes only.
- **Not read:** `layout/notification-bell.tsx`, `unread-store.ts` (T7b); `common/image-viewer.tsx` beyond its
  back-closes and download lines (T4b); `bird-avatar-v2.tsx` (glyph data; T6/T9); `components/mascot/*` (T9);
  `globals.css` (no runtime bug led there).
- **Taxonomy rows applied with zero findings, genuinely checked:** 6c the allowlist and prefix matching, `x-*`
  header trust, the visit cookie on actions; 6e revocation at every API door; 6f body limits; 6h open redirect via
  `next`; 6b listener cleanup across the shell hooks; the CSP against live data.
- **Taxonomy rows not applicable here:** 6d (no transactions in this territory), 6g (uploads are T4a's), 6i crons
  (T2a/T7a/L11).
- **Could not verify:** the Sentry dashboard, which bears on T8b-14 (whether any token was stored; Data Scrubber
  settings) and T8b-18 (quota used, Spike Protection, the demo project's env). No browser was used, by rule,
  which leaves the live proofs of T8b-15 (no request on "Try again"), T8b-16, T8b-17's pixel geometry,
  T8b-20's two-finger path and T8b-05 on a real Android. The `interest-cohort` console line has not been
  observed.
