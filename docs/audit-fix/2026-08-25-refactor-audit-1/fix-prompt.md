# Refactor audit 1 — fix campaign (LIVING HANDOVER)

**This file is the entire handover.** The owner starts a fix session by @-ing it and
nothing else. You (the fix session, running on Opus, max effort) read it top to bottom,
execute the next unfinished work, and **edit this same file before your session ends** —
status board updated, session log appended — so the next session can be started by @-ing
it again. If you die mid-item, whatever you already wrote here is the recovery point; a
session that hears "continue" re-reads this file first.

## What this campaign is

Execute the six-phase plan in [`report.md`](report.md) (§2), produced by the 2026-08-25
refactor/simplification audit: 241 verified findings, ~4,500–5,500 lines of dead and
duplicated code, ~6.4 MB of tracked dead weight, ~360–380 KB of JavaScript off every
member page, and the process mechanisms in §7. Every plan row cites finding ids; the full
evidence, exact line ranges, steps, risks and gates for an id live in
`work/agents/<prefix>.md`. **Corrections from the adversarial verification override the
agent text** — report §3 lists the load-bearing ones; `work/verify/<cluster>.md` has the
rest. Read the agent entry AND the §3 corrections for every item before touching code.

## Status board (update every session)

- [ ] Phase 1a — dead code in src (~1,800 lines)
- [ ] Phase 1b — root, docs, assets, dependencies
      (**partially done 2026-08-26**: the "archive the closed bug audit" item — move,
      JSON-dump deletion, ledger owner-block into bugs.md — was executed by the
      `docs/audit-fix/` reorganisation, commit `docs(audit-fix)`. Also already done there:
      catchups-fixes-brief deletion + its spec banner, docs/README index refresh incl. the
      spec-list drift. Do NOT redo; the remaining 1b rows stand.)
- [ ] Phase 2 — placeholders, flags, Groups residue
- [ ] Phase 3 — dedupe at lib level
- [ ] Phase 4 — dedupe at component/route level (may be two sessions)
- [ ] Phase 5 — bundle & build (+ before/after measurements vs report §1a)
- [ ] Phase 6 — schema & architecture (owner-gated throughout)
- [ ] Close-out: re-measure §1b's table, write the deltas into report §1b, flip this
      audit's row in `../README.md` to Closed, archive per report §7.4.

Within a phase, mark finished items inline in the session log with their commit SHA.
Phases 1–4 are mutually independent; 5 after 1–2; 6 needs owner approvals.

## Owner input map

The owner gives input before the phase that needs it — ask at phase start, in plain
language, only for that phase's decisions (report §4 has the full wording + recommendations):

| Before | Decisions needed (§4 #) |
|---|---|
| 1b | WhatsApp originals delete (#3-adjacent, rd-02); overflow PDF destination; brand 4096 PNG; xlsx path (#14) |
| 2 | Showcase fate + where the public Privacy/Terms links live NOW (#1); tour for members (#2); /donate redirect-vs-delete (#16/18); Profession filter removal (#10); LogoFact (#11); About page (#3) |
| 5 | Duplicate TS check on deploys (#5); Vercel Analytics (#7); lab CSS measurement authorisation (#6) |
| 6 | ALL database drops (#4, incl. the Visit trio and the orphan reverted-Catchup tables); Collection taxonomy SELECT verdict (#16); avatarColor column |
| any time | Skills/agents relocation after the campaign (#8); probe retirement (#9); email queue (#12, post-launch); birds sprite (#13, quiet week); "sanan's stuff" move (#15, owner does it himself); §7 CLAUDE.md wording sign-off |

If a decision hasn't arrived, do the phase's autonomous items, skip the gated ones, and
list them under "awaiting owner" in the session log.

## Rules (non-negotiable)

1. One revertable commit per coherent item — code + its test edits + doc edits + moved
   visual baselines together. Plain conventional messages, no AI attribution, never push.
2. `npm run check` before every commit; `npm run visual` after any UI-touching item (read
   diffs before `visual:update`, stage updated PNGs with the item). ⚠ items name pinned
   tests — those test edits ride the same commit or check fails honestly.
3. The tree is shared: stage by name, never `git add -A`, never touch others' WIP. Never
   `prisma db push`; schema changes go schema-edit → dated file in
   `prisma/migrations-manual/` → `npx prisma generate` → `run-sql.mjs`, BOTH databases.
4. Re-verify dead-code claims cheaply at HEAD before deleting (one grep) — the tree moves
   between sessions; one audit finding was refuted by a same-day commit.
5. Usage discipline: this is mostly hand-work; agents only where the report says a sweep
   is mechanical and big (e.g. the 57-file `m.` rename). No fan-out without a wave plan.
6. Owner-visible changes (anything a member could see, incl. side effects) get named to
   the owner in the session summary — his standing rule.
7. DB checks the audit couldn't run (marked in items): run the exact SQL given, read-only,
   before the dependent deletion.
8. On "kowalski": instant compact progress report (item n/m + %s), per CLAUDE.md.
9. On "close it out": scratch files deleted or ledgered, tree clean of yours,
   `temporary screenshots/` pruned, progress.md entry staged with the work.

## Suggested session slicing

1a · 1b · 2 · 3 · 4 (×2 if needed) · 5 · 6 — seven-to-eight sessions. Take the next
unchecked phase unless the owner names one. Finish an item's commit before ending; never
leave a half-item uncommitted without describing its exact state in the session log.

## Session log (append; newest last)

*(none yet — campaign not started)*

Template:
```
### <date> — session N (phase X)
Done: <item> → <sha>; <item> → <sha>
Skipped/awaiting owner: ...
Verification: check ✓/✗, visual ✓/✗ (+what was eyeballed)
State left: <clean | exact description of any in-flight work>
Next session: <the single next thing>
```
