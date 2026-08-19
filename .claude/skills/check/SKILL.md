---
name: check
description: Run every gate this repo already has (TypeScript, ESLint, the shape+colour protocol, the lab registry, the unit tests) and report what passed. Use after finishing any feature, before committing, and whenever asked whether the repo is clean.
---

# check

One command. Runs all five gates in parallel, ~17s from cold.

```bash
npm run check
```

Run a single gate while iterating: `npm run check -- types` (or `lint`, `protocol`, `lab`, `tests`).

## Why this exists

Every check here already lived in the repo, and every one was switched off in
practice, because running five commands by hand after each change is a
discipline nobody keeps. On 2026-08-08 that had let two design-system
violations sit in **production** code (a hand-typed easing curve inside the
shared `Button`, `bg-white` in the landing hero) while the rules forbidding both
were written down in three separate places. `docs/spec/DESIGN-SYSTEM.md` even
claimed "ESLint rules + PR template enforce the non-negotiables"; the PR
template had been deleted and ESLint was never run.

## Reading the output

| Row | Meaning |
|---|---|
| `ok` | clean |
| `warn` | findings that are a matter of degree; read them, decide, do not ignore |
| `FAIL` | a real defect. `types`, `lab` and `tests` are blocking; the run exits 1 |

`lint` and `protocol` are deliberately non-blocking. `eslint.config.mjs` sets
every design rule to `warn`, never `error`, on purpose: per DESIGN-SYSTEM these
"nudge, they never break the build." Do not "fix" that by making them errors.

## When a gate fails

- **TypeScript** — a real type error. Fix it.
- **ESLint** — if it is a design-system rule (`transition-all`, hand-typed
  `cubic-bezier`, `bg-white`), fix the code. If the code is genuinely a
  sanctioned exception, add `eslint-disable-next-line <rule> ` **with the reason
  written above it**, never a bare disable. Note `eslint-disable-next-line`
  binds to the literal next line: put prose first, directive last.
- **Shape + colour protocol** — `scripts/qa/protocol-audit.mjs`. It reads code
  with comments stripped, so a finding is real code, not prose. Either fix it or
  add an allowlist entry **with a stated reason** (the script's own header: an
  entry without a reason is itself a violation).
- **Lab registry** — a room exists on disk without a row in
  `src/app/lab/_registry.ts`, or vice versa. Add the row in the same change.
- **Unit tests** — the 14 standalone `*.test.mjs` scripts. Each throws on
  failure; the run prints the failing file's output.

## What it deliberately does not do

No browser, no dev server. Everything is static or in-process so it runs from a
cold terminal in seconds. Visual verification is a separate job: use the
`screenshot-qa` subagent, or `npm run screenshot` / `npm run screenshot:auth`.

Never wire this into a git hook. Committing is not where this belongs.
