# Documentation Map

Every path below was verified against disk on 2026-09-08. If you add a doc directory, add it here in
the same change; if you delete one, delete its line. A map that lists folders which do not exist is
worse than no map, because it invites people to recreate them.

Repo-discovery files stay at the root:

- `README.md` — project overview and local setup.
- `AGENTS.md` — agent/project rules.
- `CLAUDE.md` — local Claude workflow instructions (start here — it points at the roadmap and specs).
- `progress.md` — the session history's INDEX: one line per session, newest first. The full entry
  lives in that month's file under `docs/history/`. Inverted 2026-09-07 (owner, campaign question
  20) because the old way round — full entries here, closed months moved out — had nothing
  enforcing it, so August never moved and the file reached 11,604 lines.
  `scripts/qa/progress-log.test.mjs` enforces the new shape.

Everything else is grouped here:

- `docs/ROADMAP.md` — the phased build plan; source of truth for decisions, shared components, data
  model, and the 13 phases.
- `docs/TRAPS.md` — what this stack does to you: the Postgres, Prisma, Next and Vercel facts that
  each cost a session, every one proved before it was written down. Read it before touching the
  database, a migration, a scheduled job, or anything that looks like a race.
- `docs/OPERATIONS.md` — every non-application tool and the moment each one is meant to fire: the
  visual suite, the CI gate, the nightly database backup, Sentry, Renovate.
- `docs/SECURITY.md` — the threat model, the gates that enforce it, and the audit status board.
- `docs/spec/DESIGN-SYSTEM.md` — **canonical for all design/brand decisions** (colour, shape, type,
  spacing, motion, feature naming, component reuse). Read this before any UI work; it supersedes the
  older per-topic specs where they overlap.
- `docs/spec/` — area specs. Fifteen files: `DESIGN-SYSTEM` (above), the ten area specs
  `admin`, `avatars`, `catchups`, `demo`, `directory`, `guide`, `letters`, `mascot`, `media`
  and `profile`, plus `hand-run-passes` (the protocol every pass where a session judges real
  members' data must conform to — `scripts/qa/hand-run-passes.test.mjs` fails one that does
  not), `lab-voice` (how a lab room is written), `person-row-audit` (an audit note, not an
  area spec) and `apple-edge-light` (a measurement write-up: what iOS draws inside an app
  icon, and the three reconstructions that were wrong). Some are superseded in part by
  DESIGN-SYSTEM.md and carry a banner at the top pointing there — **a banner is itself a
  dated claim and rots like the body it annotates**, so date the claim when you write one.
  There is deliberately no second index file here: this document is the only index, so the
  two cannot drift apart.
- `docs/planning/` — the working backlog, in three kinds:
  - **The live trackers**: `bugs.md` (the bug tracker) and `FEATURES.md` (parked ideas — diff
    against DESIGN-SYSTEM.md and ROADMAP.md before acting).
  - **Point-in-time research**, kept because the specs cite it: `leads-to-follow.md`,
    `letterloop-research.md`, and `other/`, which holds the four dialog, menu and focus
    digests that four separate specs were written from.
  - **The design campaigns that are not audits**, one folder each: `catchups-rework/`,
    `collection-rework/` (with the finished `collection-scrubber/` nested inside it, where its
    subject lives) and `class-collection/`. Each holds a `brief.md` in the owner's own words
    and a living `handover.md` or `spec.md` that every session of that campaign starts from
    and edits before it ends.
- `docs/audit-fix/` — every formal audit and its fix campaign, one dated folder each
  (`<yyyy-mm-dd>-<name>/`): the report and fix prompt/ledger at the top, the working
  evidence tucked under `work/`. `prompts/` holds the reusable audit prompts. The rule:
  an audit's artefacts move here in the commit that closes it, and its fix campaign edits
  the same folder's `fix-prompt.md` as the living handover. See `docs/audit-fix/README.md`.
- `docs/history/` — one file per month, holding every session entry in full. Written to as the
  session happens, not archived later. Nothing reads them; they are the record.
- `docs/content/` — writing-style notes, the delight idea bank, and the curated WhatsApp stories.
  `whatsapp-curation/picks.json` is read at runtime by `scripts/dev/seed-curated-content.ts`;
  it is data, not prose, so do not edit it for readability.

Local helper scripts live under `scripts/`:

- `scripts/qa/` — screenshot, crawl, and route verification helpers.
- `scripts/dev/` — one-off visual/dev harnesses.
- `scripts/demo/` — the public demo build: schema apply, seed, guard verification, Vercel env.
