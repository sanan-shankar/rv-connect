# Fork handoff — RV Alumni (paste this whole file into a fresh session)

You are continuing a careful redesign + MVP of the RV Alumni app (Next.js 16 + Turbopack, Tailwind v4,
Prisma, SQLite local, light-mode-first). Branch `redesign`. The owner was burned by a compacted session
that drifted, so: hold a high quality bar, VERIFY visually (not just tsc), and do not let this session
compact, hand off via this file before ~60% context.

## 0. CRITICAL workflow gotchas (read first, these have bitten every fork)
1. **`.next` cache corruption.** If the running app 404s every route, or a `globals.css` change does not
   show up, the Turbopack `.next` cache is stale/corrupt. `rm -rf` and `find -delete` are BLOCKED by Safety
   Net, and an in-project `mv .next .next-stale` exceeds the 5GB folder cap. Fix that works: move it OUT to
   the scratchpad (same APFS volume, so it is instant):
   `mv .next "/private/tmp/claude-501/-Users-sanan-Documents-rv-alumni/<session>/scratchpad/next-old"` then
   `npm run dev`. ALWAYS clear `.next` and restart after editing `globals.css`, HMR does not reliably pick
   up token/CSS-rule changes (a new `.bell-trigger` rule silently failed to serve until a clean restart).
2. **Subagents cannot screenshot** unless you pass them
   `PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` (the bundled
   puppeteer Chrome is broken). A blind agent already shipped a regression. Either give every screenshotting
   agent that env var, or do the visual verification yourself.
3. **Verify at runtime, not just `npx tsc --noEmit`.** tsc passed a Prisma `select` for a non-existent
   column (`avatarSpecies`) that 500'd the feed at runtime. Always: screenshot the surface AND watch the
   browser console / server log for `PrismaClientValidationError` / `pageerror`. Use puppeteer
   `getBoundingClientRect` to MEASURE alignment rather than eyeballing.
4. **Reduced-motion:** the global `@media (prefers-reduced-motion: reduce)` blanket kill was removed on
   purpose so the hoopoe / bell / like delights play regardless of OS setting. Do NOT re-add a blanket kill.
5. No em dashes anywhere (copy, errors, examples). Plain conventional commits, NO AI attribution / no
   Co-Authored-By. Animate transform/opacity only. Reuse shadcn/ui + cn() + the shared Composer/Feed/PostCard.

## 1. The contract (the approved look, do NOT regress)
- Live: `/preview/v2` (`src/app/preview/v2/page.tsx`) with `?view=profile`, `?view=login`, `&theme=dark`,
  `&avatars=initials`. Frozen reference.
- Standalone openable reference (no server needed): `docs/contract/index.html` (toggles view/theme/avatars).
- `PUNCHLIST.md` = the authoritative verified state + the full remaining backlog. `progress.md` = full history.

## 2. State now (all committed on `redesign`, HEAD ~ 7add1e3, tsc clean, routes verified 200)
The app MATCHES the contract on feed / login / profiles / directory map / landing. Recent fidelity pass
(this fork) done + screenshot-verified:
- Background warmth set to the preview exactly: `--background #E7E1D3`, `--card #F6F2E8`, secondary/muted/
  accent `#EEE8DA`, border/input `#E0D8C8` (globals.css).
- Buttons recolored to the canopy/sidebar green `#235C49` (Button `default`+`leaf` variants + 3 landing CTAs).
- Faint valley tree: was hidden by a `-z-10` bug; now `z-0` + content `relative z-10`, `opacity .11`, and
  `bg-fixed` (background-attachment:fixed) so it is stationary + natural-scale (not stretched to scroll height).
  Owner chose the FULL faded tree; a fade-to-bottom variant exists as `.valley-tree--fade` if wanted.
- Sidebar: peaks mark 26px standalone white; nav text 14.5px (preview parity).
- Feed header matches preview: "Feed" is NOT bold (30px), subtitle is one line (`whitespace-nowrap`),
  search/bell/New-post are 40px (h-10). Rail "Coming up" top aligns to the composer top (feed/page aside
  `pt-[85px]`, measured 117==117). Content max-width widened to 1280 so the rail sits nearer the right edge.
