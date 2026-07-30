@AGENTS.md

# Current work: visual + product redesign (read first)

A full redesign + MVP build is in progress. Before working, read these (they hold the approved
decisions, so you do not need the owner to re-explain):
- `docs/spec/DESIGN-SYSTEM.md` — canonical brand + design language (colours, shape, motion, naming). Read before any UI work.
- `docs/ROADMAP.md` — the phased build plan (decisions, shared components, data model, 13 phases). Source of truth.
- `docs/spec/` — deep specs per area.
- `docs/planning/bugs.md` — outstanding bugs and small fixes (consolidated 2026-07-02 from the old feedback checklist + punchlist). `docs/planning/FEATURES.md` — parked feature ideas.
- `progress.md` — session history. `/preview/v2` — the approved look to match. `/preview/logo` documents the
  final mark. (`/preview/logos` is the superseded early exploration; `/preview/decisions` does not exist.)
- **`/lab` is the one index of every dev and preview room.** Nothing is browsable that is not listed there.

Key locked decisions: light-mode-first (dark parked); flush green sidebar nav; warm dimmed surfaces (never pure
white); ruled-sheet feed; bird avatars (deterministic, 50 species, real colors, no disc — shipped, see
docs/spec/avatars.md) + photo override; one shared Composer/Feed/PostCard;
long-form posts = "Letters", newsletter feature = "Catch-ups" (docs/spec/catchups.md; "Roundups" was rejected
by the owner, see docs/ROADMAP.md), photo archive = "The Valley Collection"; the heart is
always red `#E03A33`; no em dashes anywhere; deploy to Vercel (database on Supabase Postgres, `ap-south-1` Mumbai, for both production and local dev; user images on Cloudflare R2).
Brand palette below is SUPERSEDED by the tokens in `src/app/globals.css` (leaf `#1F8A4C`, sidebar `#235C49`,
sky `#3F7CA6`, cinnamon `#C2622F`).

# Project

Next.js 16 alumni website. Tailwind CSS v4, shadcn/ui (base-nova), Prisma ORM, NextAuth v5 (email+password; magic links removed), Postgres via Prisma's `pg` adapter (Supabase, `ap-south-1` Mumbai, for production and
local dev). User images on Cloudflare R2. Deployed to Vercel.

**Brand**: canonical rulebook is `docs/spec/DESIGN-SYSTEM.md` (live tokens in `src/app/globals.css`). Short
version: Canopy `#235C49` is the one green for every CTA and the sidebar; Leaf `#1F8A4C` is an accent/highlight
only, never a button fill; Cinnamon `#C2622F` is the secondary accent; the heart is always `#E03A33`. All
CTAs/chips/tags are full pills. Do not use the old three-greens palette below except as historical reference.
**Fonts**: Libre Baskerville (headings), Source Sans 3 (body).
**Icons**: Lucide React for UI chrome. `@phosphor-icons/react` duotone for decorative/hero contexts.
**Animation**: `motion` (Framer Motion) for micro-interactions. `@formkit/auto-animate` for list transitions.

## Hard Rules

- **Containment**: ALL commands run inside `/Users/sanan/Documents/rv-alumni/`. Never execute anything outside this folder without explicit permission.
- **Storage**: Folder max 5GB. Don't install packages >200MB without asking.
- **Git commits**: NEVER include `Co-Authored-By`, model names, `noreply@anthropic.com`, or any AI attribution. Plain conventional commit messages only.
- **Mobile**: Every desktop UI change MUST be verified on mobile (390×844). Screenshot both viewports.
- **No `transition-all`**: Only animate `transform` and `opacity`. Use spring-style easing.
- **No default Tailwind blue/indigo**: Always use the brand palette above.

## Working Agreement

### BEFORE work

- Read `docs/spec/DESIGN-SYSTEM.md` plus the relevant `docs/spec/*` file for the area you're touching.
- Confirm the shapes you're about to build against `/preview/v2` (the approved look); browse `/lab` for the
  room that already explored the area.
- Import shared primitives (`Button`, `BirdAvatar`, `LoveButton`, `FeedColumn`, `src/components/common/motion.tsx`)
  instead of hand-rolling. Do not rebuild what already exists.
