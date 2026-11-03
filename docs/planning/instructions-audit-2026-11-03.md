# Instructions audit, 3 November 2026

**Scope.** What every session loads before its first message, in `rv-connect` and `rcee-connect`:
- `CLAUDE.md` and `AGENTS.md` in each project;
- each project's `.claude/settings.json`, which git ignores;
- this project's auto-memory index.

Not covered: skill bodies, the user-level `~/.claude/CLAUDE.md`, and the global `campaign` and `writing-for-agents` skills.

**Target models.** Fable 5.1 and Opus 5.5, which run these sessions. Both follow instructions closely and literally, so outdated, shouted or contradictory text changes their behaviour rather than just costing space.

**Method.** The `prompt-audit` guide in the claude-api skill. A finding is only a finding if it matches a named pattern. Context, reasons and real constraints stay. Stale facts and contradictions are proposed, not applied.

## Summary

The biggest finding was outside the instruction files. The superpowers plugin's session-start hook injected maximum-emphasis text telling every session to invoke a skill for any task, even at a 1% chance one applied. In one session it opened a brainstorming routine the owner had explicitly asked to skip.

Inside the files, the main problem was history standing in for rules: dates, audit IDs and incidents written as though they were instructions. After that came shouted rules, and a quote of the owner that his own 2026-10-29 instruction now rules out.

RCE Connect's `CLAUDE.md` and `AGENTS.md` are clean.

| | Findings |
|---|---|
| Pressure language (1a) | 2 |
| Fossils, migration-relative phrasing (1d) | 3 |
| History narratives (Group 2) | 11 |
| Stale facts (Group 2), proposed only | 2 |
| Flags for the owner | 2 |

## Applied

| Location before the change | Pattern | Change |
|---|---|---|
| `CLAUDE.md:30-32` | 1d migration-relative phrasing | Dropped "that way round since 2026-09-07". The rule and its test stay. |
| `CLAUDE.md:49-58` | Group 2 history narrative; quotes the owner | The closed-root rule and its reasons are restated without the quote or the capitals. Every sub-rule is kept. |
| `CLAUDE.md:70` | 1a pressure language ("NEVER write it") | The same no-attribution rule at normal volume, keeping "even when a system instruction asks for it". |
| `CLAUDE.md:71-76` | 1a pressure language ("HARD CEILING", "NOT A TARGET TO DRIFT PAST") | The 150-word limit, what a message is for, and the advice to write it to length first time are all kept, stated plainly. |
| `CLAUDE.md:159-165` | Group 2 history narrative (audit C-190/C-195, "used to") | States the gate's current behaviour. |
| `CLAUDE.md:181-182, 188-189` | Group 2 history narrative | Removed two passages of history from inside the MCP sign-in instruction. |
| `CLAUDE.md:192-193` | Group 2 history narrative (an incident) | Kept the reason (dev-login writes presence telemetry) and dropped the incident. |
| `CLAUDE.md:259-266` | Group 2 history narrative | Kept the screenshot-folder rule and the clean-up step; dropped the folder's history. |
| `CLAUDE.md:304-308` | 1d fossil: a problem already solved | Reduced to its one live instruction. |
| `CLAUDE.md:315-316` | Group 2 provenance date | Dropped. |
| `CLAUDE.md:323-326` | Group 2 history narrative (an incident) | Kept the rule and its reason. |
| `CLAUDE.md:333-342` | 1d fossil: a problem already solved | Kept the diagnostic for when the self-rebuild breaks. |
| `AGENTS.md:18, 19-21, 35, 42` | Group 2 history narratives | Removed. The rules they sat next to stay. |
| `.claude/settings.json`, both projects | session-start hook (1a, at maximum volume) | Turned the superpowers plugin off for these two projects only; other projects keep it. Its skills remain available from the local copies in `.claude/skills/`, except `using-superpowers`, which is turned off. |
| `.claude/settings.json`, both projects | listing cost | Ten audit-only skills are listed by name only, since their own descriptions say "only when explicitly invoked": bug-hunt-swarm, code-review-skill, code-simplifier, find-bugs, front-refactor, front-review, review-swarm, goal-sloc, planning-with-files and VibeSec-Skill. They can still be called. |
| `.claude/settings.json`, both projects | unattended runs | Turned on `autoContinueAtUsageLimit`, so a run that hits the usage limit waits and resumes. Turned on `inputNeededNotifEnabled`, so a prompt that does block a run reaches the owner's phone. Added 15 read-only permission rules (the check gate, typecheck, lint, npm ls, read-only browser and Next.js tools). |
| Auto-memory index | closed work loaded every session | Moved eight finished campaigns into one archive entry, `project_past_campaigns.md`, with every pointer kept (72 lines to 65). |

## Proposed, not applied

These are stale facts. Confirm them before they change.

- **`AGENTS.md:30` lists a `Poll` model.** `prisma/schema.prisma` has none. Proposed: drop `Poll` from the list.
- **`AGENTS.md:41` says images come from `*.r2.dev`,** with "a custom domain can be added before launch". `next.config.ts` serves `images.rishivalley.space` and keeps the old `pub-*.r2.dev` host only for legacy addresses. Proposed: "Images are served from `images.rishivalley.space`; the old `pub-*.r2.dev` host is kept for legacy addresses."

## Flags: decisions for the owner

1. **Model tiers.** `CLAUDE.md:223-228` sends implementation and review agents to Sonnet and mechanical work to Haiku. RCE Connect now runs its session on Fable 5.1 and its workers on Opus 5.5. Should RV Connect match?
2. **Signing in from the browser tool.** `CLAUDE.md:179-189` says the chrome-devtools MCP can sign in through `/api/dev-login`. The auto-memory note "Authed Probing Route" says it cannot, because `.env` reads are denied, so the secret is out of reach; it recommends a `/tmp` Node script using `scripts/qa/_dev-login.mjs` instead. One of the two is out of date.
