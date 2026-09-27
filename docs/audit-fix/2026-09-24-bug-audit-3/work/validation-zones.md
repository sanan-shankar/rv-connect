# Validation zones (Phase 2)

One adversarial validator per zone; brief = `work/brief-validator.md`; verdicts to
`work/verdicts/<zone>.md`. A zone is one finder report, or two small ones that share code.
Launch order follows report completion. `Done` = verdict file present with a `## Coverage` section.

| Zone | Reports (ids) | Findings | Notes for the validator |
|---|---|---:|---|
| V-T1 | T1 | 25 | T1-01 is already proven with the real functions; T1-17's EXPLAIN is in the report |
| V-T7a | T7a | 23 | T7a-01 and T7a-21 hand-verified by the orchestrator; T7a-05 depends on Fluid (owner question 7, default Fluid → Low) |
| V-T5 | T5 | 17 | T5-01/02/03 hand-verified; T5-17 = O-03 (fold as canonical O-03) |
| V-T2 | T2a + T2b | 27 | T2a-01/02, T2b-01 hand-verified (T2b-01 timed by the orchestrator: 40,000 chars 20 s) |
| V-T4 | T4a + T4b | 27 | T4a-01 hand-verified live; T4b-08 REFUTED live; T4b-13 re-ruled Low live (Base UI stops arrow keys); T4b-02 = T8b-01 |
| V-T6 | T6 | 15 | T6-04, T6-05, T6-12, T6-15 confirmed live; T6-02 = T2a-01 writer half |
| V-O-L1 | O + L1 | 12 | O-01/03/05/06 are orchestrator-proven; L1-01/L1-04 hand-verified |
| V-T3 | T3 | ≥16 | T3-01/02/03 hand-verified at source |
| V-T7b | T7b | ≥14 | — |
| V-T8 | T8a + T8b | ≥25 | T8b-01 canonical for the Dialog refused-close defect |
| V-T9 | T9 | ? | — |
| V-L-a | L2 + L3 | ? | — |
| V-L-b | L4 + L10 + L11 | ? | — |
| V-L-c | L5 + L8 | ? | the 2k dossier's numbers get a second pair of eyes |
| V-L-d | L6 + L12 + L9 + L7 | ? | — |

## Zone notes as of 2026-09-27 02:25 BST (what the orchestrator has already settled, per zone)
- **V-T2 (T2a + T2b)**: T2a-01/02 hand-verified; T2b-01 timed by the orchestrator (40,000 chars → 20 s); T6-02 is T2a-01's writer half (fold into T2a-01); L10-01 door 1b (a batch-year edit collects a batch Catch-up a night) extends T2a-01; L4-01 (a missing COLUMN on any Catchup* table reads as "not set up yet") touches the engine's catch; T7b-15 owns the deadline wording and the never-withdrawn final reminder. Owner questions drafted for T2a-06 (hold stops the running Edition), T2a-07 (ending a Catch-up strands answers), T2a-13 (blocked/leaving members inside a Catch-up).
- **V-T4 (T4a + T4b)**: T4a-01 hand-verified live; T4b-01 CONFIRMED at source by the orchestrator (the viewer keeps an index; `listFor("main")` is the live `photos`); T4b-02 is T8b-01's Collection instance (T8b-01 canonical); T4b-03 hand-verified; T4b-08 REFUTED live in its main claim (no RSC refetch; the geometry select stays a Low for L5); T4b-13 re-ruled Low live (Base UI stops arrows at the popup; `+ - 0` still zoom the photo behind). Also rule: V-T1-02 (collection-intake's raw `Promise.all` over two uploads orphans the landed one), V-T4a-A (the tick copies the feed's 1920 px display copy into the Collection, which stores full resolution), V-T4a-B (`use-composer-uploads.ts:187` closes over a stale `shots`) — see leads-routed.md "From T4a".
- **V-T6 (T6)**: T6-04, T6-05, T6-06, T6-12, T6-15 confirmed LIVE; T6-02 = T2a-01 (fold). Also rule the orchestrator's three live candidates (work/live/blns-live.md): V-O-A (an UNCONFIRMED member's directory search shows "3 results" — a match-count oracle on the surface M1 built to withhold names), V-O-B (an unclosed U+202E in a name reverses it in the page heading and the sidebar — spoofing; L6-02 extends it app-wide), V-O-C (the "+91" box plus a trunk-zero mobile stores `+9109845033712`).
- **V-T7a (T7a)**: T7a-01 and T7a-21 hand-verified; T7a-05's severity depends on Fluid compute (owner check). 
- **V-T3 (T3)**: T3-01/02/03 hand-verified at source; T3-20 reproduced by the finder through `layoutMagazine` (owner-only tool); T3-16 and T7b-03 are the same skipped migration (pick canonical); T3's `anonymous` system-row lead is filed by L10 (door 2 of L10-01).
- **V-T7b (T7b)**: T7b-15 and T7b-22 verified at source by the orchestrator; T7b-03 = T3-16; T7b-21 overlaps T8b's PostHog lead; T7b-01 (the backup metric 403s every run) pairs with L3-08 (the media backup job itself fails every night — CONFIRMED by the orchestrator from GitHub logs).
- **V-T9 (T9)**: T9-01 CONFIRMED at source; T9-04 mechanism confirmed (no failure path on `next/dynamic`, no `global-error.tsx`; T8b-07 canonical for the missing global boundary); T9-02 explains the KNOWN bugs.md #20 (dev-only Strict Mode) — rule how it is filed (KNOWN with a diagnosis, not a new defect).
- **V-O-L1 (O + L1)**: O-01, O-03, O-05, O-06 orchestrator-proven (O-06 live on four reads and a write); **O-07 NEW** (the app's database connection is plaintext — proved live read-only; production depends on Vercel's `DATABASE_URL`); O-02 downgraded to an artefact; L1-01/L1-04 hand-verified; V-T1-03 changes O-06's picture on a pre-loaded feed.
- **V-L-a (L2 + L3)**: L3-08 CONFIRMED by the orchestrator from `gh run view` (28 of 39 backup runs failed, 111 GetObjectTagging copy failures in the latest). L2 is being finished by a relaunched agent.
- **V-L-b (L4 + L10 + L11)**: L4-01 verified at source; L4-06 reproduced offline by the finder (3,002 ms); L10-01 — orchestrator leans HIGH (a stranger claiming a batch year reads that batch's Catch-up names, answers and photographs unconfirmed); L11 is being finished by a relaunched agent.
- **V-L-c (L5 + L8)**: L5-01/02/07's plan facts verified by the orchestrator (Supabase FREE per the repo; Vercel Hobby limits fetched 2026-09-24); L5-02's refusal-path write verified at `auth.ts:104-111`; L8 re-verifies vendor numbers.
- **V-L-d (L6 + L12 + L9 + L7)**: L6-07 CONFIRMED LIVE by the orchestrator (2026-09-27: a repeated `token=` → 500 on /reset-password and /verify-email); L6-01 executed by the finder through the real serializer.
