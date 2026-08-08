# Documentation Map

Every path below was verified against disk on 2026-08-07. If you add a doc directory, add it here in
the same change; if you delete one, delete its line. A map that lists folders which do not exist is
worse than no map, because it invites people to recreate them.

Repo-discovery files stay at the root:

- `README.md` — project overview and local setup.
- `AGENTS.md` — agent/project rules.
- `CLAUDE.md` — local Claude workflow instructions (start here — it points at the roadmap and specs).
- `progress.md` — running session history, append-only.

Everything else is grouped here:

- `docs/ROADMAP.md` — the phased build plan; source of truth for decisions, shared components, data
  model, and the 13 phases.
- `docs/spec/DESIGN-SYSTEM.md` — **canonical for all design/brand decisions** (colour, shape, type,
  spacing, motion, feature naming, component reuse). Read this before any UI work; it supersedes the
  older per-topic specs where they overlap.
- `docs/spec/` — area specs. Exactly: `avatars`, `catchups`, `demo`, `directory`, `lab-voice`,
  `letters`, `mascot`, `media`, `profile`. Some are superseded in part by DESIGN-SYSTEM.md and
  carry a banner at the top pointing there. There is deliberately no second index file here:
  this document is the only index, so the two cannot drift apart.
- `docs/planning/` — the working backlog: `bugs.md` (outstanding bugs and small fixes, consolidated
  on 2026-07-02 from the old `PUNCHLIST.md` + `FEEDBACK_CHECKLIST.md`, both since deleted),
  `FEATURES.md` (parked ideas — diff against DESIGN-SYSTEM.md and ROADMAP.md before acting), plus
  point-in-time briefs and reference material.
- `docs/content/` — writing-style notes, the delight idea bank, and the curated WhatsApp stories.
  `whatsapp-curation/picks.json` is read at runtime by `scripts/dev/seed-curated-content.ts`;
  it is data, not prose, so do not edit it for readability.

Local helper scripts live under `scripts/`:

- `scripts/qa/` — screenshot, crawl, and route verification helpers.
- `scripts/dev/` — one-off visual/dev harnesses.
- `scripts/demo/` — the public demo build: schema apply, seed, guard verification, Vercel env.
