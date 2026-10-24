# Bug audit 3 — fix campaign prompt

**@ this file and invoke `/campaign`.** That is the whole handover. The skill front-loads every question
the owner must answer, then works the phases one after another, one worker per chunk, verifying each
worker's output itself before the next starts. It reads the campaign board below to know where to pick
up, and writes to it before it ends.

Audit: `docs/audit-fix/2026-09-24-bug-audit-3/`. `bug-report-3.md` is the deliverable: §2 is the phased
plan, §3 the owner section (questions already in the five-line form, and the checks only he can do), §8
the findings (a full entry for every High and Medium, a table for every Low, and the findings closed
during the audit). The evidence behind each row is its block in `work/reports/<agent>.md` and its
verdict in `work/verdicts/<zone>.md`; **the verdict wins where they differ.** `work/ledger-final.json`
is the machine-readable ledger: every finding's final severity, verdict and `phase`.

---

## Read this before you touch anything

**Trust the finding, re-derive the lines.** Every open row survived a validator whose job was to
refute it, and the High and Medium entries carry line numbers checked at `36ed27d3`. The Lows' lines
are the verdicts' (mostly `88642426`). Audit 2's verifiers found half of all findings carried a wrong
detail; this audit's corrected most of those, but the tree keeps moving. **Before you edit a cited file,
`git log --oneline 36ed27d3..HEAD -- <file>`**, and re-derive the range if anything landed.

**Nine rows were never attacked by a validator**: C8-01 to C8-09, the last completeness round's, which
closed the audit on the owner's word. They carry "not adversarially validated" in the report. A worker
re-derives one before fixing it and drops it, with a ledger line, if it does not hold.

**A peer session commits in this tree** (birds, the trivia gate, the trivia admin page). Stage by name,
commit with a pathspec (`git commit -- <paths>`), never stash, reset or touch work you did not make
(CLAUDE.md). If a file you need holds someone else's uncommitted edits, work around them or stop.

**Live data.** One database serves production and the dev server. **Never test a Catch-up control on a
real Catch-up**: Batch of 2024's Edition 2 was answering until 2026-10-25 07:00 IST; check what is live
before you press anything. Sign in as Jerry Maguire only (memory: never a real alumnus). **Never run the
`scripts/qa/phase*-probe.mjs` scripts**: they comment on a real member's newest post and ring their bell
(C1-02). Schema changes go through a dated file in `prisma/migrations-manual/`, never `prisma db push`.

**The repository is public, by the owner's choice** (ruled 2026-10-23; do not re-raise it). Name no
member in a commit message, a doc or a test you write.

**Machine load.** At most five background agents at a time (the owner's number, 2026-10-24; thirteen took
his VS Code to 5 GB).

**Deploys are git-only, and a push is a deploy.** Commit each fix as it passes `npm run check`; ask
before pushing. Every visible change is announced to the owner (memory: announce frontend changes) and
screenshotted at desktop and 390x844.

**Owner-gated rows.** Only the rows a question names wait for its answer; the rest of the phase runs.
Every question carries the answer to take if he does not reply, so a silent owner never blocks the
campaign for more than the batch he is asked in.

## Campaign board

Where the campaign is, in the order the phases run. **This is the resume anchor**: the next session reads
this table and starts at the first phase that is not `DONE`. Update it before you end, in the same commit
as the work. Status is one of `DONE`, `PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED`
(`scripts/qa/campaign.test.mjs` fails on anything else). "Blocked on" names only the rows a question holds;
the rest of the phase runs.

