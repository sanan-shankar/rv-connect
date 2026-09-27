# Charter: runtime-perf (L07, cross-cutting lens)
Report: `work/agents/runtime-perf.md`. See `_header.md`.

**Grants beyond the common rules** (and nothing else):
- You may write ONE probe script at `docs/audit-fix/2026-09-24-refactor-audit-3/work/raw/probes/
  runtime-probe.mjs` (and its JSON output beside it) and run it with `node`. It must use
  `scripts/qa/_dev-login.mjs` for sign-in (it reads `.env` itself — you never do) and
  `chromePath()` from `scripts/qa/_probe-kit.mjs` for Chrome. Read `scripts/qa/drive.mjs`,
  `_shoot.mjs` and `crawl.mjs` first: they are the house way to drive a page.
- Sign in as **Jerry Maguire only** (`sanan.shankar@gmail.com`, the test account — never a real
  alumnus; dev-login writes presence telemetry). The dev server is `http://localhost:3000` (a
  peer's; do not restart it). Dev is Turbopack, unminified: warm each route once, measure the
  second load, and report dev numbers as *comparative*, never absolute.
- You may run `npx lighthouse` (read-only GETs, `--chrome-flags="--headless"`, `--output json`,
  output under `raw/probes/`) against the **public** pages of production only:
  `https://rishivalley.space/`, `/login`, `/signup`, `/privacy`. Never sign in on production.
  Those numbers are absolute.
- No Playwright, no `npm run check`, no build, no MCP browser tools (the orchestrator's session
  holds them).

## What to measure (dev, signed in, desktop 1440×900 and mobile 390×844)
Routes: `/feed`, `/directory`, `/profile/<jerry's id>`, `/collection`, one `/collection/[id]`,
`/catchups`, one Catch-up home, one Edition, `/letters`, one letter, `/support`, `/notifications`,
`/settings`, `/admin` (Jerry is not admin — expect the forbidden page; note what it costs).
Per route: request count; transferred bytes by type (JS / CSS / image / font / RSC / XHR /
other); JS executed; TTFB, FCP, LCP (Performance API; `PerformanceObserver` for LCP); long
tasks; the number of `?_rsc=` requests on a client-side navigation between two routes and on a
Collection filter press (audit 2's `collection-01` open question); image weights actually loaded
(the Catch-up covers — are the 3.19 MB / 1.76 MB / 1.53 MB webp files served at those sizes?; the
Collection's screen copies vs masters vs thumbs); fonts loaded (count, bytes); third-party
(posthog, sentry) bytes; presence/`api/presence` calls over a two-minute idle; any
`setInterval`/polling (census in `src/` too).

## What to produce
1. A table per route × viewport with the measures above, and the dev-vs-audit-2 note.
2. Findings with the code path responsible (the component, the image tag, the fetch), each with
   the saving in requests/bytes/ms and the gate that proves it.
3. Lighthouse scores and the top three opportunities per public page (absolute, production).
4. Everything you could not measure and why.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- Vercel serves `public/` with `Cache-Control: public, max-age=0, must-revalidate`, so the three
  Catch-up covers (1.6–3.3 MB each) and the hero are first-load AND revalidated bytes; the picker
  dialog draws all three raw (`picture-picker-dialog.tsx:222-227`) — a 6.8 MB download. Measure it
  on dev and check the production headers for `/images/catchups/shaded-path.webp` with a HEAD request.
