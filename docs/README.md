# Documentation Map

Repo-discovery files stay at the root:

- `README.md` — project overview and local setup.
- `AGENTS.md` — agent/project rules.
- `CLAUDE.md` — local Claude workflow instructions (start here — it points at the roadmap and specs).
- `task_plan.md`, `findings.md`, `progress.md` — active planning files used by local Claude hooks.

Everything else is grouped here:

- `docs/ROADMAP.md` — the phased build plan; source of truth for decisions, shared components, data
  model, and the 13 phases.
- `docs/spec/DESIGN-SYSTEM.md` — **canonical for all design/brand decisions** (colour, shape, type,
  spacing, motion, feature naming, component reuse). Read this before any UI work; it supersedes the
  older per-topic specs below where they overlap.
- `docs/spec/` — area specs (avatars, catchups, letters, mascot, onboarding, profile, directory, ia,
  media, landing, infra). Some are superseded in part by DESIGN-SYSTEM.md; superseded ones carry a
  banner at the top pointing there. (The old `delight.md` is archived — see `docs/archive/`.)
- `docs/planning/` — the working backlog: `PUNCHLIST.md` (authoritative verified backlog),
  `FEEDBACK_CHECKLIST.md` (every owner instruction, tracked), `FEATURES.md` (parked/uncommitted
  ideas — diff against DESIGN-SYSTEM.md and ROADMAP.md before acting), plus audits, delight feedback,
  and rebuild-plan history.
- `docs/contract/` — visual contract screenshots and standalone reference.
- `docs/content/` — copy inventory, writing style, and delight/motion notes.
- `docs/operations/` — deploy, handoff, and performance notes.
- `docs/reference/` — collected external/reference material.
- `docs/archive/` — retired, point-in-time docs kept for history (git-tracked, superseded, not current).

Outside `docs/`, `.planning/` also exists at the repo root (GSD-style planning state: `PROJECT.md`,
`ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `intel/`). It is **untracked by git** (never committed) and
not part of this doc tree; treat it as local working state, not a citable source, and never delete it
from disk. Where something in `.planning/` was worth preserving long-term, it has been copied (not
moved) into `docs/planning/` so it becomes git-tracked — for example `docs/planning/INGEST-CONFLICTS.md`.

Local helper scripts live under `scripts/`:

- `scripts/qa/` — screenshot, crawl, and route verification helpers.
- `scripts/dev/` — one-off visual/dev harnesses.