| Phase | Status | Rows left | Blocked on |
|---|---|---|---|
| A — Trust: who counts as verified, and who may press what in a Catch-up | OPEN | 17 (2 H, 3 M, 12 L) | Q13 (L10-01 only); Q15 (C3-01 only); Q16 (L12-09 only); Q19 (O-08 only) |
| B — Privacy: what leaves the site, and what outlives a member | OPEN | 27 (1 H, 9 M, 17 L) | Q1 (T7a-01 only); Q10 (T7b-22, T7b-21 only); Q14 (L11-02 only) |
| O — Budgets: what one account or one script may spend of what everyone shares | OPEN | 12 (2 H, 9 M, 1 L) | — |
| E — The Collection | OPEN | 27 (3 H, 6 M, 18 L) | Q7 (T4a-01 only) |
| F — Letters, the feed and the composer | OPEN | 26 (2 H, 6 M, 18 L) | Q17 (T8b-17 only) |
| D — Alarms: the owner hears about every failure | OPEN | 23 (0 H, 10 M, 13 L) | — |
| C — When something fails, the member sees the truth and can recover | OPEN | 20 (0 H, 10 M, 10 L) | — |
| G — Sign-up, sign-in and the confirmation mail | OPEN | 24 (0 H, 11 M, 13 L) | Q3 (T5-01, T6-06 only); Q4 (T5-14 only); Q18 (C5-03 only) |
| H — Catch-ups: answering, reading, and the words on the clock | OPEN | 34 (0 H, 12 M, 22 L) | Q2 (T2a-07 only); Q6 (T2a-13, T2b-05 only); Q9 (T7b-15 only); Q11 (T3-17 only) |
| J — Support and payments | OPEN | 11 (0 H, 6 M, 5 L) | Q8 (T8a-16 only) |
| I — Admin, moderation and the analytics room | OPEN | 46 (0 H, 5 M, 41 L) | Q5 (T7a-08 only); Q12 (L10-05 only) |
| K — Text that breaks things: names, numbers, search, links | OPEN | 21 (0 H, 2 M, 19 L) | — |
| L — Platform, database, demo and scripts | OPEN | 46 (2 H, 1 M, 43 L) | — |
| M — The hoopoe | OPEN | 11 (0 H, 2 M, 9 L) | — |
| N — Feel and truth: presses, taps, comments and docs that lie | OPEN | 14 (0 H, 0 M, 14 L) | — |

## Owner questions

The audit wrote them in the five-line form, each with the answer to take if he does not reply:
`bug-report-3.md` §3.1, Q1–Q17. Copy them here when the campaign asks them, as the skill says. The checks
and switches only he can do are §3.2, A–K; they are not questions and block nothing.

## Owner answers

(none yet)

## The order to work in

### Phase A — Trust: who counts as verified, and who may press what in a Catch-up

Live today: start here. O-08 first (`src/lib/roster.ts`, its own unit): until Q19 is answered take its default, which is the safe one: auto-verify on an email match only, a name match goes to the admin queue, and an already-claimed roster person is refused. Then the Catch-up rows, all in `src/app/(main)/catchups/actions.ts` and `src/lib/catchups-core.ts`, so one worker, in sequence. L10-01's verb gates ship without waiting for Q13 (Q13 decides only when an account joins). Pin: a test that every `allowBatch: true` caller also calls `requireVerifiedMember`. `write-path-reviewer` on the diff.

