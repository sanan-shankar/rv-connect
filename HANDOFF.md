# Fork handoff — RV Alumni rebuild (paste this whole file into a fresh session)

You are continuing a high-stakes redesign + MVP build of the RV Alumni app (Next.js 16, Tailwind v4,
Prisma, SQLite local, light-mode-first). Branch `redesign`. Hold a very high quality bar. The owner was
burned by a compacted session that drifted; do substantive work via fresh-context subagents (the Agent
tool) so you never compact, and STOP to hand off (with an updated copy of this file) before ~60% context.

## 0. The cache gotcha that caused the "it looks broken" panic
If the running app looks like an OLD/broken version while the code looks right, it is the Next/Turbopack
`.next` cache serving stale compiled CSS/JS. Fix: stop `npm run dev`, `mv .next .next-stale` (rm -rf is
blocked by Safety Net), `npm run dev`, hard-refresh. Always suspect this before believing a regression.

## 1. Orient (read in order)
- REBUILD_PLAN.md (campaign + rules), task_plan.md (phase tracker), FEEDBACK_CHECKLIST.md (binding owner
  feedback, itemized), docs/ROADMAP.md + docs/spec/*.md (deep specs per area), AUDIT.md (honest current-
  state audit), progress.md (full history; latest entries are fork 2).
- THE CONTRACT (approved look, do NOT edit): live route /preview/v2 (src/app/preview/v2/page.tsx). Toggles:
  /preview/v2 , ?view=profile , ?view=login , &theme=dark , &avatars=initials. This is the reference.
  Also /preview/logo = three-peaks logo lab (outline / solid-white-fill / gradient).

## 2. Current state (verify with `git log --oneline -20`; HEAD ~ 049cba1)
The committed app ALREADY MATCHES the contract for: design tokens (warm dim bg #EBE6D7, surface warm-white,
flush green sidebar #235C49), feed (header search pill + bell + New post inline, ruled SHEET, lowered rail
with Coming up / New in the directory / Your groups), profile (cover + large non-clipped avatar, tabs
Posts/About/Photos, Details + Contact rail, open-to tags), photo-split light login with an animated hoopoe
(spring + on-load peek), directory with a working zoomable world map (map-default), support page, and The
Valley Collection. Heart is locked red (#E03A33, no colour transition; cannot flash black). Bird avatars
centered. DONE + verified this session:
- Wave B cleanup (bd3b0f3 b048119 4f23991 e22e795): landing hydration error fixed; landing Sign-in button
  de-glassed to solid leaf-green; junk "asdfasdf" group removed + 3 real groups seeded; Collection tiles varied.
- Groups (2e94a07..6f6a111): Group.visibility public/private + coverImage + GroupInvite; organizer shown as
  "Keeper"; create + browse + join (public auto / private invite-only) + @-invite via notifications; group
  page reuses the shared FeedColumn (Composer + PostFeed + PostCard); groupId leak-guarded.
- Letters long-form (4751fd3 fe0c658 e41199b): Post.kind="letter" + title via the shared composer; compact
  LETTER card in feed (does not dominate); editorial /letters/[id] read view; /letters list; allowed in
  group feeds; seeded. DISTINCT from Catch-ups (the newsletter).
Do NOT rebuild any of the above. If something looks wrong, clear the .next cache first (section 0).

## 3. Remaining work, in order (each is its own wave; check in after each)
(a) CATCH-UPS = the Letterloop-parity newsletter (docs/spec/letters.md; FEEDBACK_CHECKLIST "## Letters" 2nd
    feature). Group-scoped. A Catch-up has rounds with questions + a deadline; members submit answers; an
    organizer compiles/publishes an ISSUE; per-group issue archive; cadence (monthly/quarterly); a clear
    first-time explainer of what it is; optional song/extras. MVP = manual cadence + manual compile/publish;
    DEFER automated email reminders to deploy (Render Cron + Resend). Must be visibly DISTINCT from Letters.
    Nav already has a "Catch-ups" item; inspect what exists before building.
(b) ONBOARDING / AUTH / VERIFICATION (docs/spec/onboarding.md). Minimal signup: name, email, password,
    batch (grad year), years joined/left. TEACHERS (past/present, even non-alumni) can register; account
    type alumnus/teacher/ex-teacher with a tag; current students cannot. Invite-only entry; keep a warm
    trivia/verification gate; NO magic links. "Complete your profile" later collects house PER YEAR (with
    clear "don't remember"), class sections (9A/9B), admission number (with "don't remember"), profession,
    socials, about, memory prompts. Verification: admin via office class-lists + community vouch ("N people
    confirm they know X") + flag-via-report; a NON-obvious verified marker (hover reveals it).
(c) WAVE D polish (docs/spec/delight.md): FIRST runtime-verify the hoopoe on /login on a fresh server (owner
    says it snaps; code has a spring + intro peek, so confirm at runtime and fix if the transition does not
    fire). Then: bird-avatar click chirp/wiggle, bookmark/save ribbon sweep (gains colour), a living loading
    scene (a bird hopping among leaves, not gray rectangles); confirm like-pop + bell-shake. Animate only
    transform/opacity.
(d) LOGO: if the owner dropped /Inspiration/bodi-middle-rishi.png, trace the real three-peak skyline into a
    simple mark and swap PeaksMark (src/components/layout/peaks-mark.tsx, used in sidebar/login/landing) from
    the current rough zigzag to the trace. Owner wants BOTH an outline and a solid-white-fill variant (see
    /preview/logo); let them pick. Until the photo exists, leave the placeholder.
(e) DEPLOY (Phase 0): push to GitHub (clean conventional "redesign" history, no AI attribution); Render
    always-on + Render Postgres (switch Prisma provider to postgresql; storage.ts Blob shim); remove magic
    links + /verify. Local dev stays SQLite/libSQL so screenshots keep working.

## 4. Rules that prevent drift
Per surface: open the contract/spec, build to MATCH, then VERIFY (npx tsc --noEmit; curl route; screenshot
1440 + 390 and READ the png; diff vs contract/checklist; iterate). VERIFY interactions, not just stills
(the owner will not forgive a black heart or a snapping hoopoe). No em dashes anywhere. Animate only
transform/opacity. Every clickable element gets hover + focus-visible + active. Use the tokens (leaf
#1F8A4C, office-blue/sky #3F7CA6, cinnamon #C2622F, heart #E03A33); never raw Tailwind blue/indigo. Reuse
shadcn/ui + cn() and the shared Composer/Feed/PostCard. Do NOT edit anything under src/app/preview
(frozen). Do NOT restyle the frozen foundation primitives (globals.css tokens, app-shell, sidebar,
page-header, bird-avatar, person-name, create-post-form/composer, post-feed, feed-column, post-card,
lib/avatar.ts) from a surface batch; a shared change is a deliberate sequential pass. Plain conventional
commits, atomic (so a process restart never loses work). Do NOT run two code-editing subagents at once on
the same tree (git index.lock); sequential builds, parallel only for read-only verify.

## 5. Tooling
Dev server: `npm run dev` on :3000. Screenshots need `export PUPPETEER_EXECUTABLE_PATH="/Applications/Google
Chrome.app/Contents/MacOS/Google Chrome"`; public `node screenshot.mjs <url> <label>`; authed `node
screenshot-auth.mjs <url> <label>` (--mobile for 390). Owner/admin user id cmmz0vvws0000ynsg3ueb9scp; seeded
demo users end @demo.valley.test. If the Prisma 7 generated client blocks a node seed script, talk to dev.db
via @libsql/client + @paralleldrive/cuid2 (see prisma/seed-demo.mjs).

## 6. Per-wave protocol + refork
After EACH wave: STOP and check in with the owner: (1) what shipped, with screenshots + a P0/P1/P2 punch
list; (2) your approximate context usage; (3) an updated copy of THIS file as the next fork's prompt. If you
pass ~60% context, recommend reforking now rather than continuing. Keep progress.md, REBUILD_PLAN.md,
FEEDBACK_CHECKLIST.md, and this file current so the next session is as smart as this one.

Your first move: `git log --oneline -20` + clear the .next cache (section 0), then start wave (a) Catch-ups.