- Check `components.json` for installed shadcn components before adding a new one.

### AFTER work

- Every clickable element has `hover`, `focus-visible`, and `active` states. No exceptions.
- CTAs are canopy pills (`rounded-full`, Canopy `#235C49` fill).
- Only `transform`/`opacity` are animated. No `transition-all`. No hand-typed `cubic-bezier(...)`; import
  `EASE_POP`/`EASE_SPRING`/`SPRINGS` from `src/components/common/motion.tsx` instead.
- Any new async route ships a `loading.tsx` using the warm shimmer, not a grey pulse.
- Desktop (1440) and mobile (390) screenshots taken and reviewed, minimum 2 rounds.
- Run `/simplify`.
- Run a security review if the change touches auth, data, or forms.
- No em dashes anywhere in copy.
- User-facing naming says "Rishi Valley", never "RV Alumni" or "Alumni".

## Skills — When to Invoke

| Trigger | Skill |
|---------|-------|
| Before ANY UI code or design decision | `/frontend-design` |
| Every UI task (spacing, padding, radii, buttons, cards) | Read `.claude/skills/liftkit-spacing/SKILL.md` |
| After completing a feature, before committing | `/simplify` |
| Polishing typography, spatial layout, eliminating AI-slop | `/impeccable` — use `/audit`, `/polish`, `/typeset` |
| Screenshotting authenticated pages | Read `.claude/skills/screenshot-auth/SKILL.md` |
| Retroactively reviewing existing pages | Read `.claude/skills/ui-audit/SKILL.md` |
| Starting a multi-step task or new feature | Use planning-with-files (`task_plan.md`, `findings.md`, `progress.md`) |
| Debugging a stubborn bug (2+ attempts) | Use superpowers systematic debugging |
| Before deploying or merging significant changes | `/simplify` then review security with VibeSec patterns |

## Sub-Agent Patterns

Use sub-agents liberally to keep the main context clean. Prefer more agents over a cluttered context.

**Parallel Desktop + Mobile**: After any UI change, spawn two sub-agents simultaneously — one screenshots desktop (1440×900), the other screenshots mobile (390×844). Both compare against the liftkit spacing rules.

**Implement → Simplify → Review Pipeline**: For any non-trivial feature:
1. Implement the feature
2. Run `/simplify` to check code quality
3. Run a security review sub-agent if touching auth/data/forms
4. Screenshot and verify visually

