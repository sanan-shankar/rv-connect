# v-dead-assets - verification notes

Verifier: v-dead-assets. Date: 2026-08-25. HEAD at verification time: `c74d99f` ("feat(admin):
a non-admin who asks for /admin is told 'nice try'"). Read-only; no state-changing git commands
run. No uncommitted edits found on any file I inspected (`git status --short` clean for
.gitignore, tsconfig.json, globals.css, package.json).

Cluster: member-surfaces-02, root-docs-assets-01..04, -07, -13, -14, -16, -17,
dead-code-06, -07, -13.

## Method

Re-ran every reference grep at HEAD, including the extensionless re-check that saved
`demo-banyan-*`: for each collection basename I grepped `collection/<name>` (catches both
`x.webp` and extensionless keys) across src, scripts, e2e, next.config.ts, and separately
confirmed the `file:` keys in `src/lib/demo-seed/content.ts` (lines 699, 717, 736, 753, 770,
787 - all `demo-*`, none of the v/c/gen names). Byte sizes from `ls -l`, tracked status from
`git ls-files` (with `-c core.quotepath=false` where U+202F filenames are involved), gitignore
coverage from `git check-ignore -v`.

## Evidence per finding

### member-surfaces-02 (QR pipeline) - CONFIRMED
- `grep -rIn "support-qr"` over the whole repo (minus node_modules/.next/audit dirs): hits only
  `scripts/gen-support-qr.mjs` (the generator itself), `scripts/README.md:73`, and
  `docs/planning/bugs.md:369-370` (past-tense done item). Zero in src/e2e.
- The five SVGs exist: `public/images/support-qr{,-500,-1000,-2000,-5000}.svg`, 199,326 bytes
  total (exact), mtime Jul 24.
- `jsqr` and `qrcode` are in **devDependencies** (verified inside the devDependencies block);
  sole importer is `scripts/gen-support-qr.mjs:22-23`.
- `support-contribute.tsx:16-18` comment confirmed verbatim ("This replaced a static UPI QR and
  an `upi://pay` deep link (2026-08-05)").
- knip lists the script as unused in both `raw/knip.txt:25` and `raw/knip-production.txt:27`.
- Commits `46c375c`, `1f549b3`, `0fc7160` all exist with the described messages.
- One count correction, immaterial: the script is **163** lines by `wc -l` (the finding's 147 is
  presumably non-blank/code lines).

### root-docs-assets-01 (archive closed bug audit, delete JSON dumps) - CONFIRMED
- `fix-ledger.md:6-11` says verbatim "THE RUN IS COMPLETE (2026-08-25)... 203 against 203".
- Referrer sweep for `findings-raw|verdicts-merged|db-indexes-live|db-sizes-live`: only
  audit-internal files (the bug audit's own md/json, this simplification audit's working set,
  and prose in progress.md). Nothing executable.
- `.github/workflows/` contains zero `docs/` references. `scripts/qa/audit-status.mjs` has zero
  mentions of these paths.
- Source cites by finding NAME, not path: `src/proxy.ts:119` "bug-report-2 C-198",
  `src/app/api/users/search/route.ts:74` C-006, webhook route C-086, feed actions C-004 - all
  re-verified at HEAD.
- Line counts exact at HEAD: findings-raw.json 4,615; verdicts-merged.json 3,152;
  db-indexes-live.json 651; db-sizes-live.json 66; bug-report-2.md 748; fix-ledger.md 241.
- Live caveat the finding already carries and which still holds: `db-indexes-live.json` is an
  input to this simplification audit's data-layer lens
  (`docs/planning/audits/simplification/agents/data-layer.md` references it) - sequence the move
  after this audit closes.

### root-docs-assets-02 (WhatsApp originals) - CONFIRMED
- Both files are **git-tracked**: `git -c core.quotepath=false ls-files` lists them; commit
  `ba61ac1 "adding photos to demo"` (2026-08-13) added exactly these two plus three docs.
- Sizes exact: 1,593,201 and 1,459,007 bytes.
- U+202F confirmed: git quotes the paths as `\342\200\257` (which is U+202F in UTF-8), and
  `raw/cloc-summary.txt:3-4` shows cloc's two "Unable to read" errors on precisely these files.
- Zero code references ("WhatsApp Image" grep hits only audit output).
- The finding correctly defers the `Photo.url LIKE '%WhatsApp%'` check to the fix session
  (DB unreadable from this audit); repo-side facts all verified.

### root-docs-assets-03 (overflow-stories PDF/HTML) - CONFIRMED
- Files exist, sizes exact: pdf 1,586,517 bytes; html 203,493 bytes.
- Zero inbound references anywhere outside their own folder and audit output.
- Commit `876ddf3 "docs: overflow stories compiled to PDF for later use"` confirmed.
- The live pipeline input really is `picks.json`: `scripts/dev/seed-curated-content.ts:91`
  (`PICKS_PATH`) and its header comment at :3.

### root-docs-assets-04 (QR SVGs) - CONFIRMED
- Same evidence as member-surfaces-02. 199,326 bytes exact. `grep -rIn "support-qr" src` = 0.
- Support page's only image is `brand/rishi-valley-mountain-mark-light-200.png`
  (`support-contribute.tsx:217`), confirmed.

### root-docs-assets-07 (tsbuildinfo relocation) - CONFIRMED (one line-number nit)
- `tsconfig.json` has `"incremental": true` at line **23** (finding said 24) and no
  `tsBuildInfoFile` key anywhere.
- `tsconfig.tsbuildinfo` at root, 1,221,099 bytes exact, regenerated today (mtime Aug 25 14:49).
- `.gitignore:53` is `*.tsbuildinfo` - confirmed, so the file is untracked clutter only.
- `scripts/qa/check.mjs:99` runs `npx tsc --noEmit` - confirmed.
- `tsBuildInfoFile` IS a real TypeScript compilerOption (since TS 3.4; emitting buildinfo under
  `--noEmit` with `incremental` has worked since TS 4.0, and this repo is on TS 5.x).
  `node_modules/.cache` is the conventional tool-cache location, already ignored wholesale via
  `/node_modules`; only cost is that a clean `npm ci` wipes the cache so the next type-check is
  a cold one - harmless.

### root-docs-assets-13 (.gitignore dead lines) - CONFIRMED-WITH-CORRECTION
- The disk is clean of every pattern: no `/coverage`, no `/build`, no `.pnp*`, no `.yarn/`, no
  `npm-debug.log*`/`yarn-*.log*`/`.pnpm-debug.log*`, no `*.db`/`*.db-journal` outside
  node_modules. npm repo confirmed (package-lock.json, npm scripts). Substance correct.
- **Line numbers are wrong and one range is dangerous.** At HEAD:
  - Yarn PnP block is **:5-11** (finding said 6-11) - `/.pnp` at :5.
  - `/coverage` at :14 - correct.
  - `/build` is at **:21** (finding said 19; :18 is `/out/`).
  - Debug logs at :27-31, but **:28 is `npm-debug.log*`** - this repo IS npm, so keep :28;
    only :29-31 (`yarn-debug.log*`, `yarn-error.log*`, `.pnpm-debug.log*`) are dead.
  - The "prisma sqlite" block is **:39-43**, NOT :37-40. **Line :37 is `public/uploads/`**, the
    live ignore for the dev filesystem upload driver (proved live: `git check-ignore -v` matches
    it for `public/uploads/2026/03/*.webp`). A fixer deleting ":37-40" by number would expose
    the local uploads dir and the dev-upload files to `git add`. Fix by content, not by number.

### root-docs-assets-14 (.DS_Store sweep) - CONFIRMED
- `find . -name .DS_Store` excluding node_modules/.next*/.pw-browsers: 24 hits, of which 5 are
  inside `.git/` - **19 outside .git, matching the finding's count and its listed locations
  exactly** (public x4, src x4, e2e x2, sanan's stuff x3, plus root, docs, docs/content, prisma,
  .claude, scripts).
- All gitignored (`.gitignore:24`), so local-only.
- `public/images/dev-compare/` exists and is empty (created Aug 23); zero code references.
- `public/uploads/2026/03/` holds two webps, 26,254 + 31,814 = 58,068 bytes, March mtimes,
  gitignored via `.gitignore:37`.

### root-docs-assets-16 (brand masters) - CONFIRMED
- `rishi-valley-mountain-mark-dark-4096.png` = 381,413 bytes exact.
- Only "mountain-mark" reference in src/scripts/e2e/.github is `support-contribute.tsx:217`
  (light-200.png). The four SVGs: 0 references.
- `grep "4096"` in src: only `src/lib/map-cluster.ts` ZOOM_CEILING (unrelated).
- `src/app/lab/logo/` loads no brand files (0 hits for `brand/|mountain-mark`).
- The email mark is a different asset (`src/lib/email-templates.ts:41` hotlinks
  `https://rishivalley.space/images/email/mark.png`) - the finding's "do NOT touch" note is right.
- Commit `d5f1e0c` exists as described.

### root-docs-assets-17 (collection images: verify then thin) - CONFIRMED-WITH-CORRECTION
- gen/: 12 cuid-named SVGs, **19,375 bytes**, zero references (basenames and `collection/gen`
  grepped across src/scripts/e2e/prisma/docs). Commit `e22e795` exists.
- v-series total 1,506,382 bytes - exact match.
- **Correction to the "Where" claim**: the lab rooms do NOT reference all of v1..v6/c1..c6.
  Actual per-basename counts at HEAD (`collection/<n>` across src+scripts+e2e): v1=3, v2=2,
  v3=3, c1=3, c2=2, c3=3, c4=2, and **v4=v5=v6=c5=c6=0** - dead-code-06 is the accurate one.
  The referencing files are `src/app/lab/viewer/page.tsx`, `lab/everything/_findings.ts`
  (prose evidence string), `lab/profiles/_data.ts`, `lab/profiles/_variant-letterhead-{2,3}.tsx`,
  and demo-seed (`content.ts:115` c3/c1 with extension; `seed.ts:313-314` extensionless
  `demo-*` keys). So the "keep lab assets" recommendation covers v1-v3/c1-c4 only; v4-v6/c5-c6
  fall under dead-code-06's delete list.
- The DB caveat (June-era seed may have written `/images/collection/...` into Photo rows)
  cannot be checked from this audit; the finding already makes the SQL query step one of the
  fix, which is the right shape. Repo-side claims verified.

### dead-code-06 (tracked orphan images) - CONFIRMED
- `v4 v5 v6 c5 c6` (+ thumbs): **0 references** in src/scripts/e2e/next.config.ts, checked with
  extension, without extension, and as `collection/<n>` path fragments. All 10 files
  git-tracked; 1,256,176 bytes actual (claim ~1,280KB - close).
- The extensionless trap re-verified: `content.ts:682` documents `file: string; // basename`,
  and the keys at :699+ are all `demo-*`; `seed.ts:313-314` appends `.webp`/`-thumb.webp`.
  `demo-banyan-*`/`demo-assembly-wide` correctly stay.
- QR SVGs and gen/ portions verified above. Brand items correctly deferred to owner.
- Minor: gen/ is 19,375 bytes (the finding's ~48KB was `du` block-size, not bytes).
- The pre-delete SQL against Photo rows is a fix-session gate by the finding's own design;
  nothing here needs a DB to confirm the code-side claim.

### dead-code-07 (untracked junk in public/) - CONFIRMED-WITH-CORRECTION
- **The two WhatsApp jpegs are NOT untracked - they are git-tracked** (added `ba61ac1`).
  The finder's `comm -13 <(git ls-files public|sort) <(find public -type f|sort)` was fooled by
  git's `core.quotePath`: the U+202F in the filenames makes `git ls-files` emit the paths
  C-quoted (`"...7.37.16\342\200\257am.jpeg"`), so the strings never match `find`'s output and
  the two tracked files masquerade as untracked. Deleting them is a `git rm` owner decision -
  that is root-docs-assets-02's finding, and the two findings must not both be executed
  independently ("delete untracked local file" vs "git rm tracked file" are different acts).
- Truly untracked in public/ (8 files): `landing-original.jpeg` (6.2MB - and already explicitly
  gitignored at `.gitignore:58-60` with a keep-locally comment, which the finding did not
  mention), 4 `.DS_Store`, 2 `public/uploads/2026/03/*.webp`, and `public/uploads/.gitkeep`.
- Corrected saving: ~6.3MB local (not ~9MB; the 2.9MB WhatsApp pair moves to rd-02's tracked
  ledger line).
- The proposed gitignore additions are no-ops: `.DS_Store` already at :24, `public/uploads/`
  already at :37. The 72-tracked vs 80-on-disk count is real but two of the eight are the
  quotepath ghosts.
- `landing-original.jpeg` being the raw source of the shipped `landing.jpeg`: consistent with
  the gitignore comment at :58-59 ("Kept locally to re-export from") - note that comment says
  the owner WANTS it kept locally, so "delete" should respect that or ask.

### dead-code-13 (globals.css dead tokens) - CONFIRMED
- Re-grepped every token across ALL of src (lab included), e2e and scripts at HEAD:
  - `--z-base`: 1 hit = its definition at `globals.css:64`. (`z-elevated/z-floating/z-overlay`
    have 13 real uses in src - alive, as stated.)
  - `--space-3xl`: definition only at `:101`.
  - `chart-1..5`: each appears exactly 3x, all inside globals.css (`@theme` bindings :27-31,
    light values :166-170, dark values :326-330). Zero consumers (this also covers Tailwind
    forms like `bg-chart-1` - the grep was substring).
  - `.animate-bell`: definition at :624-627 plus the stale comment sentence at :616; zero
    class writers in any tsx. The hover path is alive: `.bell-trigger:hover svg` at :629 and
    its consumer `src/components/layout/notification-bell.tsx:258`.
  - Every non-globals hit in my greps was a gitignored Playwright trace artifact under
    `e2e/.output/` (a compiled copy of globals.css itself) - not a consumer.
- All claimed line numbers verified exact at HEAD.

## Cross-finding notes for the fixer

1. **Ordering/ownership collision**: dead-code-07 lists the WhatsApp jpegs as local junk;
   root-docs-assets-02 correctly treats them as tracked files needing `git rm` and an owner nod.
   Execute rd-02; strike the WhatsApp line from dc-07.
2. **rd-17 vs dc-06 on the v/c series**: dc-06's counts are the correct ones (v4-v6/c5-c6 are
   referenced by nothing at all, lab included). rd-17's "referenced only by lab rooms" is true
   only for v1-v3/c1-c4.
3. **rd-13 must be fixed by content, not line number** - `.gitignore:37` (`public/uploads/`) is
   live and sits inside the finding's claimed ":37-40" sqlite range; keep `npm-debug.log*` (:28).
4. The one genuinely DB-dependent sub-claim in this cluster (do any live `Photo.url` rows point
   at `/images/collection/...` or the WhatsApp names) is deferred to fix time by the findings
   themselves; every repo-side fact was verified here.
