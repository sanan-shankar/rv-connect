# lib-core-config - refactor audit 2 report

Territory reader for the core infrastructure libraries (the Prisma client and its error
predicates, the whole mail path, the retention sweep, image purging, the Sentry
instrumentation hook) and the entire configuration surface (next.config.ts, tsconfig,
eslint, postcss, vercel.json, package.json, prisma.config.ts, .mcp.json, every GitHub
workflow and Renovate), plus the demo seed data and the four demo scripts.
Date: 2026-09-04. HEAD `72b5a1d`, working tree clean apart from this audit's own folder.
Files in territory: 38. Read fully: 38 (two data files — `demo-seed/content.ts` and
`demo-seed/people.ts` — were read structurally rather than sentence by sentence; see
Coverage).

---

## Coverage

**Read fully:**
`src/lib/prisma.ts` · `src/lib/prisma-errors.ts` · `src/lib/email.ts` ·
`src/lib/email-queue.ts` · `src/lib/email-templates.ts` · `src/lib/mail-policy.ts` ·
`src/lib/verification-mail.ts` · `src/lib/retention.ts` · `src/lib/image-purge.ts` ·
`src/instrumentation.ts` · `src/app/api/retention/sweep/route.ts` ·
`src/app/api/demo/reset/route.ts` · `src/app/api/resend/webhook/route.ts` ·
`src/lib/demo-seed/seed.ts` · `src/lib/demo-seed/places.ts` (header + shape) ·
`src/lib/demo-seed/photos.generated.ts` · `src/lib/demo-seed/content.test.mjs` ·
`scripts/demo/add-photos.mjs` (structure + its generated-file contract) ·
`scripts/demo/apply-schema.mjs` · `scripts/demo/seed-demo.mts` ·
`scripts/demo/verify-guard.mts` · `next.config.ts` · `tsconfig.json` ·
`eslint.config.mjs` · `postcss.config.mjs` · `vercel.json` · `package.json` ·
`prisma.config.ts` · `.mcp.json` · `.github/workflows/check.yml` ·
`.github/workflows/retention.yml` · `.github/workflows/backup.yml` ·
`.github/workflows/snapshot.yml` · `.github/renovate.json` ·
`src/lib/db-pool-rule.test.mjs` · `scripts/qa/ci-parity.test.mjs` ·
`src/lib/prisma-errors.ts`'s test · `scripts/ops/prune.mjs` (pulled in by finding 01).

Specs read: `docs/OPERATIONS.md` (full), `docs/TRAPS.md` (full), `docs/spec/demo.md`
(setup + Collection sections), `docs/SECURITY.md` (retention table, gates, headers),
`node_modules/next/dist/docs/.../authInterrupts.md` and the 16.3.3 upgrade guide,
the audit-1 report §4/§5 and `fix-prompt.md` rows naming `lib-core-config-01/05/07/08`.

**Skimmed, and why:**
- `src/lib/demo-seed/content.ts` (964 lines) and `src/lib/demo-seed/people.ts` (630) are
  invented prose and person records. I read every structural element (both interfaces,
  every exported constant, the section headers, the merge points, ~150 lines of the
  actual content) and confirmed every declared field is consumed by `seed.ts`. I did not
  read all 40 biographies; there is no bloat finding hiding in a bio, and
  `content.test.mjs` already pins referential integrity, duplicate likes, poll votes,
  photo dimensions against the files on disk, and the no-em-dash rule.
- `src/lib/mail-policy.test.mjs`, `src/lib/mail-queue-rule.test.mjs`,
  `src/lib/image-purge-rule.test.mjs`: read their test names and the specific assertions
  that pin things I was proposing to change. Not read line by line — `lib-tests` owns them.

**Not read:** nothing in the charter's list.

**Uncommitted edits seen (someone else's WIP):** none. `git status --short` shows only
this audit's own untracked folder. The `src/components/common/image-viewer.tsx`
modification noted at session start had landed as `72b5a1d` before I began.

---

## Summary

This is the best-maintained territory I could have been handed, and that is the finding
as much as anything else: `email-queue.ts` is 508 code lines under 471 comment lines and
almost every one of those comments carries an incident date, an audit id or an owner
quote. **The structural well for comment trimming here is genuinely dry** — I found
exactly one comment describing code that no longer exists (finding 13) and one block of
prose duplicated out of `docs/OPERATIONS.md` (finding 12). Everything else earns its keep.

The real wins are elsewhere, and the biggest one is not a line count. **A retention
policy the owner decided, and that three documents state as one year, is enforced as
thirty days**, because a bug fix (`d77197a`, audit M55) changed a script's default and
never touched the workflow that overrides it. That leaves a whole step of the nightly
sweep permanently deleting zero rows, and `docs/SECURITY.md`'s retention table saying
something untrue about members' data. That is finding 01.

After that: `email-templates.ts` writes every message twice (HTML and plain text) from
two hand-kept copies of the same sentences, and three of the four have **already drifted**
— about 26 lines and, more importantly, one copy of the words a member reads. The
retention sweep spells out eight identical cutoff deletes that a small table collapses
(~25 lines). The demo photograph pipeline — a 201-line script, a generated file, and a
merge in the seeder — **has never produced a single photograph** and its documented
working directory is the repo root the owner has closed. And `scripts/demo` holds three
hand-written copies of the same `.env` parser, one of which reads `.env` twice.

On the configuration surface specifically: `next.config.ts` is 132 code lines and I would
change five of them. Two CSP entries (`https://*.posthog.com` in `img-src` and
`connect-src`) contradict the comment sitting directly above them. Sentry's wrapper
silently injects `experimental.clientTraceMetadata` to feed a browser SDK this project
deliberately does not have. Three of the five `overrides` are inert against the current
lockfile, and `docs/OPERATIONS.md` still says there is one. Everything else in that file
— the `imageHosts` allowlist, the `isProd` gates, the two body-size limits, the PostHog
rewrite ordering, `authInterrupts` (still experimental on 16.3.3, still required by
`forbidden()`) — is correct, defended, and in several cases pinned by a test.

**Structural vs cheap:** 10 structural findings, 7 cheap. The honest total if every
autonomous item lands is about **−140 lines**, one dead sweep step, three corrected
documents, 2 CSP entries, 2 npm overrides, ~400 bytes off every HTML document, and one
policy that stops existing in two places. Nothing here moves the client bundle: this
territory ships **zero bytes to the browser**.

**What surprised me:** `demo-seed` is 2,122 lines and I fully expected to find it in a
shared server chunk. It is not — the 68 KB chunk that carries it
(`.next/server/chunks/_1e_f587._.js`) is referenced by exactly one file,
`app/api/demo/reset/route.js`. That question is closed with a measurement.

**What audit 1 left that is now moot:** nothing in this territory. Its three
`lib-core-config` rows that were executed (`05` email-queue doc blocks, `07` the cron
secret helper, `08` instrumentation + prisma.config) are all in place and correct; its
one re-refuted row (`01`, tsconfig excluding `src/generated`) I did not retry and name
under Audit-1 carry-overs.

---

## Findings

### lib-core-config-01 - Make the notification retention window one number again; today it is 30 days in fact and one year in three documents

- **Where**: `.github/workflows/snapshot.yml:89-92` · `scripts/ops/prune.mjs:11-23,32-34,59-62`
  · `src/lib/retention.ts:41-42,81,176-180,361` · `docs/SECURITY.md:85` ·
  `docs/OPERATIONS.md:117,153`
- **Phase**: dead (a sweep step that can never delete a row) + hygiene (three documents
  that state a false fact)
- **Tier**: T2     **Class**: structural     **Decides**: owner (the window is his
  decision; the *fix* once he picks a number is autonomous)
- **Evidence**: `d77197a` ("fix(retention): presence telemetry expires…") closed audit
  M55 with this in its body, verbatim:

  > *M55. prune.mjs deleted notifications at 30 days while retention.ts deleted the same
  > table at a year, so the app documented one policy and a script quietly enforced a
  > stricter one. retention.ts is the source of truth now and prune.mjs matches it.*

  `git show --stat d77197a` touches seven files. `.github/workflows/snapshot.yml` is not
  one of them. That workflow still reads:

  ```yaml
  - name: Prune notifications older than 30 days
    run: node scripts/ops/prune.mjs --days 30
  ```

  and `prune.mjs:34` takes `--days` over its own `DEFAULT_DAYS = 365`, whose comment now
  says *"Matches KEEP_DAYS.notifications in src/lib/retention.ts. Change it there."*
  `git log -S"prune.mjs --days 30" -- .github/workflows/snapshot.yml` → `6adb61c`, the
  original 30-day commit, untouched since.

  Consequences, each verified by reading:
  1. `snapshot.yml` runs at 00:10 UTC and deletes every `Notification` with
     `createdAt < now-30d`. `retention.yml` runs at 21:00 UTC and
     `src/lib/retention.ts:176-180` deletes every `Notification` with
     `createdAt < now-365d`. **Nothing older than 30 days survives to reach the second
     one, so that step deletes 0 rows every night, for ever.**
  2. `docs/SECURITY.md:85` — the table headed "Retention (owner, 2026-08-19)" — says
     `| Notifications | 1 year |`. `docs/OPERATIONS.md:117` repeats it
     ("notifications 1y"). `docs/OPERATIONS.md:153` then documents the contradicting
     command without noticing.
  3. `prune.mjs` now contradicts *itself*: its header (lines 11-16) says "ONE policy, not
     two … retention.ts is the source of truth", while lines 59-62 still say *"the owner
     asked for a flat 30 days"* — a comment left over from before the M55 fix.
- **What to do**: this is one decision and then five one-line edits.
  - **If 30 days is the real policy** (which is what has actually been happening since
    `6adb61c`, and what `prune.mjs:59-62` says the owner asked for): set
    `KEEP_DAYS.notifications = 30` in `retention.ts:42`, set `DEFAULT_DAYS = 30` in
    `prune.mjs:33`, drop `--days 30` from `snapshot.yml:92` so the default is the only
    number, change `docs/SECURITY.md:85` to `| Notifications | 30 days |` and
    `docs/OPERATIONS.md:117` to match. Then delete the now-redundant `notifications` step
    from `retention.ts` (lines 176-180, the `notifications` key on `SweepResult:81` and on
    the result object at `:361`, and `KEEP_DAYS.notifications`) — `prune.mjs`'s batched
    5,000-row delete is the better instrument for this table and is the one that runs.
    Net: −12 lines and one policy in one place.
  - **If one year is the real policy**: delete `--days 30` from `snapshot.yml:92` only,
    and fix `docs/OPERATIONS.md:153` and `prune.mjs:59-62`. Then the two jobs agree and
    `retention.ts`'s step starts doing real work for the first time. Warn the owner that
    the Notification table will grow to roughly twelve times its current size, which is
    the arithmetic `prune.mjs:5-9` and `snapshot.yml:85-88` were written to avoid
    (~0.8 KB/row, 2,000 members × 500 apiece ≈ 800 MB against a 500 MB free tier).
  - Either way, delete the contradicting comment at `prune.mjs:59-62`.
- **Saving**: 1 dead sweep step (~10 lines with its type key and result key), 3 documents
  made true, 1 retention policy that stops living in two files. On the 30-day branch also
  ~1 database step per night removed from a 300-second serverless invocation.
- **Risk & gate**: low. Nothing in `npm run check` reads these numbers — I grepped;
  there is no retention-window rule test (see "For other lenses": that gap is itself
  worth closing). `npm run check` must stay green. Before merging, run this against the
  live database so the owner sees what the choice actually costs:
  ```sql
  SELECT count(*) AS total,
         count(*) FILTER (WHERE "createdAt" < now() - interval '30 days')  AS older_than_30,
         count(*) FILTER (WHERE "createdAt" < now() - interval '365 days') AS older_than_365,
         pg_size_pretty(pg_total_relation_size('"Notification"'))          AS on_disk
  FROM "Notification";
  ```
- **Confidence**: high on the mechanism and on all three document contradictions (each
  quoted above from the file). Medium only on which number the owner wants — that is
  why this is his call and not a session's.
- **Notes**: I nearly filed this as a bug rather than a simplification, and it is both.
  The simplification is real and is the point: **one number in one place**. What worries
  me is the shape of the mistake, because it will happen again — a policy constant lives
  in `src/lib/retention.ts`, a second copy lives in `scripts/ops/prune.mjs`, and a third
  effective copy lives in a workflow argument where no test and no typechecker can see
  it. A CLI flag that silently overrides a constant whose comment says "change it there"
  is the trap. If the owner keeps both jobs, the fix session should consider deleting
  `prune.mjs`'s `--days` flag entirely so the constant is the only lever. Related: 03
  (the same file's step table), 17 (the same documents' other stale numbers).

---

### lib-core-config-02 - Build each email's plain-text part from the same words as its HTML, instead of typing them twice

- **Where**: `src/lib/email-templates.ts:66-216` (`shell`, HTML only),
  `:255-263`, `:297-305`, `:335-342`, `:377-386` (the four hand-written `text:` arrays)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: every one of the four templates passes `heading`, `body` and `footnote`
  into `shell()` for the HTML, then re-types the same three sentences into a
  `text: [...].join("\n")` array. That is 36 lines of duplicated prose across four
  functions. **Three of the four have already drifted**, which is the whole argument:

  | Template | HTML says | Plain text says |
  |---|---|---|
  | `resetPasswordTemplate` | "Set a new password for **\<email\>** below." (`:288-292`) | "Set a new password for \<email\> **here**." (`:300`) |
  | `passwordChangedTemplate` | CTA label "This wasn't me" over `/messages` (`:330-331`) | no label at all; a bare URL after a colon (`:340-341`) |
  | `deletionScheduledTemplate` | CTA label "Keep my account" over `/login` (`:372-373`) | no label; a bare URL after a colon (`:382-383`) |
  | `verifyEmailTemplate` | — | in sync, the only one |

  "below" is also simply wrong in the text version's own terms: in plain text the link is
  *below*, and in the HTML it is a button. The two copies have swapped their own words.
- **What to do**: change `shell()` to return `BuiltEmail`'s `html` **and** `text` from one
  set of parts, and delete all four `text:` arrays.
  - Change `shell`'s `body: string` parameter to `body: string[]` — one entry per
    paragraph, in plain prose. `shell` wraps the first in
    `<p style="margin:0;">` and each later one in `<p style="margin:12px 0 0;">`
    (which is exactly what `deletionScheduledTemplate:367-371` writes by hand today),
    running each through the existing `escapeHtml`.
  - `shell` then assembles `text` as: heading, blank, the paragraphs joined by blank
    lines, blank, `ctaLabel` followed by `ctaHref` on the next line, blank, `footnote`.
    That format is a superset of what the four arrays produce today and fixes the two
    missing CTA labels for free.
  - The one thing that does not survive a plain `string[]` body is the `<strong>` around
    the address in `resetPasswordTemplate:290`. Two honest options: drop it (the address
    is already the only proper noun in the sentence) or let `shell` take
    `emphasis?: string` and bold that substring in the HTML half only. I would drop it
    and say so in the commit; the design note at the top of the file is "restraint is the
    whole design here (owner, 2026-08-12)".
  - `subject` stays per-template. `preheader` stays HTML-only (it has no meaning in
    plain text).
- **Saving**: ~26 lines net (−36 arrays, +10 in `shell`), and one copy of every sentence a
  member reads instead of two. Two messages gain the CTA label their plain-text readers
  currently do not get.
- **Risk & gate**: medium — this is member-facing copy in the one surface with no visual
  regression suite. `npm run check` for the types. Then actually look at the output:
  the four templates are pure functions, so
  `node -e` cannot import a `.ts` directly, but a fix session can render them through the
  dev server's mail path with `EMAIL_DEV_SEND=1` + `ADMIN_EMAIL` set (which prints the
  text part to the terminal, `src/lib/email.ts:170-180`) and read all four. For the HTML
  half, save the string to a file and open it. No test reads this file today (I checked:
  no `*.test.mjs` names `email-templates`), which is a gap worth closing in the same
  commit — a test asserting that every template's `text` contains its `ctaHref` and its
  footnote would have caught the two missing labels.
