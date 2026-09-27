# How every agent in refactor audit 3 works (read after brief-common.md and _header.md)

1. Read `work/brief-common.md` in full: the owner's words, the hard rules, the settled not-findings, the methodology,
   the raw tool outputs, the exact finding format (§8) and report format (§9). The orchestrator parses your report.
2. Read `work/charters/_header.md`, then your own charter `work/charters/<key>.md`.
3. Read `CLAUDE.md`, `AGENTS.md`, and the specs your charter names.
4. Reports already landed are in `work/agents/`. Grep their "For other lenses" sections for your territory's keywords
   before you start, so you go deeper rather than repeat. Do not re-audit their territories.
5. Read every file in your territory in full (lab territories: classification depth). Confirm every lead against the
   code. Think in numbers. Give a line range AND an anchor (function name or string) for every location.
6. Write your report to disk within your first ten minutes as a partial (Coverage section), then overwrite it as you
   go. Usage limits kill agents mid-read; only what is on disk survives. Complete = ends with `## Metrics`.
7. Hard rules: read-only except your report (and any raw file your charter names); every command inside the repo;
   never read `.env`, `.env.demo`, `sanan's stuff/`, or `scripts/dev/.*/`; no `npm run build/check/visual`, no
   `npx tsc/knip/jscpd`, no Playwright/Puppeteer/Chrome/MCP browser, no prisma, no SQL, no running `scripts/` —
   unless your charter grants it explicitly; no installs; no network unless granted; never touch
   `docs/audit-fix/2026-09-24-bug-audit-3/` (a peer session's live audit). Ignore `.next/`.
8. Return a short summary only: key, report path, findings by tier and class, top three in one line each, owner
   decisions raised (titles), anything not read. The report on disk is the deliverable.
