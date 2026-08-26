# Documentation Map

Every path below was verified against disk on 2026-08-26. If you add a doc directory, add it here in
the same change; if you delete one, delete its line. A map that lists folders which do not exist is
worse than no map, because it invites people to recreate them.

Repo-discovery files stay at the root:

- `README.md` — project overview and local setup.
- `AGENTS.md` — agent/project rules.
- `CLAUDE.md` — local Claude workflow instructions (start here — it points at the roadmap and specs).
- `progress.md` — running session history, append-only. Closed months are archived to
  `docs/history/` (see below), so this file holds the current month.

Everything else is grouped here:

- `docs/ROADMAP.md` — the phased build plan; source of truth for decisions, shared components, data
  model, and the 13 phases.
- `docs/spec/DESIGN-SYSTEM.md` — **canonical for all design/brand decisions** (colour, shape, type,
  spacing, motion, feature naming, component reuse). Read this before any UI work; it supersedes the
  older per-topic specs where they overlap.
- `docs/spec/` — area specs. Exactly: `admin`, `avatars`, `catchups`, `demo`, `directory`,
  `lab-voice`, `letters`, `mascot`, `media`, `profile`, plus `person-row-audit` (an audit
  note, not an area spec). Some are superseded in part by DESIGN-SYSTEM.md and
  carry a banner at the top pointing there. There is deliberately no second index file here:
  this document is the only index, so the two cannot drift apart.
- `docs/planning/` — the working backlog: `bugs.md` (the live bug tracker), `FEATURES.md`
  (parked ideas — diff against DESIGN-SYSTEM.md and ROADMAP.md before acting), plus
  point-in-time reference material (`leads-to-follow.md`, `letterloop-research.md`).
- `docs/audit-fix/` — every formal audit and its fix campaign, one dated folder each
  (`<yyyy-mm-dd>-<name>/`): the report and fix prompt/ledger at the top, the working
  evidence tucked under `work/`. `prompts/` holds the reusable audit prompts. The rule:
  an audit's artefacts move here in the commit that closes it, and its fix campaign edits
  the same folder's `fix-prompt.md` as the living handover. See `docs/audit-fix/README.md`.
- `docs/history/` — closed months of `progress.md`, moved here unedited once the month ends,
  in the same commit as an ordinary session entry. Nothing reads them; they are the record.
- `docs/content/` — writing-style notes, the delight idea bank, and the curated WhatsApp stories.
  `whatsapp-curation/picks.json` is read at runtime by `scripts/dev/seed-curated-content.ts`;
  it is data, not prose, so do not edit it for readability.

Local helper scripts live under `scripts/`:

- `scripts/qa/` — screenshot, crawl, and route verification helpers.
- `scripts/dev/` — one-off visual/dev harnesses.
- `scripts/demo/` — the public demo build: schema apply, seed, guard verification, Vercel env.