**Model tiers**: The main session model (`/model`) is the orchestrator; it plans, delegates, and makes judgment calls. Sub-agents (the `Agent` tool's `model` param, or `agent(prompt, { model })` inside a Workflow script) run independently of it:
- **Sonnet** — default for implementation and review sub-agents: writing code, `/simplify`, `/code-review`, `/security-review`, the pipeline above.
- **Opus** — the orchestrating session itself, or a sub-agent facing an ambiguous product/design/architecture call the spec docs don't already answer.
- **Haiku** — trivial mechanical sub-agent work (running a screenshot script, a targeted grep, formatting output).

Saved workflow `.claude/workflows/implement-review.js` runs this pattern end to end: `Workflow({ name: 'implement-review', args: { task: '...' } })` hands the task to a Sonnet implementer, then a second Sonnet agent reviews it before handoff.

**Research Agents**: For complex problems, spawn an Explore agent to research the codebase before implementing. Don't duplicate the research yourself.

**Agent Teams**: For multi-area work (e.g., changing both frontend + backend + database), use multiple agents working in parallel on independent parts.

## Screenshot Workflow

Dev server: `npm run dev` on `http://localhost:3000`. Start in background if not running.

| Command | Use |
|---------|-----|
| `node scripts/qa/screenshot.mjs http://localhost:3000` | Public pages (landing, login) |
| `node scripts/qa/screenshot.mjs http://localhost:3000/route label` | Public with label |
| `node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed` | Authenticated pages |
| `node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed --mobile` | Authenticated mobile |

Screenshots save to `./temporary screenshots/screenshot-N.png` (auto-incremented).

**Protocol**:
1. Screenshot desktop → Read PNG → inspect visually
2. Make fixes → re-screenshot → compare (be specific: "heading gap is 24px, should be 16px")
3. **Minimum 2 rounds** before declaring done
4. Screenshot mobile → repeat review
5. **Skip iteration on animated elements** — they produce inconsistent frames

**Gotchas (these have bitten past sessions):**
1. **Stale `.next` cache.** If every route 404s, or a `globals.css` change does not show up, the Turbopack `.next` cache is corrupt. `rm -rf` is blocked and an in-folder move can exceed the 5GB cap, so move it to the scratchpad (same volume, instant): `mv .next "<scratchpad>/next-old"` then `npm run dev`. Always clear `.next` and restart after editing `globals.css` (HMR does not reliably pick up token/CSS-rule changes).
2. **Screenshots need real Chrome.** The bundled Puppeteer Chrome is broken here. `scripts/qa/screenshot.mjs` now auto-falls-back to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; any sub-agent driving Puppeteer directly must set `PUPPETEER_EXECUTABLE_PATH` to that path or it cannot screenshot.
3. **Verify at runtime, not just `tsc`.** `tsc --noEmit` has passed a Prisma `select` on a non-existent column that then 500'd the feed. Always screenshot the surface and watch the console / server log for `PrismaClientValidationError` / `pageerror`.
4. **Every new preview/dev page must be registered.** Add it to `src/app/lab/_registry.ts` (the single index at `/lab` for every dev/preview room) in the same change, and run `node scripts/qa/lab-audit.mjs` to prove nothing is stranded.

## Design Guardrails

Canonical rulebook: `docs/spec/DESIGN-SYSTEM.md`. This section is a quick-reference summary; if it ever
disagrees with that doc, the doc wins.

- **Colour**: Canopy `#235C49` for every CTA and the sidebar (the one green; don't reintroduce a second
  or third green fill). Leaf `#1F8A4C` is an accent/highlight only. Cinnamon `#C2622F` is the secondary
  accent. Sky `#3F7CA6` is a sparing cool pop. The heart is always `#E03A33`.
- **Shape**: CTAs, chips, and tags are full pills (`rounded-full`). Cards are 16px radius; a box nested
  inside another box is never the same radius as its container. Inputs are 12px (the feed composer's
  inline post box is the pill exception). Avatars are full circles.
- **Shadows**: Layered, color-tinted at low opacity. Never flat `shadow-md`.
- **Typography**: Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients**: Layer multiple radial gradients. SVG noise for texture where appropriate.
- **Interactive states**: Every clickable element needs `hover`, `focus-visible`, and `active`. No exceptions.
- **Spacing**: Use LiftKit golden ratio tokens from `.claude/skills/liftkit-spacing/SKILL.md`. Never arbitrary Tailwind steps.
- **Depth**: Layering system: base to elevated to floating. The `.glass` utility (translucent surface plus
  backdrop blur) exists for sticky nav and overlays; use it, don't hand-roll another frosted effect.
- **Images**: Gradient overlay (`bg-gradient-to-t from-black/60`) and color treatment with `mix-blend-multiply`.
- **Micro-animations**: Use `motion` for like hearts, bell shakes, page transitions. Use `@formkit/auto-animate` for list add/remove. Animate only `transform` and `opacity`.

## Reference Images & Inspiration

When the user provides reference images or screenshots of other websites:
- Match layout, spacing, typography, and color faithfully
- Swap in project-specific content (brand colors, fonts, real data)
- Screenshot output, compare against reference, fix mismatches
- Do at least 2 comparison rounds with specific callouts
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows

## Working with Existing Code

This is an existing codebase — read before modifying. Do not start from scratch unless explicitly asked.
- Use the existing component structure in `src/components/`
- Use existing shadcn/ui components from `src/components/ui/`
- Check `components.json` for installed shadcn components before adding new ones
- Reuse existing utilities (`cn()` from `src/lib/utils.ts`, Prisma client from `src/lib/prisma.ts`)
- Check existing patterns in similar components before writing new ones