- **Confidence**: high that the duplication and the drift are real (quoted above).
  Medium on the exact line saving; the `<strong>` decision could add 3 lines back.
- **Notes**: I considered and rejected pulling in a React-email library. This file's
  header is a well-argued case for hand-written table HTML with inline styles and Georgia
  standing in for Libre Baskerville — Gmail strips `<style>`, Outlook renders through
  Word — and a dependency would ship a renderer to solve a problem four functions already
  solve. The answer to the charter's question "string templates or React email?" is:
  string templates, correctly, and it should stay that way. Related: 09 (the same file
  hard-codes the canonical origin four times).

---

### lib-core-config-03 - Collapse the retention sweep's eight identical cutoff deletes into one table

- **Where**: `src/lib/retention.ts:166-206` (eight `step(...)` calls), with
  `:32-75` (`KEEP_DAYS`), `:77-99` (`SweepResult`) and `:357-373` (the result object)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: eight consecutive blocks, five lines each, differing only in the model,
  the date column and the `KEEP_DAYS` key:

  ```ts
  const reports = await step("reports", async () =>
    (await prisma.report.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.reports) } },
    })).count,
  );
  ```

  …repeated for `contributions`, `notifications`, `loginAttempts`, `auditLogs`,
  `outboundEmails`, `visits` (the only one on `endedAt` rather than `createdAt`) and
  `searches`. 41 lines counted with `sed -n '166,206p' | wc -l`.
  The three genuinely different steps — `adminMessages` (a transaction that files R2
  purges first), `catchupCopies` (Serializable, batched, promotes a group successor) and
  the account purge — are **not** part of this and must stay exactly as they are.
- **What to do**: declare the eight as data beside `KEEP_DAYS`:

  ```ts
  /** Steps that are nothing but a hard cutoff. Anything needing a transaction,
   *  a batch or a successor hand-off is written out below instead. */
  const CUTOFF_STEPS = [
    { key: "reports",        model: "report",        field: "createdAt", days: KEEP_DAYS.reports },
    …
    { key: "visits",         model: "visit",         field: "endedAt",   days: KEEP_DAYS.presence },
  ] as const;
  ```

  then one loop building `Record<(typeof CUTOFF_STEPS)[number]["key"], number>` and
  spreading it into `result`. `prisma[model]` needs one narrow cast; write it once with a
  comment rather than eight times.
- **Saving**: ~25 lines (41 → ~16) inside one file, with no new import and no new
  docblock — which is why I think it survives audit 1's "deduplication cannot save lines"
  lesson where most dedupe proposals should not.
- **Risk & gate**: low-medium. The risk is the typed `SweepResult`, which the route
  returns as JSON and which `writeAudit` stringifies into `/admin/audit` — the key names
  must not change. `npm run check` (the `as const` table keeps them literal), then read
  one `retention.sweep` audit line after a manual
  **Actions → retention → Run workflow** and confirm the JSON still has all fifteen keys.
  `src/lib/purge-rule.test.mjs` and `src/lib/image-purge-rule.test.mjs` both read source
  text — a fix session must check neither greps for a literal `prisma.report.deleteMany`
  before rewriting (I did not find such a grep, but confirm).
- **Confidence**: high on the duplication; medium on the saving surviving the cast and
  the comment the house style will want on it.
- **Notes**: be honest with the owner about what this buys. Adding a ninth expiring table
  today means edits in five places (`KEEP_DAYS`, `SweepResult`, the step, the result
  object, `docs/SECURITY.md`); after this it means three. That is better, not
  transformative. The lines are the real win. Related: 01 — if the owner picks 30 days
  there, `notifications` leaves this table before it is written.

---

### lib-core-config-04 - Decide the fate of the demo photograph pipeline: it has never produced a photograph, and its working folder lives in the closed repo root

- **Where**: `scripts/demo/add-photos.mjs` (201 lines) ·
  `src/lib/demo-seed/photos.generated.ts` (15 lines, `GENERATED_PHOTOS: DemoPhoto[] = []`) ·
  `src/lib/demo-seed/seed.ts:39,313` (the import and the merge) ·
  `docs/spec/demo.md:130-154` · `.gitignore:76`
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**:
  - `git log --follow -- src/lib/demo-seed/photos.generated.ts` returns exactly one
    commit, `0ea3174` ("feat(demo): a public, no-login showcase build of the site"), and
    `git log -p --follow` on that path contains **zero** added lines matching `url:`. The
    array has been `[]` from the day it was created and has never held a photograph.
  - `demo-photos/` does not exist (`ls -d demo-photos` → no such directory) and is
    gitignored at `.gitignore:76`.
  - `docs/spec/demo.md:137` instructs: *"put images in `demo-photos/` at the repo
    root"*. `CLAUDE.md` says the repo root is closed, and says specifically that a script
    that stays *"goes in `scripts/dev/` or `scripts/qa/` with its working folder BESIDE
    it, never above it"*. The spec and the hard rule contradict each other, and the spec
    is the older of the two.
  - `seed.ts:313` is `const allPhotos = [...GENERATED_PHOTOS, ...DEMO_PHOTOS];` — a spread
    of an empty array on every reset since the demo shipped.
