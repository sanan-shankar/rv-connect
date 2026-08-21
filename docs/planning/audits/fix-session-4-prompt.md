# The Pre-Release Fix Session, part four

You are finishing a job that is roughly 92% done by effort. **All 45 canonical findings are
closed, both feature builds shipped, and the three gates are green.** What is left is the tail:
22 Medium roots, about 47 Low items, and the close-out.

**Read these before anything else, in this order:**

1. `docs/planning/audits/fix-log.md` — the disposition ledger. Its "Still open" section is your
   worklist. Its **"Things a later session should know"** section is not optional: it holds the
   traps three sessions have already sprung, and the newest one (the demo database drifting) would
   have broken the demo deployment on a push.
2. `docs/planning/audits/bug-report.md` — the audit, still the spec. §3.M is the Medium table,
   §3.L the Low appendix, §5 the verified-clean map (do not re-litigate what is in it).
3. `docs/planning/audits/fix-session-3-prompt.md` — the owner's intent in his own words, the
   method, and the hard rules. **All of section 1, 4, 6, 7 and 8 of that document still apply
   verbatim.** Do not re-derive them here.

Then `CLAUDE.md`, `AGENTS.md`, and `docs/spec/DESIGN-SYSTEM.md` before any UI work.

---

## What is left

### Medium (22)

- **Small and independent, most of the remainder:** M01 (report dismiss/resolve has no status
  precondition, so two admins produce duplicate contradictory records), M04 (worklist sorts on
  `User.updatedAt`, which 15-minute presence writes pollute), M25 (SearchLog keystroke dedupe does
  not dedupe, because each prefix is a distinct string), M34 (account purge hard-deletes comments
  and silently promotes their replies to top-level), M35 (createPost/createComment have no unique
  guard and thin double-submit protection), M40 (LocationPicker silently converts to a free-typed
  coordinate-less place when /api/places fails), M42 (PostHog identify never fires on a full page
  load into a `(main)` route), M43 (`postSchema.targetBatches` has no cap or format and is
  LIKE-scanned by every feed query), M44 (users/search builds one AND-clause per whitespace token,
  unbounded), M46 (`/notice/[id]`'s legacy resolver is not idempotent, so duplicate admin threads),
  M47 (letters index truncates at 40 with no pagination), M48 (`/api/account/export` streams the
  whole history in one unbounded JSON), M66 (two tabs editing one draft clobber, last write wins),
  M67 (Catch-up reorder/remove is a stale-props read-modify-write with no pending guard), M68
  (profile field save stamps "already saved" before success, so a failed save cannot be retried).
- **Owner-owed, code half only:** M19 (production images served from the throttled `pub-*.r2.dev`
  via a plain `<img>`; the code part is `R2_PUBLIC_BASE_URL` plus the domain in
  `next.config.ts` remotePatterns — see the owner list below), M20 (`sendMail` has no timeout and
  the layout blocks render on Resend for unconfirmed members).
- **Deferred with a reason, and they should STAY deferred unless the owner says otherwise:** M22
  (theme cookie makes every route dynamic; every fix trades that for a flash of the wrong theme)
  and M24 (`touchLastSeen` misses soft navigations; the fix is a new client surface).

### Low (~47)

Mostly one-liners, and many cluster with a Medium above. The distinct families left: the
admin-list unbounded family (Low 55), the remaining validation-disagreement family (Lows 84, 96),
and a long tail of independent copy, date and link nits. §3.L is the list.

### The close-out

- Every remaining finding **dispositioned** in the ledger — fixed, not-a-bug-with-reason, or
  deferred-with-reason. That is what "done" means here.
- `npm run check`, `npm run visual` and `npm run test:e2e` green. All three were green at the end
  of session 3; keep them that way.
- Log the session in `progress.md`.
- **Ask before pushing.** The owner pushed once mid-session-3 and may prefer to again.

---

## What session 3 learned that will save you time

- **Two agent reports contained a real defect each, and only reading the diff caught them**: a hash
  function copied into a second file (two implementations of one hash breaks every password reset
  the day somebody edits one), and a security check silently dropped from a rewritten query. Both
  passed every gate. Read every diff.
- **The audit is wrong sometimes.** Session 3 found three (M30, M56, Low 43); sessions 1 and 2
  found two more. Verify against the live code and write down why, rather than "fixing" correct
  code. That is worth more than a patch.
- **Never run `npm run check` while a subagent runs its own gate.** It killed the process once
  (exit 137). Give agents `npx tsc --noEmit`, `npx eslint <files>` and `node --test <files>`, and
  tell them explicitly not to run the full gate.
- **Any new manual migration must be applied to the demo database too**, with
  `node scripts/dev/run-sql.mjs --env .env.demo <file>`. Nothing automates this.
- Throwaway accounts through the real signup flow are cheap and they prove things nothing else
  can. Session 3 used them for B-063's whole lifecycle and for the password-reset transaction.
  Delete them before the session ends; session 3's are gone.

---

## Still owed to the OWNER (carry this forward and tell him again)

1. **`EMAIL_DEV_SEND=1` is still set in the local `.env`.** The code guard now stops this machine
   claiming any queued mail addressed to anyone but him, so the danger is much reduced. He should
   still comment it out when not actively testing a template.
2. **R2 custom serving domain** (audit §0.2b, M19, Lows 19/56). Images are still served from the
   throttled `pub-*.r2.dev`. Needs a custom domain on the bucket and `R2_PUBLIC_BASE_URL` in
   Vercel; the `next.config.ts` remotePatterns half is the code side and is yours once he has the
   domain. **He raised this himself as "the image CORS thing" — it is the outstanding item he
   remembers.**
3. **`CRON_SECRET`** is still not set in the local `.env`, and the retention sweep route cannot be
   exercised locally without it. Owed since the security overhaul.
4. **Dependabot PR #10 can be closed, not merged** — session 3 applied those bumps locally.
5. **Four duplicate reports on one post** exist in the live `Report` table from before the dedupe
   existed. Harmless; his to clean up if he wants the number tidy.