- **High and Medium** (full entries in the report §8): L10-01 (High), O-08 (High), C3-01, L12-09, T3-06
- **Low** (the report's Low table): L1-02, L1-03, L12-03, T2a-08, T2a-09, T2a-10, T2b-06, T2b-09, T2b-11, T3-15, T7a-07, V-T2-02

### Phase B — Privacy: what leaves the site, and what outlives a member

T8b-14 first (one `beforeSend`; the entry names the trap: do not set `dataCollection` alone). The privacy page rows (T8b-06, L11-02, C4-04) are one edit, after Q14. T7a-01 waits on Q1, T7b-22/T7b-21 on Q10. `write-path-reviewer` on anything touching the purge.

- **High and Medium** (full entries in the report §8): T8b-14 (High), C8-01, C8-02, L11-02, T6-03, T7a-01, T7a-02, T7a-04, T7b-22, T8b-06
- **Low** (the report's Low table): C4-04, C8-08, L1-04, L10-02, L12-02, L5-09, L5-10, T7a-09, T7a-10, T7a-21, T7b-21, T8a-07, T8a-18, T8b-09, T8b-18, V-L-d-01, V-T7a-02

### Phase O — Budgets: what one account or one script may spend of what everyone shares

One design first (O-09's fix direction: a per-account daily budget helper beside `rateLimit`, per-recipient caps in `enqueueMail`, a read meter plus caching for the shared cross-user reads, retention sized to each cap), reviewed before any instance is closed; then apply it instance by instance. C5-01 (one config line: it closes the cheapest way to spend Hobby's 5,000 monthly image transformations) and check D (the firewall rule) ship at once, ahead of the design. Three instances live in G because they share files with rows there (C4-01 with the trivia gate; C5-02 and C6-01 with the mail queue): the design step here must land before G applies it. Otherwise independent. Run it before signups are opened wider.

- **High and Medium** (full entries in the report §8): C5-01 (High), L8-04 (High), C6-02, C6-03, C6-04, C6-05, L5-02, L5-11, O-09, T2a-03, T2b-02
- **Low** (the report's Low table): C3-02

### Phase E — The Collection

The three Highs first. T4a-01 + V-T1-02 + T1-18 + V-T4a-A are one unit in `src/lib/collection-intake.ts` (Q7 decides only the copy on the tick). T4a-03's in-app cleanup ships regardless of the R2 rule (check G).

- **High and Medium** (full entries in the report §8): T4a-01 (High), T4b-01 (High), T4b-03 (High), T4a-02, T4a-03, T4b-04, T4b-05, T4b-06, T4b-07
- **Low** (the report's Low table): C1-04, C7a-01, C8-05, T1-18, T4a-04, T4a-06, T4a-07, T4a-11, T4a-12, T4a-13, T4a-14, T4b-09, T4b-10, T4b-12, T4b-13, T7a-20, V-T1-02, V-T4-01

### Phase F — Letters, the feed and the composer

T8b-01 + T8b-17 + T4b-02 are the Dialog primitive (`src/components/ui/dialog.tsx`): every dialog in the app moves, so screenshot several, desktop and 390x844, and run `npm run visual`. Q17 is optional; the scrollable dialog ships without it. The letter-desk rows (T1-02, T1-03, T1-23, V-T1-01) share `use-letter-persistence.ts`.

- **High and Medium** (full entries in the report §8): T8b-01 (High), T8b-17 (High), L12-01, L6-05, T1-01, T1-02, T1-03, T1-23
- **Low** (the report's Low table): C7a-02, C8-07, O-01, T1-06, T1-07, T1-08, T1-10, T1-11, T1-13, T1-14, T1-15, T1-16, T1-19, T1-24, T1-25, T3-10, V-T1-01, V-T3-01

### Phase D — Alarms: the owner hears about every failure

L4-08 is the class: decide the one "report, don't just log" helper first, then apply it row by row. O-05 (dev-queued mail sent by production) needs a guard at enqueue outside production; the entry names the smaller fix. L11-05 is half owner action (check H).

- **High and Medium** (full entries in the report §8): L11-05, L4-02, L4-03, L4-06, L4-08, O-05, T2a-04, T5-02, T5-03, T5-10
- **Low** (the report's Low table): C2-01, L11-03, L11-04, L4-05, L4-07, L5-06, L8-02, T2a-14, T2b-07, T5-13, T5-16, V-L-b-01, VT7b-01

### Phase C — When something fails, the member sees the truth and can recover

Run after D or with the same worker (both touch `src/lib/report-error.ts` and the error boundaries). T8b-15 + O-03's residual (L2-03, T1-09, T8a-12) are one change; L7-03 + T9-04 + T8b-07 are one change. L8-06 is half owner switch (check C), half code.

- **High and Medium** (full entries in the report §8): L2-03, L2-06, L7-01, L7-03, L8-06, T5-06, T8a-12, T8b-02, T8b-15, T9-04
- **Low** (the report's Low table): L7-06, O-04, T1-09, T6-08, T8b-07, T8b-08, T8b-11, T8b-12, T8b-19, V-T1-03

### Phase G — Sign-up, sign-in and the confirmation mail

C4-01 and C5-03 (the trivia gate) touch code a peer session may still be building: check `git log` on `src/lib/trivia-log.ts`, `trivia-bank.ts` and `trivia-actions.ts` first; C5-03 waits on Q18. C4-01, C5-02 and C6-01 are O-09 instances: apply the budget helper from phase O, so its design step comes first. C4-02 + C4-03 + T5-13 + C5-02 + C6-01 + C5-04 + C5-05 are the confirmation-mail queue: one worker, and read `work/reports/C5.md`'s state-machine table before changing it. T5-01 waits on Q3; T5-14 on Q4.

- **High and Medium** (full entries in the report §8): C4-01, C4-02, C5-02, C5-03, C6-01, L7-02, T5-01, T5-04, T5-05, T5-07, T5-09
- **Low** (the report's Low table): C4-03, C5-04, C5-05, C7b-01, C7b-02, C7b-03, L10-03, L6-07, T5-08, T5-11, T5-12, T5-14, T6-06

### Phase H — Catch-ups: answering, reading, and the words on the clock

After A (same actions file). L7-09 (voice recorder) needs a microphone to verify; test on a throwaway Catch-up you create, never a live one. T2a-07 waits on Q2, T7b-15 on Q9, T3-17 on Q11, T2a-13/T2b-05 on Q6.

- **High and Medium** (full entries in the report §8): L3-02, L4-01, L7-09, T2a-02, T2a-07, T3-04, T3-05, T3-11, T3-17, T3-18, T3-19, T7b-15
- **Low** (the report's Low table): C7a-04, C8-04, L2-04, L3-03, T2a-11, T2a-13, T2b-03, T2b-04, T2b-05, T2b-08, T2b-10, T2b-12, T2b-13, T3-08, T3-09, T3-12, T3-14, T3-21, T3-22, T3-23, T3-24, T7b-03

### Phase J — Support and payments

Payments: test against Razorpay test mode only. L1-01 and T8a-02 are webhook ordering bugs; the entries say which needs a row lock. T8a-16 waits on Q8.

- **High and Medium** (full entries in the report §8): L1-01, L4-04, T8a-02, T8a-11, T8a-15, T8a-16
- **Low** (the report's Low table): T8a-04, T8a-05, T8a-06, T8a-13, V-T8-01

### Phase I — Admin, moderation and the analytics room

Mostly admin-only surfaces: visible to the owner, not members. T7a-06 + T6-01 (duplicate) together. T7a-08 waits on Q5, L10-05 on Q12.

- **High and Medium** (full entries in the report §8): C8-03, T7a-03, T7a-06, T7b-02, T7b-13
- **Low** (the report's Low table): C1-07, C7b-04, C7b-05, C7b-06, C7b-07, C8-06, C8-09, L10-05, L10-06, L12-04, L12-05, T6-05, T7a-05, T7a-08, T7a-11, T7a-12, T7a-13, T7a-14, T7a-15, T7a-16, T7a-17, T7a-19, T7a-23, T7b-01, T7b-04, T7b-05, T7b-06, T7b-07, T7b-08, T7b-09, T7b-11, T7b-14, T7b-16, T7b-17, T7b-18, T7b-19, T7b-20, T8a-01, T8a-14, V-L-a-01, V-T7a-01

### Phase K — Text that breaks things: names, numbers, search, links

One sanitising pass: V-O-B (bidi) + L6-02 are one strip applied at every sink; O-06 strips U+0000 in `escapeLike` (all seven search callers use it); V-O-C + T6-09 are the phone trunk zero.

- **High and Medium** (full entries in the report §8): C7a-03, T6-04
- **Low** (the report's Low table): L10-04, L12-07, L6-02, L6-03, L6-04, L6-06, L6-08, L6-09, L7-08, O-06, T6-07, T6-09, T6-10, T6-11, T6-12, T6-13, T6-14, T6-15, T8b-21

### Phase L — Platform, database, demo and scripts

L5-01 first: it is the first ceiling now that production is on Hobby (owner, 2026-10-23): cut CPU where it is cheap (the beacon's interval, the proxy's matcher) and keep the weekly look of check B. L5-07 is OWNER-DEFERRED (platform-health handover item 14, 2026-10-08: revisit before about 1,000 members); do only its egress-reading-in-the-snapshot half. Index rows go through one dated migration file in `prisma/migrations-manual/`. The scripts rows (C1-*) must not be fixed by running them.

- **High and Medium** (full entries in the report §8): L5-01 (High), L5-07 (High), L5-04
- **Low** (the report's Low table): C1-01, C1-02, C1-03, C1-05, C1-08, L11-06, L11-07, L12-06, L12-08, L3-05, L3-06, L3-07, L5-03, L5-05, L5-08, L8-01, L8-03, L8-08, L9-01, L9-02, L9-03, L9-04, L9-05, L9-06, L9-07, L9-08, L9-09, L9-10, L9-11, T1-17, T1-20, T1-21, T1-22, T7a-18, T7b-10, T8a-08, T8a-09, T8a-10, T8a-17, T8b-10, V-L-c-01, V-T7a-03, VOL1-01

### Phase M — The hoopoe

The hoopoe. Verify on the deployed build or a production build: on localhost React Strict Mode kills the one-shot intro (T9-02, KNOWN, bugs.md #20), so dev screenshots of the auth birds lie.

- **High and Medium** (full entries in the report §8): T9-01, T9-03
- **Low** (the report's Low table): T9-05, T9-06, T9-07, T9-08, T9-09, T9-12, T9-13, T9-14, VT9-01

### Phase N — Feel and truth: presses, taps, comments and docs that lie

Last, one pass. Comment and doc lies are fixed by making the comment true, not by deleting it. L7-04 (press sinks) touches about 50 sites: screenshot a sample.

- **High and Medium** (full entries in the report §8): —
- **Low** (the report's Low table): C2-03, C7b-08, L7-04, L7-05, L7-07, L8-09, L8-10, L9-12, T4a-10, T4b-11, T8b-04, T8b-05, T8b-20, T9-11

## Ledger

One line per row as it lands: `<id> — DONE <sha> | DECLINED (why) | PARKED (why)`. A row's verdict-corrected
evidence stays in `work/`; this ledger is the record of what the campaign did.