- **What to do**: three options, and this is the owner's to pick.
  1. **Keep it and move its folder** (my recommendation). The capability is one command
     away from being useful and `docs/spec/demo.md:132` calls the Collection "the one
     surface still waiting on you" — this is the door he walks through when he has the
     photographs. Cost: change `scripts/demo/add-photos.mjs:31` and its sibling path
     constant to read from `scripts/demo/demo-photos/`, update `docs/spec/demo.md:137,141`
     and `.gitignore:76`. ~6 edited lines, and the repo root stops being the documented
     home for a pile of JPEGs.
  2. **Keep it exactly as it is.** Cost: the root rule stays contradicted by a spec, and
     a future session cleaning the root will delete a folder the owner is mid-way through
     filling.
  3. **Delete it.** −201 lines of script, −15 lines of generated file, −2 lines in
     `seed.ts`, −25 lines of spec. But it deletes the one path by which the demo's
     Collection ever stops being six crops of one banyan tree, and it is not a path
     anything else replaces. I do not recommend this.
- **Saving**: option 1 saves 0 lines and closes a rule conflict. Option 3 saves ~218
  lines and 1 gitignore entry, at the cost of a capability.
- **Risk & gate**: low either way. `npm run check` (the scripts ledger gate,
  `scripts/qa/scripts-ledger.test.mjs`, requires every script to be listed in
  `scripts/README.md` — a delete must remove that row, a move must update it). Option 3
  additionally needs `src/lib/demo-seed/content.test.mjs` re-read: it imports
  `DEMO_PHOTOS` and checks recorded dimensions against files on disk, and does not touch
  `GENERATED_PHOTOS`, so it stays green.
- **Confidence**: high on every fact; the recommendation is a judgement.
- **Notes**: what makes this an owner call rather than a cut is that "never used" here
  means "never used **yet**", and the file itself says so
  (`photos.generated.ts:7-8`: *"Empty means the Collection falls back to the six banyan
  framings in content.ts"*). The rule that is genuinely being broken today is the root
  one, and option 1 fixes that without touching the capability. Related: the `root-assets`
  lens should know `demo-photos/` is a root-bound path that exists only in documentation.

---

### lib-core-config-05 - One `.env` reader for `scripts/demo`, instead of three copies, one of which reads `.env` twice

- **Where**: `scripts/demo/apply-schema.mjs:33-46` (`readEnvDemo`) ·
  `scripts/demo/seed-demo.mts:27-43` (`loadEnvFile`) ·
  `scripts/demo/verify-guard.mts:19-28` (inline, no function)
- **Phase**: dedupe + hygiene
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: all three carry the identical parse loop, character for character in the
  regex and the quote strip:
  ```js
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  ```
  Each then does something slightly different with the result (returns an object, sets
  `process.env` directly, or merges with first-wins semantics), which is the drift a
  shared reader removes.

  And a copy-paste artefact inside one of them: `scripts/demo/seed-demo.mts:47` reads

  ```ts
  const mainEnv = loadEnvFile([".env", ".env"]);
  ```

  `.env` is listed twice. It is harmless because `loadEnvFile` takes the first value it
  sees for each key, but it is a leftover from when the second entry was `.env.local`,
  folded into `.env` on 2026-08-08 (`prisma.config.ts:4-15` records that fold). The line
  now reads as if two files matter when one does.
- **What to do**: add `scripts/demo/env.mjs` (a `.mjs` so all three, `.mjs` and `.mts`
  alike, can import it without a build step) exporting one function:
  ```js
  /** Read a KEY=value file into a plain object. Not dotenv: these three scripts
   *  run before anything may construct a Prisma client, and the point of the
   *  demo scripts is that nothing else is on the path (see apply-schema.mjs). */
  export function readEnvFile(path) { … }
  ```
  Then: `apply-schema.mjs` calls `readEnvFile(".env.demo")`; `verify-guard.mts` calls it
  and assigns into `process.env` (2 lines instead of 9); `seed-demo.mts` keeps its
  first-wins merge over a list but builds it from `readEnvFile`, and its call becomes
  `loadEnvFile([".env"])`.
- **Saving**: ~25 lines net across three files, one parser instead of three, and one
  duplicate array entry gone.
- **Risk & gate**: low, but note that **these scripts cannot be run to verify** (audit
  rules forbid it, and two of them delete every row in the database they connect to).
  The gate is `npm run check` plus reading the diff carefully: the safety assertions in
  all three (`DEMO_MODE=1`, the project-ref match, the "differs from `.env`" check, the
  zero-tables check) must be untouched — they are the only thing between a re-seed and a
  production wipe. The new file needs a row in `scripts/README.md` or
  `scripts/qa/scripts-ledger.test.mjs` fails; check whether that gate treats a non-entry
  helper module differently before adding it.
- **Confidence**: high.
- **Notes**: `jscpd` did **not** flag this (I grepped `raw/jscpd.txt` for `scripts/demo`
  and got nothing) — probably because the blocks are under its token floor and `.mts` may
  not be in its extension list. That is worth knowing generally: the clone report is a
  floor, not a ceiling. Two small doc-drift items ride along in the same commit:
  `scripts/demo/seed-demo.mts:5` and `src/lib/demo-seed/seed.ts:6` both call the file
  `scripts/demo/seed-demo.ts`, and it is `.mts` — `docs/spec/demo.md:82-84` even explains
  *why* it has to be `.mts`, so the two comments contradict a spec that is right.

---

### lib-core-config-06 - Delete Sentry's injected `clientTraceMetadata`, which stamps two meta tags on every page for a browser SDK this project does not have

- **Where**: `next.config.ts:337-386` (the `withSentryConfig` call) ·
  `src/instrumentation.ts:10-17` (the deliberate no-browser-SDK decision) ·
  `raw/build.txt:4-9` (the experiments the build prints)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (with a measurement first)
- **Evidence**: the production build log lists five experiments:
  ```
  - Experiments (use with caution):
    ✓ authInterrupts
    · clientTraceMetadata
    · optimizePackageImports
    · proxyClientMaxBodySize: "25mb"
    · serverActions
  ```
  `clientTraceMetadata` appears in **no** line of `next.config.ts`. It is injected by the
  Sentry wrapper — `node_modules/@sentry/nextjs/build/cjs/config/withSentryConfig/getFinalConfigObjectUtils.js:88-95`:
  ```js
  if (major >= 15 || (major === 14 && minor >= 3)) {
    incomingUserNextConfigObject.experimental.clientTraceMetadata = [
      "baggage", "sentry-trace",
      ...incomingUserNextConfigObject.experimental?.clientTraceMetadata || []
    ];
  }
  ```
  and the SDK's own fallback message two lines below says what it is for: *"please add
  `experimental.clientTraceMetadata: ['sentry-trace','baggage']` to your Next.js config
  **to enable pageload tracing for App Router**"* — i.e. so the **browser** SDK can pick
  the server's trace up out of the HTML and continue it.

  There is no browser SDK here, on purpose and twice over.
  `src/instrumentation.ts:11-17`: *"WHAT IT DOES NOT COVER, deliberately: there is no
  browser SDK here… Adding it costs ~30KB gzipped on every page load."*
  `next.config.ts:370-372`: *"No browser SDK is initialised (server-only)."*
  `docs/OPERATIONS.md` §3 says the same again. So Next renders
  `<meta name="sentry-trace">` and `<meta name="baggage">` into every server-rendered
  document for a reader that does not exist. The `baggage` value carries environment,
  release, public key, trace id, sample rate and transaction name — call it 400-500 bytes
  of HTML per document, uncompressed, on every one of the 105 routes.
- **What to do**: the wrapper spreads the user value **after** its own two, so setting
  `experimental.clientTraceMetadata: []` in `nextConfig` does not remove them. Strip it
  from the returned object instead:
  ```ts
  const withSentry = withSentryConfig(nextConfig, { … });
  /* The Sentry wrapper adds experimental.clientTraceMetadata = ['baggage',
     'sentry-trace'] unconditionally, so a BROWSER SDK can continue the server's
     trace out of two <meta> tags in the HTML. There is no browser SDK here (see
     src/instrumentation.ts) so nothing ever reads them; every document paid ~450
     bytes for a reader that does not exist. Removed after the wrapper runs,
     because the wrapper spreads our value after its own and cannot be told no.
     If a browser SDK is ever added, DELETE THIS BLOCK first. */
  delete withSentry.experimental?.clientTraceMetadata;
  export default withSentry;
  ```
- **Saving**: ~450 bytes of HTML on every server-rendered response (105 routes), plus
  whatever propagation work Next does to populate them. Not a bundle saving — HTML, on
  every navigation that fetches a document.
- **Risk & gate**: low, but **measure before and after** rather than trusting my
  arithmetic. Build to a scratch worktree exactly as `raw/build.txt` was produced, start
  it, and:
  ```
  curl -s http://localhost:3000/login | grep -o '<meta name="\(sentry-trace\|baggage\)"[^>]*>'
  ```
  If that returns nothing at HEAD, this finding is void and should be closed as a
  not-finding with the curl output recorded. If it returns two tags, measure their byte
  length, make the change, and confirm they are gone and the build's experiment list
  drops to four. Then `npm run check`, and confirm a deliberate server error still lands
  in Sentry (the point of the whole hook) — the wrapper's other options
  (`sourcemaps`, `release`, `widenClientFileUpload`, `webpack.treeshake`) must be
  untouched; three of them carry owner decisions in their comments.
- **Confidence**: medium. High that the wrapper injects it and high that no browser SDK
  reads it; medium that Next actually emits the meta tags on every response rather than
  only on sampled traces — I could not verify that without running a server, and all 105
  routes in this build are `ƒ` (dynamic), so there was no prerendered HTML on disk to
  grep. The curl above settles it in ten seconds.
- **Notes**: this is the third Sentry-wrapper item an audit has looked at and the first
  one I would act on. Audit 1's `bundle-build-06` (`runAfterProductionCompile`) was
  re-refuted on magnitude with six measured builds — do not confuse the two; that hook
  costs ~1 s of build and strips Sentry's debug logging, and it stays. This is a
  different option, costs nothing to remove, and its own vendor documentation states the
  precondition this project deliberately does not meet.

---

### lib-core-config-07 - Remove `https://*.posthog.com` from `img-src` and `connect-src`; the comment directly above says it is not needed

- **Where**: `next.config.ts:92` (`img-src`), `next.config.ts:121` (`connect-src`),
  against the directive-block comment at `next.config.ts:62-67`
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (after one browser check)
- **Evidence**: the comment governing the whole `csp` object says, in the file's own
  words at `:65-67`:

  > *PostHog is same-origin (proxied through /ingest, next.config rewrites) so it
  > needs no host here; Sentry is server-only (no browser SDK), so it needs none either.*

  It then lists `"https://*.posthog.com"` in `img-src` (`:92`) and again in `connect-src`
  (`:121`). The premise is correct and verifiable:
  `src/components/analytics/posthog-client.ts:71` sets `api_host: "/ingest"`, and
  `:74` sets `ui_host: "https://eu.posthog.com"` with the comment *"Where the 'view in
  PostHog' links point. Must be the real host: it is a UI concern, not a request path."*
  The three rewrites at `next.config.ts:287-298` map `/ingest/static/*` and `/ingest/*`
  onto `eu-assets.i.posthog.com` and `eu.i.posthog.com` server-side, and
  `src/proxy.ts:126-130` strips the cookie on the way through — so the browser never
  names a `posthog.com` host. No PostHog image is loaded anywhere:
  `grep -rn "posthog" src` finds no `<img>` and no URL outside those two files.
- **What to do**: delete `next.config.ts:92` and `next.config.ts:121`. Two lines. Leave
  every other host: I checked each and they are all live —
  `challenges.cloudflare.com` (Turnstile widget + its iframe),
  `checkout.razorpay.com` (loaded by `src/components/support/support-contribute.tsx:81`),
  `api.razorpay.com` and `*.razorpay.com`, `i.scdn.co` (Spotify album art on Catch-up
  song attachments, `src/components/catchups/answer/song-attachment.tsx`),
  `*.r2.cloudflarestorage.com` (the presigned direct PUT — `docs/TRAPS.md` has a whole
  paragraph on what happens without it), and the `imageHosts` entries.
- **Saving**: 2 CSP entries; the header shipped on every response gets ~50 bytes shorter.
  The real value is that the file stops contradicting itself: a reader who trusts the
  comment and a reader who trusts the list currently learn different things.
- **Risk & gate**: low blast radius, but the failure mode is silent, so verify properly.
  `npm run check` first — `src/lib/security-regressions.test.mjs:139-149` audits this
  object for wildcard hosts and must stay green (note it already tolerates
  `*.posthog.com` today, so removing an entry cannot break it). Then, before merging,
  load a page with the browser console open and confirm no
  `Refused to connect to 'https://…posthog.com'` line appears — the most likely thing to
  disprove this is one of posthog-js's optional bundles (remote config, surveys, the
  toolbar) reaching a host directly rather than through `api_host`.
  `npm run verify:crawl` captures console errors across every route and is the cheap
  sweep for exactly that.
