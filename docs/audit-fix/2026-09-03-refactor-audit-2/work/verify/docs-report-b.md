# docs-report-b — adversarial verification notes

Cluster: `docs-report-b` = docs-12 … docs-21, all from `work/agents/docs.md`.
Verified at HEAD `74cc61a` ("fix(retention): notifications are kept 30 days, everywhere"),
2026-09-04. Read-only: no builds, no tsc, no browser, no database, no writes outside this file.

Working-tree state seen: ` M docs/audit-fix/README.md`, ` M progress.md`, `?? docs/audit-fix/2026-09-03-refactor-audit-2/`.
Note that the docs.md finder wrote its report while `docs/SECURITY.md` and `src/lib/retention.ts`
were **uncommitted**; they are committed now (`74cc61a`), so several "uncommitted" qualifiers in
docs-12 are stale in the finder's favour.

Every counted fact below was recounted, not taken.

---

## docs-12 — `/notice/[id]` retirable now, not 2027-08-01
**Verdict: confirmed-with-correction.** The premise holds and is stronger than the finder knew;
three details are wrong.

Confirmed at HEAD:
- `docs/planning/bugs.md:462-467` still says *"**After 2027-08-01: delete `/notice/[id]`.** … `retention.ts` caps notifications at 365 days"*. Unchanged.
- `src/lib/retention.ts:54` is `notifications: 30,` (grep -n exact hit at 54). Its docblock:
  *"It said 365 until 2026-09-04 … The owner chose the behaviour over the promise: 30 days everywhere."*
- `scripts/ops/prune.mjs:11-19` records the same settlement.
- `docs/SECURITY.md:85` `| Notifications | 30 days |`, and `:91-92` the dated note — **committed**, not uncommitted.
- Route exists: `src/app/(main)/notice/[id]/page.tsx` = 119 lines, `loading.tsx` = 13. 132 total. Correct.

Corrections:
1. **One route entry, not two.** `raw/route-js.txt:46` and `raw/build.txt:135` list `/notice/[id]`
   exactly once (`ƒ /notice/[id]`, 1055 B / 30 chunks). `loading.tsx` is not a route row.
2. **A test pin the finding missed, and it is load-bearing.** `src/lib/threads-rule.test.mjs:20`
   does `const NOTICE = decomment(read("src/app/(main)/notice/[id]/page.tsx"));` and the C-115 test
   at `:155-187` asserts against it (`FOR UPDATE` before `openAdminNoticeThread`, `db: tx`,
   `tx.notification.update`). Deleting the route makes `read()` throw and `npm run check` red. The
   fix session must delete line 20 and the whole `:155-187` test block in the same commit. The other
   `openAdminNoticeThread` pin at `:126-131` reads `admin-threads-server.ts`, not the route, and survives.
3. **The SELECT has effectively already been run.** `docs/audit-fix/2026-08-22-bug-audit-2/fix-ledger.md:52`
   (C-055): *"refuted live: zero `/notice/%` notifications in either database, and `notifyAdminNote` has
   opened an AdminThread before writing the bell row since the rewrite"*. `src/lib/admin-note.ts:22-35`
   confirms the current writer links `/messages/${thread.id}`, so no new `/notice/` link can be minted.
   The SELECT is still worth running (a 2026-08-22 count is not a 2026-09-04 count) but the finding's
   "medium confidence" is pessimistic; the arithmetic is corroborated by a live query already on record.
4. **More than the `createdAt` override falls out.** `openAdminNoticeThread`
   (`src/lib/admin-threads-server.ts:153-182`) has exactly two callers: the notice route and
   `admin-note.ts:24`. `admin-note.ts` passes only `authorId`. So **both** `opts.createdAt` and
   `opts.db` — and the six-line `db` docblock at `:159-163` that exists solely for the legacy
   resolution — become dead with the route, not just `createdAt`.