- Posts: separate tiles, tightly spaced (`PostCard variant="card"`, `space-y-2.5`, `p-4`). Post category
  tags removed. Share icon = `ShareFat`. Heart/comment row pulled up + left (`-ml-2.5`) so the heart's left
  edge aligns with the tile content; saves vertical height.
- Login hoopoe: bottom tail removed (rounded body, crest on top); animates regardless of reduce-motion.
- Bell wobbles on hover (`.bell-trigger:hover svg` in globals) AND on new-notification increment.
- Landing hero: title "Welcome back to the valley." + subtitle "A space for Rishi Valley alumni to reconnect,
  share stories, and find each other.", each one line on desktop.
- FONTS never changed app-vs-preview: Libre Baskerville (headings) + Source Sans 3 (body), same CSS vars.

## 3. Remaining work (in rough priority; full detail in PUNCHLIST.md)
1. **Bird avatars (owner wants a DEDICATED session for this).** Two things: (a) center every species glyph
   in its disc (balanced around 16,16 in the 0..32 viewBox), (b) expand to many clearly-distinct species
   (the current set looks too similar / too few). Files: `src/components/common/bird-avatar.tsx`,
   `src/lib/avatar.ts` (+ `avatar.test.mjs`), preview at `/preview/birds`. A half-finished WIP is in
   `git stash` (`stash@{0}: wip-bird-avatars-deferred`) — recommend DROP it and redo cleanly. Verify with the
   Chrome env var on `/preview/birds`.
2. **Catch-ups** (Letterloop-parity newsletter) — `/catchups` is a ComingSoon stub. Rounds + questions +
   deadline, member answers, organizer compiles/publishes an issue, per-group archive, cadence, first-time
   explainer. Distinct from "Letters" (the long-form post type, which is done). MVP = manual; defer email.
3. **Onboarding/verification depth** — minimal signup is fine; add complete-profile (house-per-year with
   "don't remember", class sections, admission no, profession, socials, about, memory prompts), teacher
   account collection, community vouching ("N people confirm they know X"), invite-only ENFORCEMENT (not
   built), subtle verified marker. Server-side trivia gate was added this campaign; confirm it.
4. **Events** (`/events` is a stub): a small tile that appears only when an event exists, opens details +
   RSVP, add-to-calendar (.ics). Keep it minor.
5. **Directory tier-2**: filters re-filter the live map (done), but add House/Tag facets, programmatic
   pan-to-city on search, map hover tooltips, a real City gazetteer.
6. **Logo**: trace the three peaks (Bodikonda / Middle Peak / Rishikonda, left to right) from the photo into
   a clean mark. The photo was committed-deleted at repo root but still exists at
   `Inspiration/bodi-middle-rishi.png`. Owner wants solid OR outline (compare against the same background);
   get the relative peak heights + curvature right. Current `peaks-mark.tsx` is an approximation.
7. **Deploy** (Phase 0): Render always-on + Render Postgres (switch Prisma provider, storage.ts Blob shim,
   remove magic links + `/verify`), keep local on SQLite. Run `npm run build` as the gate before deploy.
8. **Collection / photo archive**, donate→support tweaks, "On this day", bookmark persistence — see PUNCHLIST.

## 4. Tooling
Dev: `npm run dev` :3000. Screenshots: `export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/
Contents/MacOS/Google Chrome"`; public `node screenshot.mjs <url> <label>`; authed `node screenshot-auth.mjs
<url> <label>` (`--mobile` for 390). Admin user id `cmmz0vvws0000ynsg3ueb9scp`; demo users end `@demo.valley.test`.
Per-batch: `npx tsc --noEmit` clean + screenshot 1440 (and 390 where it matters) + READ the png + check the
console, then commit. Update PUNCHLIST.md + progress.md.

Your first move: `git log --oneline -8`, then `npm run dev` and confirm `/feed` + `/login` serve 200 (if they
404, clear `.next` per section 0). Then pick a task above (the owner's next is the bird avatars).