- **Confidence**: medium-high. The mechanism is certain; what I cannot rule out without a
  browser is one posthog-js feature ignoring `api_host`. If the console shows a
  violation, the correct outcome is not to re-add the host but to fix the **comment**,
  which is currently the thing that is wrong.
- **Notes**: I looked hard for a CSP entry duplicated out of `src/proxy.ts`'s path lists,
  because the charter asked. There is none — the CSP names hosts, the proxy names paths,
  and they have no overlap. The one thing genuinely shared between the two files is the
  canonical origin, which is finding 09.

---

### lib-core-config-08 - Retire the npm `overrides` that no longer override anything, and correct the doc that says there is one

- **Where**: `package.json:25-31` (five entries) · `docs/OPERATIONS.md` §4, the paragraph
  beginning *"One `overrides` entry lives in `package.json`"*
- **Phase**: dead + hygiene
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: I read `package-lock.json` for the resolved version of each override and
  for every declared range that asks for it:

  | Override | Pinned to | Who asks, and for what | Still doing work? |
  |---|---|---|---|
  | `deepmerge-ts` | `^8.0.2` (lock: 8.0.2) | `@prisma/config` → **exact `7.1.5`** | **Yes.** Without it npm resolves 7.1.5, which is the version carrying GHSA-ggr8-5vv4-36mx. Documented in OPERATIONS §4. |
  | `mysql2` | `^3.24.3` (lock: 3.24.3) | `prisma` → **exact `3.15.3`** | **Yes**, by the same mechanism. |
  | `browserslist` | `^4.28.8` (lock: 4.28.8) | `@babel/helper-compilation-targets` `^4.24.0`, `shadcn` `^4.26.2`, `webpack` `^4.28.1`, `update-browserslist-db` (peer) `>=4.21.0` | **Probably not.** Every declared range is a caret inside major 4, so a fresh resolution already picks the newest 4.x, which is ≥ 4.28.8. |
  | `postcss-selector-parser` | `^7.1.5` (lock: 7.1.5) | `shadcn` `^7.1.0` | **Probably not**, same reasoning. |
  | `fast-uri` | `^3.1.7` (lock: 3.1.7) | four copies of `ajv`, all `^3.0.1` | **Probably not**, same reasoning. |

  The pattern is clear: the two that matter override a **pinned exact** version; the
  three that probably do not were caret ranges that a plain `npm update` would have
  raised. `a13a8a9` ("build(deps): close four fast-uri advisories with an override") is
  the most recent of them.

  Separately, `docs/OPERATIONS.md` §4 has drifted badly: it opens *"One `overrides` entry
  lives in `package.json`, and it is not permanent"* and describes only `deepmerge-ts`.
  There are five, and it names one.
- **What to do**: two independent pieces, and I would do the doc one regardless.
  1. **The doc, unconditionally**: rewrite that OPERATIONS §4 paragraph as a five-row
     table — override, advisory it closed, the parent that pins it, and the condition
     under which it can be deleted. That paragraph's own closing sentence is the
     argument: *"an override that outlives its reason is a pin nobody remembers making."*
     It has already happened four times over.
  2. **The three inert entries**: remove `browserslist`, `postcss-selector-parser` and
     `fast-uri` from `overrides`, then **regenerate and diff the lockfile** —
     `npm install --package-lock-only` followed by
     `git diff --stat package-lock.json`. If no resolved version moves, they were inert
     and the removal is free. If any moves down, put that one back with a comment saying
     what it holds up. Then `npm run check`, whose
     `scripts/qa/npm-audit-gate.mjs` gate is the one that would go red if an advisory
     re-opened — that gate, not my reasoning, is the arbiter.
- **Saving**: up to 3 npm `overrides` (of 5), and one operations document that stops
  describing a configuration that has not existed for weeks.
- **Risk & gate**: low, but it is the one finding in this report where the verification
  MUST run before the change is believed. `npm run check` runs both security gates
  (`npm-audit-gate.mjs` and `audit-status.mjs`) inside `check.mjs` by design — see
  `scripts/qa/ci-parity.test.mjs`, which fails the build if anyone moves them back into
  CI. A green `npm run check` after the lock is regenerated is the whole proof.
- **Confidence**: high on `deepmerge-ts` and `mysql2` still being load-bearing (an exact
  pin in the parent is unambiguous). Medium on the other three: caret ranges are resolved
  at install time and I could not run npm to prove the counterfactual. The lockfile diff
  above settles it definitively and costs one command.
- **Notes**: for the `dependency-diet` lens — `mysql2` is a transitive dependency of the
  **Prisma CLI**, and this project is Postgres-only, so the advisory it closes is
  unreachable code that never loads. Worth knowing that the override exists to satisfy a
  scanner, not to fix an exposure. And `@prisma/client` shows in
  `raw/knip-repo-config.txt` as an unused dependency, which is that lens's to explain
  (the generated client is emitted to `src/generated/prisma`).

---

### lib-core-config-09 - Give the canonical origin one home; it is a string literal in seven places