5. **Five comment sites cite the route, not four**: `src/app/(main)/messages/[id]/page.tsx:20`,
   `src/app/(main)/feed/actions.ts:479`, `src/components/admin/moderation-dialog.tsx:20`,
   `src/lib/admin-note.ts:13-14`, `src/lib/admin-threads-server.ts:161`. (Plus the route's own
   `page.tsx:23` header, which goes with the file.)

Net saving, corrected: 132 lines of route + ~33 lines of pinned test + ~10 lines of now-dead option
plumbing; −1 route row.

---

## docs-13 — `dialog-standards-findings.md` is finished business
**Verdict: confirmed-with-correction.** All five findings did ship; two of the finding's supporting
facts are wrong, and one of them changes the deletion steps.

Confirmed:
- File is 182 lines / 11,173 bytes, header reads *"Working notes, 2026-08-29 … Nothing here is a proposal."*
- `src/components/ui/field-focus.ts` and `src/components/ui/focus-recipe.test.mjs` both exist.
- `src/components/ui/menu-material.ts:41` exports `MENU_TRIGGER_HIT` with the 44px coarse-pointer `::after` box.
- `DropdownMenuSeparator` used in `posts/post-card.tsx:381,398`, `catchups/home/people-panel.tsx:478`,
  `catchups/index/catchup-card-menu.tsx:114` — three files, as claimed.
- `collection/contribute-room.tsx:209-213` carries the past-tense comment *"On 2026-08-28 the empty state
  hid it (sr-only) and let a 22px 'Drag and drop, browse or paste from your clipboard' line stand in"*.

Corrections:
1. **`window.confirm` is at ZERO call sites, not 3.** `grep -rn "window.confirm" src` returns only two
   *comment* lines inside `src/components/common/confirm-dialog.tsx:18,42`. A wider
   `grep -rn "confirm("` finds one unrelated local function (`support/bird-picker.tsx:47`). The finding
   understates its own case; the fifth item is fully shipped and there is nothing left "for whoever owns them".
2. **"Nothing cites the findings file" is false, and this changes the fix.** Two live documents cite it
   by name: `docs/planning/dialog-standards-research.md:5` (*"Companion to `dialog-standards-findings.md`"*)
   and `docs/planning/menus-focus-research.md:6` (*"`dialog-standards-findings.md` (codebase evidence)"*),
   plus `progress.md:8312`. Deleting the file therefore leaves **two dangling cross-references**, not one
   optional header note. The fix session must edit both research files. (The finding's "What to do" happens
   to touch `dialog-standards-research.md`, so it half-covers this by accident; `menus-focus-research.md`
   is unmentioned anywhere in the finding.)

---

## docs-14 — `collection-scrubber/` shipped; its handover has rotted
**Verdict: confirmed-with-correction.**

Confirmed at HEAD:
- `handover.md` 249 lines, `brief.md` 194 lines, folder 28 KB on disk (`du -sk`). 443 lines total: correct.
- `handover.md:25` *"There are four real photographs in it today"*; `:29` *"`npm run check` (~25s) and `npm run visual` (~70s)"*;
  `:104` names `src/components/collection/decade-rail.tsx`; `:233` *"`/collection` is deliberately **not** masked in the visual suite … rebaseline and say so"*. All four line refs are exact except `:23`→`:25` and `:231-233`→`:233-235`.
- `src/components/collection/decade-rail.tsx` **does not exist**; `year-rail.tsx` and `photo-scrubber.tsx` do.
- `e2e/visual.spec.ts:44` and `:63` both carry `live: "band"` — both Collection entries ARE masked, and the
  in-file comment at `:35-43` calls rebaselining on photographs *"the one way to make this suite worthless"*.
  So `:233`'s instruction is genuinely dangerous. Confirmed.
- All three "pieces of work" are done: piece one/two = `photo-scrubber.tsx` + `year-rail.tsx`;
  piece three (the EXIF date, which `brief.md:153` still marks `[OPEN]`) shipped as `src/lib/exif-date.ts`
  + `src/lib/exif-date.test.mjs`.
- 1,719 photographs on 2026-09-02: corroborated by `e2e/visual.spec.ts:49-51`.

Corrections:
1. **The masking dates differ per entry.** `/collection` (valley) was masked **2026-08-29** (spec comment
   *"LIVE as of 2026-08-29, and it had not been marked so"*), `/collection?scope=class` on **2026-09-02**.
   The finding's "both … masked since 2026-09-02" is half right.
2. **"the last four commits on `main` are the scrubber landing" is no longer true** — HEAD has moved twice
   since (`72b5a1d`, `74cc61a`). The three named shas (`ab4cc8f`, `2400547`, `8211f64`) are real and are
   commits 3-5 back.
3. **Bonus, for the tooling/e2e lens:** `e2e/visual.spec.ts:150` contains the same stale claim as
   `handover.md:233` — *"/collection is deliberately NOT in this list"* — inside the LIVE-ROUTES docblock,
   contradicting `:44`/`:63` twenty lines above it. The doc fix and the code-comment fix should ship together.

---

## docs-15 — `directory.md`'s supersession banner is itself stale
**Verdict: confirmed.**

- Banner text verified verbatim at `docs/spec/directory.md:12-19`, including *"The `City` / `HouseYear` /
  `ProfileTag` schema deltas in §3 are **not yet in `prisma/schema.prisma`** … that remains a live,
  unimplemented plan"*.
- `grep -c 'model City\b\|model HouseYear\|model ProfileTag\|cityId' prisma/schema.prisma` → **0**.
- `model Place` at `prisma/schema.prisma:865`, `model UserPlace` at `:892`. Both line numbers exact.
- §3 spans `:96` (`## 3. Data model deltas (Prisma)`) through `:192-199` (§3.5 "SQLite local, Postgres on
  Render"), i.e. `:96-199`. Exact.
- House-per-year shipped, though **as a JSON column, not a model**: `prisma/schema.prisma:21`
  `houses String? // JSON string of [{year, house}]; canonical house list in src/lib/houses.ts`.
  Worth saying in the rewritten banner so nobody hunts for a `HouseYear` table.
- 234,934-row gazetteer corroborated by `docs/spec/demo.md:308` and `docs/history/progress-2026-07.md:91`.
- All four dead paths confirmed missing: `src/components/common/user-avatar.tsx`,
  `src/components/ui/skeleton.tsx`, `src/app/preview/v2/page.tsx`, `src/components/directory/map`.
  `src/components/directory/alumni-map.tsx` (the part the banner says shipped as specced) does exist.
- File is 368 lines, so "~100 lines if §3 goes" is 27 % of the document — an honest number.

---

## docs-16 — three campaign docs restate CLAUDE.md's rules
**Verdict: confirmed-with-correction.** The duplication is real in ONE file, partial in a second, and
**absent in the third** — the third is actually the good pattern the finding praises elsewhere.

What I read:
- `docs/planning/collection-rework/spec.md:700-724` (§15 "Operational context") — a genuine full
  restatement: repo/branch/no-feature-branches, shared checkout + stage by name, `npm run check`,
  screenshots, Jerry Maguire, one Supabase database + never `db push`, never a Vercel CLI command,
  chrome-devtools-finds-Playwright-remembers. **Eight rules. Confirmed.**
- `docs/planning/collection-scrubber/handover.md:20-44` (§0) — restates **five** of the eight (repo/branch,
  one database, Jerry Maguire, the gates, a push is a deploy) and omits `db push`, the Vercel CLI, the
  shared-checkout staging rule and the MCP/Playwright rule. It also carries **three campaign-specific
  facts that exist nowhere else** (`/lab/collection` renders 240 made-up photographs from
  `_archive.ts`; the owner's bash+python3-heredoc editing preference; the `globals.css` Turbopack
  stale-stylesheet gotcha with `mv .next .next-stale`). A trim, not a deletion.
- `docs/planning/collection-rework/handover.md:36-58` — **not a restatement at all.** It opens
  *"Operational context is spec §15 — repo, branch, the gate, screenshots, the test account, the one
  database … Read it before you run anything. Two things this session learned that are not in it:"*
  and then adds the two. That is the pointer-plus-delta shape the finding holds up `class-collection/spec.md`
  as the model for. **Refuted as a third copy.**
- The grep claim *"`grep -rln "push is a deploy"` matches `CLAUDE.md` plus exactly these three"* is wrong:
  it also matches `docs/audit-fix/prompts/refactor-audit-prompt.md`, `docs/audit-fix/prompts/bug-audit-prompt.md`
  and `docs/audit-fix/2026-08-25-refactor-audit-1/work/agents/bundle-build.md`. Seven files, not four.
  (The three extra are audit prompts, arguably a different category, but the count as stated is false.)

Confirmed in full — and this is the valuable half of docs-16:
- **The drift figures are all real.** `CLAUDE.md:134` "about 30 seconds" for `check`; `collection-rework/spec.md:711`
  "about 25s"; `collection-scrubber/handover.md:29` "~25s". For `visual`: `CLAUDE.md:238` "Takes 50s";
  `docs/OPERATIONS.md:16` "~80 seconds"; `collection-scrubber/handover.md:29` "~70s". **Three numbers for
  one command across three files.**
- **The dev-login contradiction is real and the handover has the better argument.**
  `collection-rework/handover.md:41-45`: *"`scripts/qa/_dev-login.mjs` exists precisely because the secret
  must not enter page JavaScript … **CLAUDE.md still says to POST the secret from `evaluate_script`; do not.**"*
  `scripts/qa/_dev-login.mjs:16-21` says the same in its own header: *"The secret must not enter page
  JavaScript. Eight of the nine copies did the fetch inside page.evaluate, which serializes its arguments
  into the page's main world — app-controlled ground."* And `CLAUDE.md` does still instruct exactly that
  ("`evaluate_script` POSTing `{ email: ADMIN_EMAIL, secret: DEV_LOGIN_SECRET }` to `/api/dev-login`").
  Nuance the fix session needs: `_dev-login.mjs` signs in from **Node** and copies the cookie — the
  chrome-devtools MCP has no Node-side hook, so the two instructions are not interchangeable; resolving
  this is a real decision, not a typo fix. Raise with the owner (it edits `CLAUDE.md`).

Corrected saving: ~25 lines from `spec.md` §15, ~10 from `scrubber/handover.md` §0; **~35 lines, two
files**, not ~55 across three.

---

## docs-17 — `DESIGN-SYSTEM.md`'s three stale claims
**Verdict: confirmed-with-correction.** All three claims are stale as described; the line refs are off by
one to two, and the LoveButton import count is wrong.

- §4 glass/z-index: `docs/spec/DESIGN-SYSTEM.md:363` (*"**Frosted glass:** **yes** — implement a `.glass`
  utility"*) and `:365-367` (*"define named tokens … and migrate the scattered ad-hoc values onto them"*).
  Both done: `src/app/globals.css:604` `.glass { … }` (with the docblock at `:602-603`), and `:54-56`
  `--z-elevated: 10; --z-floating: 30; --z-overlay: 50;`. **Confirmed.**
- Type scale: the bullet is at `:374`, not `:373-375`. *"(documented ladder, matches `/preview/v2`)"* —
  `src/app/preview/` does not exist. **Confirmed.**
- LoveButton: the bullet is at **`:418-420`**, not `:416-418`. Text confirmed verbatim, including
  "Catch-ups, groups, the Collection, comments" and "Today it only works in the feed". `/groups` is gone
  (`ls "src/app/(main)"` has no `groups`). **Confirmed.**
- **Correction to the evidence:** *"imported by eleven files across letters, posts, comments, catchups
  (three), collection and the image viewer"* is wrong.
  `grep -rln 'from "@/components/common/love-button"' src` → **12 files: 7 lab variants
  (`src/app/lab/profiles/_variant-*.tsx`) and 5 non-lab** — `catchups/round/entry-love-button.tsx`,
  `common/image-viewer.tsx`, `letters/letter-engagement.tsx`, `posts/comments-section.tsx`,
  `posts/post-card.tsx`. **No Collection file imports it**, and `common/bookmark-button.tsx:66` /
  `common/share-button.tsx:56` only mention `love-button.tsx` in comments (a dL* citation), which is
  probably what inflated the count. The substantive claim — it was extracted and is used well beyond the
  feed — stands.
- The two honesty checks hold: `grep -c font-mono src/app/globals.css` → **0**; nothing matching `rail`
  in `src/components/common/`, so the §9 rail-card line at `:451-452` (finding said 451-454) is still true.
- File is 531 lines, as claimed.

---

## docs-18 — `DELIGHT.md`'s build-spec half
**Verdict: confirmed.**

- File is 551 lines / 48,160 bytes. `## /preview/delight showcase build-spec` at `:241`;
  `## Build status (live, 2026-06-27)` at `:324`; `## Salvaged detailed specs` at `:345`;
  `# Owner verdicts on delight` at `:374`. So `:241-344` is exactly the block the finding names,
  and the keep-everything-from-374 instruction lands on the right heading. 104 lines, "~103" is honest.
- `:327` *"Self-contained under `src/app/preview/delight/`; no core app files touched."* — `src/app/preview/`
  does not exist (`ls src/app` = `(auth) (main) (policies) api catchups hoopoe lab …`, no `preview`).
- `:340-341` *"lifting the kit into `src/lib/motion.ts` + `src/components/motion/`"* — both missing;
  the kit landed at `src/components/common/motion.tsx`, which exists.
- Dead paths counted in-file: `src/lib/motion.ts` at `:50, :75, :203, :340` (**four**, finding said three);
  `src/components/motion` at `:76, :218, :341` (three); `src/app/preview/delight` at `:241, :327`;
  `docs/spec/delight.md` at `:345`; `user-avatar.tsx` at `:347, :366`. `docs/planning/DELIGHT_FIX.md`
  at `:379, :381` is the deliberate git-history pointer and stays — correctly excluded by the finding.
  All targets verified missing.
- Citations: `docs/planning/bugs.md:16` (*"`docs/content/DELIGHT.md` (authoritative, with a verdict per
  item)"*) and `docs/history/progress-2026-07.md:20`. Nothing else outside the audit folders. Confirmed.

---

## docs-19 — `ROADMAP.md`'s temp path and Phase 7
**Verdict: confirmed-with-correction.** Two counted facts are off.

- The temp-path line is at **`docs/ROADMAP.md:135`**, not `:134` (the file has 134 *newline-terminated*
  lines plus an unterminated last line, which is why `wc -l` says 134). Text verified:
  *"Full plan written to `/private/tmp/claude-501/-Users-sanan-Documents-rv-alumni/d5fa1925-06df-4a12-ac6a-907f1c382f8e/scratchpad/BUILD_PLAN.md`."*
- Phase 7 at `:105` — *"**Phase 7 — Groups.** Rewrite `/groups/[id]` … **DoD:** full-featured gated group
  feeds … `GroupPost` deleted."* `src/app/(main)/groups` does not exist. Confirmed.
- §2 sidebar order at `:49` lists "Groups"; `<RailGroupRow>` at `:63`. Confirmed.
- Phase 0 DoD at `:91`: *"login + admin bypass verified, clean `prisma db push`/`migrate deploy`"*. Both
  the deleted bypass (audit C1-b) and the forbidden command. Confirmed.
- **Correction: four inline `(Superseded: …)` notes, not seven.** They are at `:13` (Catch-ups model
  names), `:19` (dark mode), `:23` (JWT-vs-database-sessions + the admin-login bypass) and `:79` (the
  Catch-ups schema family). `grep -c Superseded docs/ROADMAP.md` → 4. The habit is real and worth
  continuing; the count in the finding is not.
- `docs/README.md:17` does call it *"the phased build plan; source of truth for decisions, shared
  components, data model, and the 13 phases"*, and `CLAUDE.md:29` cites it. So the "do not move it to
  docs/history" reasoning holds.

---

## docs-20 — three small stalenesses
**Verdict: confirmed-with-correction** (line refs only; every substantive claim holds).

- `docs/spec/mascot.md:18` — path given as `src/app/preview/delight/hoopoe/page.tsx`, correction appended
  as *"Now at `src/app/lab/hoopoe/page.tsx`."* Exact. `src/app/lab/hoopoe/page.tsx` exists.
- `mascot.md:208-209` (finding said `:205-209`) — *"Old `src/components/auth/hoopoe.tsx` and the
  placeholder `src/app/preview/delight/_hoopoe.tsx` can be removed once all usages are repointed"*.
  **Both files verified missing.** A done item under "Open follow-ups". Confirmed.
- `docs/planning/FEATURES.md:67` `## 5. Groups`, `:68` `- [have] Groups with membership and a group feed.`,
  idea bullets `:69-71`. No `groups` route exists. Confirmed. The `[x] … SUPERSEDED` notation the finding
  proposes reusing is at `:20` — verified (*"- [x] Bird-themed avatars as the default. SUPERSEDED 2026-07-01"*).
- `FEATURES.md:89` `## 9. Onboarding & auth`, `:90` `- [have] Email + password (local), admin bypass,
  trivia gate.` Confirmed; the bypass was deleted in the 2026-08-20 security work and is pinned deleted
  by `src/lib/security-regressions.test.mjs` per `AGENTS.md`.
- `docs/spec/demo.md:23-25` (finding said `:24-26`) — *"The real database currently holds 37 people, 16
  posts and one photograph"*. Counter-evidence: `docs/OPERATIONS.md:279` *"measured rather than guessed
  (2026-08-25): 63 members"*, and the 1,719-photograph import of 2026-09-02 (`e2e/visual.spec.ts:49-51`).
  Confirmed stale.
- `demo.md:132-135` — *"This repository owns exactly one photograph … so the demo seeds six framings of
  it"*. True of the repo, misleading about the archive. Confirmed as written.

---

## docs-21 — `.DS_Store` in `docs/`
**Verdict: confirmed-with-correction — the finding is right and far too narrow.**

- The three named files exist, 6,148 bytes each: `docs/.DS_Store` (Sep 2 01:34),
  `docs/planning/.DS_Store` (Sep 1 23:44), `docs/audit-fix/.DS_Store` (Aug 30 19:36).
- `git ls-files docs | grep -i ds_store` → empty. `.gitignore:10` is `.DS_Store` (under a `# misc`
  heading at `:8`). So none is tracked. Confirmed.
- **Correction: a repo-wide `find` (excluding `node_modules` and `.git`) returns 31.** Twenty-one of
  them are outside the ignorable build/scratch/personal areas, and one of them is
  **`/Users/sanan/Documents/rv-connect/.DS_Store` — at the repo root**, which is precisely the directory
  the owner says he keeps looking at. Others: `prisma/`, `.claude/` (+ `scripts/`, `skills/`,
  `_disabled-gsd/`), `public/` (+ `images/`), `scripts/` (+ `dev/`), `e2e/` (+ `.shots/`,
  `__screenshots__/`), `src/` (+ `app/`, `app/lab/`, `components/`, `generated/`), `docs/` (×3).
  ~127 KB, 0 tracked bytes. The fix is the same one-liner with a wider scope; whoever executes it
  should do the whole tree, not just `docs/`.

---

## Cross-finding notes

- **docs-12 overlaps `member-surfaces-05` (audit 1) and the ORCH-04 retention work.** They agree.
  docs-12's steps are the safer ones **only once amended with the `threads-rule.test.mjs` pin** above;
  as written, following either would turn `npm run check` red.
- **docs-14 and the e2e/tooling lens overlap** on `e2e/visual.spec.ts:150`. docs-14's instruction
  ("`:233` must not survive whichever way this goes") is the right one; add the code comment to it.
- **docs-16 and docs-13 both touch `docs/planning/`.** No conflict.
- Nothing in this cluster needs a database or a browser to settle. docs-12's SELECT is a
  belt-and-braces confirmation of something the 2026-08-22 fix-ledger already answered live, not a
  blocker on the finding's truth.