- **Where**: `src/proxy.ts:9` (`CANONICAL_ORIGIN`) · `src/lib/email.ts:59` ·
  `src/lib/email-templates.ts:41,206,321,373,383`
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "rishivalley\.space" src` returns seven load-bearing literals
  (the rest are prose in comments and policy pages):
  ```
  src/proxy.ts:9             const CANONICAL_ORIGIN = "https://rishivalley.space";
  src/lib/email.ts:59        (reallySending ? "https://rishivalley.space" : "http://localhost:3000")
  src/lib/email-templates.ts:41   const MARK_SRC = "https://rishivalley.space/images/email/mark.png";
  src/lib/email-templates.ts:206  <a href="https://rishivalley.space" …>rishivalley.space</a>
  src/lib/email-templates.ts:321  const reach = "https://rishivalley.space/messages";
  src/lib/email-templates.ts:373  ctaHref: "https://rishivalley.space/login",
  src/lib/email-templates.ts:383  "https://rishivalley.space/login",
  ```
  `src/lib/email.ts:44` already knows about the duplication and documents it rather than
  removing it: *"Same constant as CANONICAL_ORIGIN in src/proxy.ts."* The `.github`
  workflows add an eighth (`retention.yml:52` curls the literal URL).

  This project has already paid for exactly this shape once. `docs/TRAPS.md`:
  *"Moving the public image host is FIVE changes, not one"* — and the owner's own memory
  note reads "moving a host is 5 changes, not 1". A second domain is a second five.
- **What to do**: add `src/lib/origin.ts` — one exported constant, **no imports at all**,
  so `src/proxy.ts` can use it. That constraint is the reason this has not been done:
  `src/proxy.ts:28-29` says it cannot import `DEMO_CLOSED_PATHS` from `src/lib/demo.ts`
  *"because proxy is bundled for the edge runtime"*, and a reader could reasonably
  generalise that to "proxy imports nothing from lib". It is not the general rule — the
  problem is `demo.ts`'s own dependencies, not the directory. A bare
  `export const CANONICAL_ORIGIN = "https://rishivalley.space";` has no runtime
  dependencies and is edge-safe.
  Then: `proxy.ts` imports it; `email.ts:59` uses it; the four
  `email-templates.ts` sites become `` `${CANONICAL_ORIGIN}/login` `` etc.
  Keep `email-templates.ts:41`'s comment explaining *why* the mark is the production URL
  and never `appUrl()` — the reason (a localhost `src` renders as a broken image in a real
  inbox) survives the change and is the most valuable sentence in that file.
- **Saving**: 0 lines — this will cost 2 or 3 once the import lines are counted. What it
  buys is one place instead of seven, and the fix session should say so honestly in the
  commit rather than dressing it as a reduction.
- **Risk & gate**: low. `npm run check` — and specifically confirm
  `src/lib/proxy-rule.test.mjs` and `src/lib/security-regressions.test.mjs` do not grep
  `proxy.ts` for the literal string (I did not find such an assertion, but a rule test
  reading source as text is this repo's idiom and I would check before trusting me).
  `src/lib/origin-rule.test.mjs` is about a different thing (cross-site origin checking)
  and is unaffected; do not confuse the two names.
- **Confidence**: high on the count and on the edge-safety argument; medium on whether
  the owner wants a fifth tiny lib file. If not, the fallback is to import
  `email-templates.ts`'s four sites from `email.ts` and leave `proxy.ts` alone — that is
  still 7 → 3.
- **Notes**: this is exactly the kind of finding audit 1's close-out warned about
  ("deduplication cannot save lines"), and I am filing it anyway because the cost of
  being wrong here is a member clicking a dead link in an email, which is the one place
  in this app with no undo. Related: 02 (the same file, the same four templates).

---

### lib-core-config-10 - Give `/api/demo/reset` the pool bounds and the duration ceiling its two sibling cron routes already have

- **Where**: `src/app/api/demo/reset/route.ts:45-59` (`runReset`) and the absence of a
  `maxDuration` export · compare `src/lib/prisma.ts:18-61`,
  `src/app/api/retention/sweep/route.ts:23-42`, `src/app/api/catchups/tick/route.ts:31`
- **Phase**: architecture (a consistency gap, not dead code)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: two separate asymmetries in one 15-line function.

  1. **The pool.** `runReset` builds its own client:
     ```ts
     const prisma = new PrismaClient({
       adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
     });
     ```
     That is precisely the *"bare `new PrismaPg({ connectionString })`"* that
     `src/lib/prisma.ts:18-25` describes as dangerous — *"max 10 connections PER
     INSTANCE, and no checkout timeout at all — a checkout with no free connection waits
     forever (pg-pool index.js:205)"* — and that `src/lib/db-pool-rule.test.mjs` exists to
     stop anyone reintroducing. The rule test reads only `src/lib/prisma.ts`, so this
     second construction site is invisible to it.
  2. **The ceiling.** `seed.ts:76` runs the whole rewrite in one transaction with
     `timeout: 30_000` and `maxWait: 10_000`, so a slow reset can legitimately take
     40 seconds before it even counts rows. `retention/sweep` declares
     `maxDuration = 300` and `catchups/tick` declares `maxDuration = 120`, both added by
     audit C-079 whose stated reason applies word for word here: *"a sweep cut off
     part-way is not a disaster … but it is a silent one: the invocation dies without
     reaching the `reportSwallowed`."* `/api/demo/reset` — the third cron, in the same
     `vercel.json` — declares nothing and runs on the platform default.
- **What to do**:
  1. Give the throwaway client the same bounds the singleton has, with a one-line comment
     pointing at `src/lib/prisma.ts` for the reasoning rather than repeating it:
     `max: 5, connectionTimeoutMillis: 5_000, query_timeout: 20_000`. Keep it a
     per-call unextended client — the comment at `:46-50` explaining why it must not be
     the guarded singleton is correct and should not be touched.
  2. Add `export const maxDuration = 120;` beside the existing
     `export const dynamic` (or in its place — see finding 15), with a comment naming the
     40-second worst case from `seed.ts`.
  3. Widen `src/lib/db-pool-rule.test.mjs` so it sweeps **every** `new PrismaPg(` in
     `src/`, not just `src/lib/prisma.ts`. That is the change that stops this recurring.
     Audit 1's fix sessions recorded that *"widening a pin is not free"* and that every
     widened pin there was mutation-tested afterwards; do the same here — break the demo
     route's config on purpose and confirm the test goes red.
- **Saving**: 0 lines (this adds ~6). It is filed as structural because it removes a
  place where a documented invariant is not enforced, and because widening the pin is
  the only version of this that stays fixed.
- **Risk & gate**: low. `npm run check` with the widened rule test, mutation-tested.
  Cannot be exercised end to end without the demo database, which is out of bounds for
  this audit and should be out of bounds for the fix session too — the demo reset is
  verified by the nightly cron reporting 200, which is what
  `src/app/api/demo/reset/route.ts:87-91` was written to guarantee.
- **Confidence**: high on the pool asymmetry (both constructions quoted). Medium on the
  `maxDuration` half — I do not know the demo Vercel project's plan default, and if it is
  60 s the 40 s worst case fits with 20 s to spare. Worth adding anyway for the same
  reason C-079 gave: the failure is silent.
- **Notes**: I want to be clear about blast radius, because it is small. This client only
  ever runs on the demo deployment (`if (!IS_DEMO) return 404 / a 200 no-op`), against a
  database of invented people, once a night plus whenever a visitor presses the button
  behind a 20-second throttle. Nobody is going to be hurt by it. The reason it is worth
  fixing is the one `src/lib/db-pool-rule.test.mjs`'s own header gives: it is a tripwire
  for *"somebody simplif[ying] the config back to a bare connection string"*, and there
  is a bare connection string in the tree that it cannot see.

---

### lib-core-config-11 - Replace the Resend webhook's four-deep nested ternary with a lookup

- **Where**: `src/app/api/resend/webhook/route.ts:103-137`
- **Phase**: hygiene (simplification pass, §5d "no nested ternaries")
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: one expression, 35 lines, four levels deep, with three multi-line comment
  blocks living **inside** the conditional arms:
  ```ts
  const patch: Record<string, unknown> | null =
    event.type === "email.delivered"
      ? { deliveredAt: now }
      : event.type === "email.bounced"
        ? { … }
        : event.type === "email.complained"
          ? { … }
          : event.type === "email.delivery_delayed"
            ? { lastError: "delivery delayed by the receiving server" }
            : null;
  ```
  The bounce arm also computes
  `event.data?.bounce?.subType ?? event.data?.bounce?.type ?? "unknown"` twice, at `:115`
  and again inside the `lastError` template at `:126`.
- **What to do**: a `switch` on `event.type` inside a small named function —
  `function patchFor(event: ResendEvent, now: Date): Record<string, unknown> | null` —
  with `default: return null`. Hoist the bounce-kind expression to one
  `const kind = …` at the top of its case. The three comment blocks move with their
  cases unchanged; every one of them carries a real reason (why `status: "failed"` rather
  than a sixth status, why hard-vs-soft is kept raw, why `lastError` is written) and none
  of them is bloat.
- **Saving**: ~4 lines, one repeated expression removed, and a 35-line expression becomes
  five short branches. Call it clarity: this is the cheapest finding in the report and
  should not be anybody's headline.
- **Risk & gate**: low. `npm run check`. No test reads this route's source that I could
  find; `src/lib/mail-queue-rule.test.mjs` covers the queue, not the webhook. The
  behaviour is exercised only by real Resend traffic, so keep the four event names and
  the four patch shapes byte-identical and the diff will be obviously safe on inspection.
- **Confidence**: high.
- **Notes**: everything else in this file is good and should be left alone — the hand-
  rolled Svix verification (one HMAC and a replay window, argued at `:23-25` as cheaper
  than adding the `svix` package: correct), `request.text()` before `JSON.parse` so the
  signature covers the exact bytes, the `after()` retry loop for the
  webhook-beats-the-write race (audit Low 90), and the deliberate 400-not-401 so Svix
  does not retry an unauthenticatable body. This is a well-built file with one ugly
  expression in it.

---

### lib-core-config-12 - Delete the `npm run analyze` essay from `next.config.ts`; it is already in `docs/OPERATIONS.md` §5

- **Where**: `next.config.ts:322-332` · `docs/OPERATIONS.md` §5 ("Bundle analyzer")
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: eleven lines of free-floating comment sitting between the config object
  and the `withSentryConfig` call, explaining a **package.json script** that
  `next.config.ts` does not define, does not run and does not mention. Same content, same
  three arguments (Next's own analyzer not `@next/bundle-analyzer`; the wrapper is
  webpack-only and printed "no report will be generated" for as long as it was installed;
  the `optimizePackageImports` bet has never been confirmed), already in
  `docs/OPERATIONS.md` §5 in more detail and with the date.
- **What to do**: delete `next.config.ts:322-332`. If anything is worth keeping in the
  code, it is one clause on the `optimizePackageImports` line itself — the existing
  comment at `:226-228` already says what that option does; append "…a bet `npm run
  analyze` can confirm (docs/OPERATIONS.md §5)" to it, which is one line instead of eleven
  and sits where a reader would look for it.
- **Saving**: 11 lines, and `next.config.ts`'s comment-to-code ratio moves from 1.81
  (239/132, `raw/comment-density.txt`) to ~1.73.
- **Risk & gate**: low. `npm run check`. `scripts/qa/audit-status.mjs:222` reads
  `next.config.ts` looking for `headers(`, far from this block.
- **Confidence**: high.
- **Notes**: this is precisely the class audit 1 named — *"a comment describing deleted
  code or restating the next line"* — with a twist: it restates a **document**. The rest
  of `next.config.ts`'s 239 comment lines are the opposite and must not be touched by a
  session that reads "1.81 ratio" and reaches for a machete. The `imageHosts` block
  (`:9-26`) records the C-134 attack it prevents; the `upgrade-insecure-requests` gate
  (`:129-137`) records the Safari incident that cost a session; the `Connection: close`
  header (`:211-222`) records a measurement made on this server. Those are the product.

---

### lib-core-config-13 - Delete the comment at the end of `email.ts` that explains an export removed in audit 1

- **Where**: `src/lib/email.ts:250-253`
- **Phase**: hygiene (a comment describing deleted code — the one clear case in this territory)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the file ends with four lines that explain something that is no longer there:
  ```
  // Re-exported so server callers can reach it from the module they already
  // import. The implementation lives in its own dependency-free file because the
  // client needs it too, and importing this module into a client component would
  // drag the Resend SDK into the browser bundle.
  ```
  There is no re-export. `git log -S 'export { maskEmail }' -- src/lib/email.ts` returns
  two commits: `fa99bd2` added `export { maskEmail } from "./mask-email";` as the last
  line of the file, and `e23e80c` — **"refactor(lib): remove dead exports the audit
  proved unreferenced"**, from audit 1's own fix campaign — removed the statement and
  left its comment behind.
- **What to do**: delete lines 250-253. `maskEmail` is still imported normally at
  `email.ts:3` and used at `:159`, so nothing else changes.
- **Saving**: 4 lines, and one fewer sentence that is false.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high — the commit that orphaned it is named and its subject line says
  what it was doing.
- **Notes**: worth a sentence in the fix commit, because it is a small lesson with a wide
  application: a deletion pass that greps for symbols will strip the code and leave the
  prose, and the prose is what the next reader believes. Any future "remove dead exports"
  session should look at the lines immediately above and below each deletion.

---

### lib-core-config-14 - Remove the `lint` script nothing runs, or make it the thing that runs

- **Where**: `package.json:9` (`"lint": "eslint"`) · `scripts/qa/check.mjs:109`
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `scripts/qa/check.mjs:109` runs ESLint directly —
  `const { code, out } = await run("npx", ["eslint", "src"]);` — not through the npm
  script. `grep -rn "npm run lint"` across `docs/`, `scripts/`, `.github/` and `.claude/`
  finds it only inside `.claude/_disabled-gsd/`, which is disabled third-party template
  text. `CLAUDE.md` documents `npm run check -- lint` (a **gate name** inside `check.mjs`),
  which is a different thing and is easy to mistake for this.
- **What to do**: pick one.
  - **Delete `package.json:9`.** One line, and the only lint entry point becomes the
    gate everybody actually uses.
  - **Or keep it and make the gate use it** (`run("npm", ["run", "lint"])`), which has a
    small side benefit: the bare `eslint` script lints the whole project where
    `check.mjs` lints `src` only, so `e2e/`, `scripts/` and the root config files are
    currently unlinted.
  I lean to deleting: the second option widens what the gate covers, which is a real
  change with real new warnings and belongs to whoever owns the gate, not to a config
  cleanup.
- **Saving**: 1 line.
- **Risk & gate**: low. `npm run check`. Confirm no `.claude/skills/*/SKILL.md` tells a
  session to run `npm run lint` (I checked `check/SKILL.md`; it does not).
- **Confidence**: high.
- **Notes**: every other script in the block is live and referenced —
  `dev`, `build`, `start`, `check`, `postinstall` (Prisma generate, which `check.yml:36`
  supplies a placeholder `DATABASE_URL` for), `screenshot`, `screenshot:auth`,
  `verify:shot`, `verify:crawl` (all four in `CLAUDE.md` and `scripts/README.md`),
  `dev:centroid` and `dev:shot-clip` (`scripts/README.md:51-52`, the first cited by
  `docs/spec/avatars.md`), `test:e2e`, `visual`, `visual:update`, `visual:report`
  (`docs/OPERATIONS.md` §1), `analyze` (§5) and `audit:status` (`docs/SECURITY.md:13`).
  So the answer to the charter's "is every script live" is: fourteen of fifteen.

---

### lib-core-config-15 - Three one-line config no-ops, in one commit

- **Where**: `src/app/api/demo/reset/route.ts:32` · `next.config.ts:368` ·
  `scripts/demo/verify-guard.mts:145`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  1. `src/app/api/demo/reset/route.ts:32` — `export const dynamic = "force-dynamic";` on a
     route that exports **`POST`**, and whose `GET` reads request headers via
     `requireCronSecret(req)`. Neither can ever be statically generated, so the export
     changes nothing. It is also an outlier: it is the only one of the fourteen API routes
     that declares it (`grep -rn 'export const dynamic' src/app` → three lab pages, one
     admin page, and this).
  2. `next.config.ts:368` — `release: { create: false, deploy: undefined }`. Setting a key
     to `undefined` is indistinguishable from omitting it; `create: false` is the whole
     of what that line does. The 15-line comment above it (an owner quote about Sentry
     deploy email) is excellent and stays; only `, deploy: undefined` goes.
  3. `scripts/demo/verify-guard.mts:145` — `if (hacked !== 0 || users !== 40)`. The 40 is
     hard-coded. `ALL_DEMO_PEOPLE` is `[DEMO_VISITOR, ...DEMO_PEOPLE]` and there are 40
     `slug: "` entries in `people.ts` today, so it is correct **right now** and becomes a
     false failure the day anybody adds a demo person. The script already imports from
     `src/lib/`, so `ALL_DEMO_PEOPLE.length` is one dynamic import away.
- **What to do**: delete (1); delete `, deploy: undefined` in (2); in (3) import
  `ALL_DEMO_PEOPLE` beside the existing dynamic imports at `verify-guard.mts:35-36` and
  compare against `.length`, with the failure message printing both numbers.
- **Saving**: 2 lines, plus one guard script that stops being wrong on its next edit.
- **Risk & gate**: low. `npm run check`. For (1), confirm the route still answers on the
  demo deployment's next nightly cron — or simply keep the export and only add the
  `maxDuration` from finding 10, if the fix session would rather not touch route segment
  config it cannot exercise. That is a defensible call; say which one was made.
- **Confidence**: high on (2) and (3). Medium on (1) — Next's static-analysis rules for
  route handlers have moved between versions, and the cost of being wrong (a route that
  caches when it must not) is worse than the one line saved. If in doubt, leave it and
  add a comment saying it is belt and braces.
- **Notes**: batching these is deliberate. Three independent one-liners are not three
  commits, and none of them is worth a commit alone.

---

### lib-core-config-16 - Two exports that nothing imports, and the rule tests that pin their `export` keyword

- **Where**: `src/lib/email-queue.ts:394` (`dailyBudget`) · `src/lib/email.ts:77`
  (`SEND_TIMEOUT_MS`) · pinned by `src/lib/mail-queue-rule.test.mjs:44,127`
- **Phase**: dead (export surface, not code)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-config.txt` lists both under "Unused exports (70)". I
  confirmed by grep:
  - `dailyBudget` is called four times inside `email-queue.ts` and appears nowhere else in
    `src/` except a prose comment at `src/app/(main)/admin/mail/actions.ts:88` and the
    rule test.
  - `SEND_TIMEOUT_MS` is used twice inside `email.ts` (`:217`, `:220`) and referenced by
    name in `email-queue.ts`'s comments and in the rule test.

  **But** both are load-bearing for a text-reading pin.
  `mail-queue-rule.test.mjs:44` does
  `queue.slice(queue.indexOf("export async function dailyBudget"))` — drop the `export`
  and `indexOf` returns −1, `slice(-1)` returns one character, and the test's own
  vacuity guard (`body.length > 400`, used on the sibling assertion) may or may not
  catch it. `:127` reads `/SEND_TIMEOUT_MS = ([\d_]+)/` off `email.ts`, which survives
  de-exporting; `:73` and `:104` only mention the name in prose.
- **What to do**: honestly, consider closing this as a not-finding. If a session does it:
  drop `export` from both, and in the same commit change the two anchors in
  `mail-queue-rule.test.mjs` (`"export async function dailyBudget"` →
  `"async function dailyBudget"`). Then **mutation-test both pins** — break
  `dailyBudget`'s `sentAt` filter and confirm the test goes red — because that is the
  failure mode a slipped anchor produces: a test that passes for ever on nothing.
- **Saving**: 2 words. Nothing else.
- **Risk & gate**: low blast radius, but non-trivial *care* cost: two rule tests must be
  re-anchored and mutation-tested to prove they still bite. `npm run check`.
- **Confidence**: high that they are unused exports; **low** that this is worth doing.
  What would change my mind: if `npm run check` ever gains a "no unused exports" gate,
  these two become noise that has to go. Until then the export keyword is free and the
  pin is not.
- **Notes**: audit 1 already ruled on this shape — `DEMO_CLOSED_PATHS` and
  `SESSION_GAP_MIN` are listed in its §5 as "honesty checks, kept". `SEND_TIMEOUT_MS` is
  arguably the same: it is a named constant whose docblock explains a 10-second choice
  against Resend's p99, and it is referenced by name from another file's comments and
  from a test's arithmetic (`:104`: *"BATCH sends at SEND_TIMEOUT_MS each is 80
  seconds"*). Deleting the keyword makes that cross-reference slightly less honest for no
  gain. I am filing it because knip flagged it and the charter named it; I would skip it.

---

### lib-core-config-17 - Correct four stale numbers in the operations and security documents

- **Where**: `docs/OPERATIONS.md` §8 ("The list is now 5") · `docs/OPERATIONS.md` §8
  ("its 74 test files by glob") · `docs/SECURITY.md:121` ("all 25+ unit test files") ·
  `docs/OPERATIONS.md` §4 (the overrides paragraph — folded into finding 08)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `git ls-files | grep -c "\.test\.mjs$"` → **102**. `docs/SECURITY.md:121`
  says "25+", `docs/OPERATIONS.md` §8 says "74", `CLAUDE.md` says "75 files as of
  2026-08-25". `raw/knip-repo-config.txt` line 1 says "Unused files (7)"; OPERATIONS §8
  says *"The list is now 5, and all five are the landing showcase"* — the two extras
  (`src/components/common/filters/active-filter-chips.tsx`,
  `result-count.tsx`) are new since that sentence was written and belong to another lens.
- **What to do**: one edit each. In `SECURITY.md:121` and `OPERATIONS.md` §8, prefer a
  form that cannot go stale — "every `*.test.mjs` the runner discovers by glob (102 at
  the time of writing)" — since the exact number is not the point and the drift is
  guaranteed otherwise. Update the knip count to 7 and note that two of them are new and
  unexplained, so the next reader has the question rather than a wrong answer.
- **Saving**: 0 lines; four true sentences where there are four false ones.
- **Risk & gate**: none beyond `npm run check` (no test reads these counts —
  `scripts/qa/check.mjs` has a test-count floor of its own, which is where the real
  number lives).
- **Confidence**: high.
- **Notes**: these documents are the ones the owner actually reads, which is the whole
  reason to keep them exact. The pattern across all four is the same: a number written
  into prose that nothing recomputes. Whoever fixes them should resist adding a
  script to generate them — that is the "no tooling for its own sake" trap; a phrase
  that does not promise precision is the cheaper fix.

---

## Owner decisions

**1. How long should a notification live: thirty days, or a year?**
Right now the answer depends on which file you read. A script that runs at ten past
midnight deletes every notification older than **thirty days**. A separate nightly job
three hours earlier is written to delete them at **a year**, and by the time it runs
there is nothing left for it to find. Two documents — `docs/SECURITY.md`, which records
your retention decisions, and `docs/OPERATIONS.md` — both say one year. So the site is
quietly keeping members' notifications for a twelfth of the time it tells you it does.
This happened because a fix in August changed the script's built-in default and missed
the one place that overrides it. **My recommendation is thirty days**, for the reason the
script itself gives: notifications are small but there are a great many of them, and at
two thousand members a year of them would be most of the free database plan. But it is a
retention decision, it is yours, and once you pick a number it becomes one number in one
place instead of three that disagree. (Finding 01.)

**2. The demo Collection's photograph pipeline has never been used, and it wants a folder
in the root you keep clean.**
There is a script that turns a folder of your photographs into the demo site's
Collection: you drop images in, run one command, and the demo stops showing six crops of
the same banyan tree. It has never been run — the file it writes has been empty since the
day the demo shipped. The instructions tell you to put the photographs in a folder called
`demo-photos` at the very top of the project, which is the folder you have said more than
once you want kept tidy. **My recommendation is to keep the script and move its folder
in beside it** (`scripts/demo/demo-photos/`), which is a five-minute change and stops the
instructions contradicting your own rule. Deleting the script would save about two
hundred lines but would also delete the only way the demo's Collection ever gets better,
and the spec calls that "the one surface still waiting on you". (Finding 04.)

**3. Two npm pins may be protecting nothing, and the operations doc thinks there is one
of them.**
Five entries in `package.json` force particular versions of libraries that other
libraries pull in, each added to close a security warning. Two of them are certainly
still doing work. The other three look like they have been overtaken — the libraries
underneath have moved on by themselves — but the only honest way to know is to remove
them, let npm work out the versions again, and see whether anything moves. That is a
five-minute check with a gate that goes red if it is wrong, so it is safe to try. The
part I would do regardless: the operations document still describes this as *"one
overrides entry"* and there are five, which means the next person to read it will not
know which ones are safe to remove. (Finding 08.)

---

## Not-findings

Things that look like bloat in this territory and are not. Each one is here so no future
audit spends time re-deciding it.

- **`email-queue.ts` is still not an outbox candidate, and I looked again.** Audit 1 §5
  says so; the charter asked me to check for mechanisms whose incident is now moot.
  There are none. Every mechanism in the file names a live failure: the daily cap and
  reserve (Resend's 100/day free plan), the per-row conditional claim with a fencing
  `claimedAt` (M50, a frozen-then-resumed `after()`), the drain lease with **renewal**
  (C-108, a Resend brownout running a pass past its own lease), the `pending` precheck
  (C-104, nine statements on the hottest path 99% of the time for nothing),
  `verificationMailState`'s send-from-the-read-path (the 2026-08-13 incident), the
  `localDrainRecipient` narrowing (M53, a laptop draining real members' mail), the
  imminent window (C-107). The file is 508 code lines under 471 comment lines and the
  comments are the reason it is still correct. Leave it alone.
- **`scheduleSend` / `scheduleDrain` still must not be collapsed into one `runDetached`.**
  Audit 1's `lib-core-config-05` proposed it and its own fix session refused, because
  `docs/TRAPS.md` sends readers to `scheduleDrain()` **by name** to see the
  `try { after(x) } catch { void x() }` shape that `after()` throwing synchronously
  outside a request scope requires. That reasoning holds. I re-read both functions: they
  are 12 lines apiece and differ in what they call.
- **`drainEligible` and `drainHasWork` are shadow copies of Prisma `where` clauses, and
  that is deliberate and defended.** Neither is called by production code. Both exist so
  a test can exercise the selection rule, which a `where` object cannot be. The drift
  risk — the predicate and the query disagreeing silently — is closed by
  `src/lib/mail-queue-rule.test.mjs:78-91` ("the drain's own selection reads the same
  counters drainEligible does") and `:182-203` ("drainHasWork and the query cannot
  drift"). This is the right shape and it is already pinned.
- **`SKIP_NO_USER` is unreachable today and should stay.** All four `enqueueMail` call
  sites pass a `userId` (`verification-mail.ts:32`, `email-actions.ts:273,424`,
  `settings/actions.ts:226`), so `render()`'s `if (!row.userId)` never fires. But
  `OutboundEmail.userId` is nullable, the constant is part of a tested policy
  (`isRetryableSkip`), and audit 1 §5 already ruled that honesty checks of this shape are
  kept. Same class as `DEMO_CLOSED_PATHS` and `SESSION_GAP_MIN`.
- **`demo-seed` does not ride in any production chunk — measured, not reasoned.** It is
  2,122 lines and the obvious suspicion is that it leaks. It does not.
  `grep -rl "banyan" .scratch/audit2-build/.next/server/chunks/*.js` returns exactly one
  file, `_1e_f587._.js` (68 KB), and
  `grep -rl "_1e_f587" .scratch/audit2-build/.next/server/app` returns exactly
  `api/demo/reset/route.js` and its `.nft.json`. No client chunk contains any seed string
  (`grep -rl "demo.valley.test" .../static` → nothing). Only `/api/demo/reset` and
  `scripts/demo/seed-demo.mts` import it. The 68 KB does exist in the real production
  deployment's server output, because both Vercel projects build from this one
  repository — that is the price of a demo built from the same tree, and it is the right
  price.
- **There is one retention cron, not three.** The charter asked whether retention,
  account purge and image purge should be one sweep. They already are:
  `runRetentionSweep` is a single pass of twelve steps: eight hard cutoffs, one
  transactional admin-message step, one batched Serializable Catch-up bin, the 60-day
  account purge (`purgeUserAccount`, batched at 10), and `drainPendingImagePurges`. The
  three modules are separated because `purgeUserAccount` is also what an admin delete
  calls and `image-purge.ts` is what a dozen delete paths call — they are libraries, not
  jobs. One route, one workflow, one nightly beat.
- **`allowScripts` in `package.json` is npm's own field and is currently accurate.** It
  is not LavaMoat leftovers (`grep -c lavamoat package-lock.json` → 0). `progress.md`
  (2026-08-28) records why it exists: npm 11 warns about uncovered install scripts and
  npm 12 flips the default to deny, which would silently cost `prisma generate` and
  Sentry's source-map step. I verified all five version pins still match the lockfile
  exactly — `@prisma/engines@7.10.0`, `prisma@7.10.0`, `@sentry/cli@2.58.6`,
  `unrs-resolver@1.11.1`, `fsevents@2.3.2` — so nothing has drifted. The three denials
  (`puppeteer`, `core-js`, `msw`) are correct: Puppeteer's bundled Chrome has never
  worked on this machine, which is also what `"puppeteer": { "skipDownload": true }` is
  for, and `puppeteer` itself is still imported by ten scripts under `scripts/qa/`.
- **`authInterrupts` is still required on 16.3.3.**
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/authInterrupts.md`
  is still marked `version: canary` and still says the flag is needed to use `forbidden()`
  — which `src/lib/admin.ts:62` calls and `src/app/(main)/forbidden.tsx` boundaries. The
  build log confirms it is the only experiment flagged `✓`. Do not touch it.
- **The other three experiments are all live too.** `optimizePackageImports` covers
  `@phosphor-icons/react` (a 4,500-line barrel Next does not auto-optimise) and `motion`;
  `serverActions.bodySizeLimit: "25mb"` is still reachable because
  `src/components/collection/contribute-room.tsx:644` still calls `contributePhoto(fd)`
  as the fallback when a direct presigned PUT is unavailable;
  `proxyClientMaxBodySize: "25mb"` is the separate cap `src/proxy.ts` imposes ahead of
  it, and `src/lib/upload-size-rule.test.mjs:70` pins that `next.config.ts` is not relied
  on to raise Vercel's own ~4.5 MB platform ceiling.
- **The `imageHosts` allowlist is correct and pinned.** It feeds `img-src`, `connect-src`
  and `images.remotePatterns` from one array — the right shape — and it is not a wildcard
  for a reason (C-134: anybody could point `/_next/image` at their own free
  `pub-*.r2.dev` bucket and have this project's Vercel account transform their bytes).
  `src/lib/security-regressions.test.mjs:139-165` pins both the no-wildcards rule and the
  agreement with `upload-shared.ts`.
- **Every other CSP host earns its place.** Razorpay is live (a real payment path through
  `src/components/support/support-contribute.tsx` and `src/lib/razorpay.ts`), and
  `https://i.scdn.co` is live (Spotify album art on Catch-up answers, resolved server-side
  by `resolveSpotify`). I checked both rather than assuming. Only the two PostHog entries
  are questionable (finding 07).
- **`tsconfig.json`'s `allowJs: true` is inert but harmless.** `include` lists
  `**/*.ts`, `**/*.tsx` and `**/*.mts` and no JavaScript pattern, and no `.ts` file in
  the repo imports a `.mjs`/`.js` module — so `allowJs` has nothing to act on today. It
  is a Next template default and removing it saves one line while creating a trap for the
  first person who imports a `.mjs` helper. Leave it. Likewise `target: "ES2017"`: with
  `noEmit: true` and Turbopack doing the real transpilation from browserslist, it affects
  nothing that ships.
- **`check.yml` running only `npm run check` is the design, and it is enforced.**
  `scripts/qa/ci-parity.test.mjs` parses the workflow's every `run:` step, block scalars
  included, and fails if anything other than `npm ci` and `npm run check` appears — and
  then checks the other direction, that `check.mjs` still calls the two security scripts
  that moved into it. That is a good gate. Do not add a step.
- **`prisma.ts`'s three-layer `clientKey` is not over-engineering.** Schema fingerprint
  (dev only, from the file, because a field's `@default(dbgenerated())` change is
  invisible to the runtime objects), model names, and per-model `*ScalarFieldEnum` column
  lists. Each layer was added after a specific dated incident, each incident is named in
  the comment, and `docs/TRAPS.md` and `CLAUDE.md` gotcha 8 both point at the mechanism.
  The whole thing is inert in production (`schemaFingerprint()` returns `""`, the
  `globalForPrisma` assignment is skipped).
- **`instrumentation.ts`'s `NEXT_RUNTIME` guard: considered, left alone.** `register()` is
  only ever invoked by Next with `NEXT_RUNTIME` set to `"nodejs"` or `"edge"`, so
  `if (runtime === "nodejs" || runtime === "edge")` looks like a defensive branch that
  cannot be false — LLM-bloat signature 3, worth three lines. I am not proposing it:
  `enabled` keys off `Boolean(process.env.VERCEL)`, which is set during a Vercel **build**
  as well as at runtime, so removing the guard risks initialising Sentry during static
  generation. Three lines is not worth finding out. And the answer to the charter's
  question is: no, `instrumentation.ts` does nothing beyond Sentry — `register()` and
  `onRequestError`, 26 code lines, and every one of its 49 comment lines records a
  decision (no browser SDK and why, no session replay and why, `sendDefaultPii: false`
  and why, the two ignored Next control-flow throws).
- **No environment variable is read in both a client and a server file.** I swept every
  file containing `"use client"` for `process.env`. The only hits are `NODE_ENV` (inlined,
  normal) and `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_DEV` in
  `posthog-client.ts`, which is correct. Two files matched my first grep and are false
  positives worth recording so nobody else gets a fright: `src/lib/api-gate.ts` (reads
  `CRON_SECRET`) and `src/lib/razorpay.ts` (reads `RAZORPAY_KEY_SECRET`) contain the
  string `"use client"` **inside comments forbidding it** — `razorpay.ts:8` says
  *"SERVER ONLY. Nothing here may be imported from a `use client` file"*. Neither carries
  the directive. On the build-time-vs-runtime half: `next.config.ts` reads exactly three
  variables, all at build time — `NODE_ENV` (gates HSTS, `upgrade-insecure-requests` and
  the dev `Connection: close`), `R2_PUBLIC_BASE_URL` (baked into the CSP and
  `remotePatterns`) and `SENTRY_AUTH_TOKEN` (gates source-map upload).
  `R2_PUBLIC_BASE_URL` is the one also read at runtime (`upload-shared.ts:222`), which is
  why `docs/TRAPS.md` says moving the image host is five changes and not one.
- **`vercel.json`'s demo-reset cron firing against production is deliberate.** One
  `vercel.json` ships to both Vercel projects, so the real deployment runs
  `/api/demo/reset` nightly; `route.ts:87-91` answers a 200 no-op *"so the nightly run
  reports success instead of raising a failed-cron alert every morning for a job that was
  never meant for it"* (C-111/C-136). Costs one invocation a day. Correct as built.
- **The three GitHub workflows are not duplicated infrastructure.** `backup.yml` and
  `snapshot.yml` each open their own database connection from the same
  `SUPABASE_DIRECT_URL` secret, and it would be tempting to merge them. Do not: they run
  four hours apart on purpose (`snapshot.yml`'s header records that landing on
  `retention.yml`'s minute was audit Low 102, and that reading PostHog before the UTC day
  ended lost 02:30-05:30 IST every day for ever, Lows 51/103), they have different
  timeouts, and `snapshot.yml` deliberately installs with `--ignore-scripts` while
  `backup.yml` installs a specific PostgreSQL client. The near-identical AWS environment
  blocks inside `backup.yml` (five copies of the same six variables) are a real
  duplication, but GitHub Actions has no job-level `env` inheritance that would remove
  them without a composite action, and that trade is worse.
- **`.github/renovate.json` is well-argued and current.** Five package rules, each with a
  stated reason (Next + its eslint config move together; Prisma client and CLI must
  match; React is pinned exactly; next-auth is a beta held seven days and never grouped;
  Playwright carries a "run `npm run visual`" label). Nothing stale.
- **`prisma.config.ts` is 31 lines of which 15 are one comment, and the comment is the
  point.** It records why there is exactly one `.env`, why there is deliberately no
  `migrations` block, and why the CLI must use `DIRECT_URL`. Audit 1 already cleaned this
  file (`9c12779`).
- **`postcss.config.mjs`, `.mcp.json`, `eslint.config.mjs`.** Nothing to say about the
  first two beyond that they are minimal and required. `eslint.config.mjs`'s lab
  exemption (`:49-65`) is well-argued with a counted example — 12 of 25 warnings on
  2026-08-08 were lab rooms behaving correctly, which hid two real violations in
  production code — and its three design rules are `warn` on purpose so they nudge
  without breaking a build.

---

## Audit-1 carry-overs in this territory

- **`lib-core-config-01` / `bundle-build-05c` — tsconfig excluding `src/generated`:
  RE-REFUTED at fix time and I did not retry.** The fix session measured it with
  `--extendedDiagnostics`: 6300 → 6297 files, instantiations identical at 906,930, because
  `exclude` only trims the initial file set and 16 files import
  `@/generated/prisma/client` anyway. The claimed ~5 s/build does not exist. Still true.
- **`lib-core-config-05` — email-queue's duplicated and misplaced doc blocks: DONE**
  (`6277a3e`). Its optional half (collapsing `scheduleSend`/`scheduleDrain` into
  `runDetached`) was deliberately refused because `docs/TRAPS.md` names `scheduleDrain()`
  as the worked example of the `after()`-throws-synchronously shape. I re-read both and
  agree; see Not-findings.
- **`lib-core-config-07` — the cron-secret helper: DONE.** `requireCronSecret` now lives
  in `src/lib/api-gate.ts` and all three cron routes call it (`retention/sweep:45`,
  `demo/reset:97`, `catchups/tick`). The fix session's note that each route must keep its
  own `export const maxDuration` was followed for two of the three — which is half of
  finding 10.
- **`lib-core-config-08` — instrumentation collapse and the prisma.config stanza: DONE**
  (`9c12779`). Both files are in the shape that row described.
- **`bundle-build-06` — Sentry's `runAfterProductionCompile`: RE-REFUTED on magnitude**
  (measured at ~1 s across six builds, not the 3.0 s claimed). Not retried. Note for the
  fix session: finding 06 is a **different** Sentry option and does not reopen this one.
- **Open owner decisions from audit-1 §4 touching my files: none.** The landing showcase,
  the member tour, the About text, Vercel Analytics vs PostHog, the skill packs, the two
  security probes, the birds sprite, "sanan's stuff", the Collection taxonomy SELECT and
  the Collection filter chrome all sit outside this territory. The one that comes closest
  is *"the email queue on a paid Resend plan"* — its state today: still open, still
  hypothetical, and nothing has been built toward it. `DAILY_CAP = 95` and
  `RESET_RESERVE = 20` are still hard-coded constants in `email-queue.ts:52,64`, which is
  the right place for them to be until there is a different plan to size them against.

---

## For other lenses

- **`scripts/ops/prune.mjs` + `.github/workflows/snapshot.yml`** — the notification
  retention drift (finding 01) has one foot in `scripts/ops/`, which is not my territory.
  Whoever owns `scripts/**` should know the file's header and its inline comment at
  `:59-62` currently contradict each other.
- **`src/lib/retention.ts` has no rule test.** Every other invariant of this weight in
  this repo has one (`db-pool-rule`, `mail-queue-rule`, `purge-rule`, `image-purge-rule`).
  A test asserting that `KEEP_DAYS` and the table in `docs/SECURITY.md:80-89` agree — the
  shape `valley-day.test.mjs` uses to sweep for a date rendered without a time zone —
  would have caught finding 01 the day it happened. For `lib-tests`.
- **`src/lib/email-templates.ts` has no test at all.** Four member-facing message
  templates, 388 lines, and nothing asserts that a plain-text part contains its own link.
  For `lib-tests`.
- **`scripts/qa/check.mjs:109` lints `src` only.** `e2e/`, `scripts/` and the root config
  files are never linted by the gate, and the `lint` npm script that would cover them is
  dead (finding 14). For whoever owns the gate.
- **`@prisma/client` shows as an unused dependency** in `raw/knip-repo-config.txt`
  because the generated client is emitted to `src/generated/prisma`. For
  `dependency-diet` — and note `mysql2` is a Prisma-CLI transitive that this
  Postgres-only project never loads, which changes how its override should be read.
- **`.mcp.json` pins both servers to `@latest` via `npx -y`**, so every session start
  fetches whatever those packages are that day. That is a reproducibility question and a
  cold-start cost, not a bloat one. For `root-assets`.
- **`docs/OPERATIONS.md` §1 says `npm run visual` takes ~80 seconds; `CLAUDE.md` says
  50 s** and the brief says 50 s. One of them is stale. For whoever owns the docs sweep.
- **`src/components/collection/contribute-room.tsx:623,644` calls both
  `contributePhotoDirect` and the older `contributePhoto(fd)` FormData path.** The second
  is what keeps `serverActions.bodySizeLimit: "25mb"` load-bearing. Whether both paths are
  still needed is a Collection question, not a config one — but if the FormData fallback
  ever goes, that config line goes with it. For `collection` / `media-viewer`.
- **`backup.yml` repeats the same six AWS environment variables in five steps** (~30
  lines). I judged the composite-action fix worse than the duplication; recording it in
  case `scripts-e2e-ci` disagrees.

---

## Metrics

**Lines read in full**: ~4,600 of source and config in territory, plus ~1,600 of spec
(`OPERATIONS.md` 350, `TRAPS.md` 306, `demo.md` ~200 of 314, `SECURITY.md` ~120 of 243,
the audit-1 report and fix-prompt extracts, the Next 16.3.3 `authInterrupts` doc), plus
~600 lines of `package-lock.json` queried programmatically and ~700 of related non-
territory source read to verify a claim (`proxy.ts` 418, `posthog-client.ts` 195,
`prune.mjs` 97).

**Comment-heaviest files in territory** (from `raw/comment-density.txt` and
`raw/cloc-by-file.csv`, comment ÷ code):

| File | Comment | Code | Ratio | Verdict |
|---|---|---|---|---|
| `src/lib/mail-policy.ts` | 207 | 105 | 1.97 | earned — every rule names its bug id |
| `next.config.ts` | 239 | 132 | 1.81 | earned but for 11 lines (finding 12) |
| `src/lib/email.ts` | 139 | 99 | 1.40 | earned but for 4 lines (finding 13) |
| `src/instrumentation.ts` | 49 | 26 | 1.88 | earned — decisions, not narration |
| `src/lib/prisma.ts` | 92 | 74 | 1.24 | earned — three dated incidents |
| `src/app/api/retention/sweep/route.ts` | 50 | 15 | 3.33 | earned — the C-079 and M54 reasoning |
| `src/lib/demo-seed/*` | 299 | 2,122 | 0.14 | data, correctly uncommented |

**The two exemplars the brief asked for.** A comment that carries a reason, dated,
measured, and pointing at the line of the library it was proved against —
`src/lib/prisma.ts:37-44`:

> *`statement_timeout` is deliberately absent. pg ships it as a startup parameter
> (pg/lib/client.js:549) and Supavisor silently drops it: probed live on 2026-08-21
> against both :6543 and :5432, `SHOW statement_timeout` came back as Supabase's own 2min
> and a `pg_sleep(3)` under statement_timeout=1000 ran to completion.*

And the only comment in the territory describing code that no longer exists,
`src/lib/email.ts:250-253`:

> *Re-exported so server callers can reach it from the module they already import.*

There is no re-export; `e23e80c` removed it and left this behind. That contrast is the
whole of the comment story here: 1,300+ comment lines in this territory, and four of them
are bloat.

**Biggest files in territory** (code lines, `raw/cloc-by-file.csv`):
`demo-seed/content.ts` 880 · `demo-seed/people.ts` 585 · `email-queue.ts` 508 ·
`demo-seed/seed.ts` 408 · `email-templates.ts` 284 · `retention.ts` 212 ·
`next.config.ts` 132 · `mail-policy.ts` 105 · `resend/webhook/route.ts` 102 ·
`email.ts` 99.

**Countable outcomes if every autonomous finding lands**: ~140 lines removed
(02 ≈ 26, 03 ≈ 25, 05 ≈ 25, 12 = 11, 01 ≈ 12 on the 30-day branch, 13 = 4, 11 ≈ 4, the
rest single lines), plus 2 CSP entries, up to 3 npm overrides, ~450 bytes off every HTML
document (06, pending its curl), 1 permanently-zero database step per night, 1 shared
`.env` parser instead of 3, 1 canonical origin instead of 7, and 7 corrected sentences
across `docs/SECURITY.md` and `docs/OPERATIONS.md`. **Client bundle impact: zero** —
nothing in this territory reaches a browser.
