@AGENTS.md

# Current work: visual + product redesign (read first)

A full redesign + MVP build is in progress. Before working, read these (they hold the approved
decisions, so you do not need the owner to re-explain):
- `docs/ROADMAP.md` — the phased build plan (decisions, shared components, data model, 13 phases). Source of truth.
- `docs/spec/` — deep specs per area. `docs/planning/FEEDBACK_CHECKLIST.md` — every owner instruction, tracked.
- `docs/planning/PUNCHLIST.md` — authoritative verified backlog and fork-sized batches.
- `task_plan.md` / `progress.md` — current status. `/preview/v2` (and `/preview/logos`) — the approved look to match.

Key locked decisions: light-mode-first (dark parked); flush green sidebar nav; warm dimmed surfaces (never pure
white); ruled-sheet feed; bird avatars (deterministic, 12 species) + photo override; one shared Composer/Feed/PostCard;
long-form posts = "Letters", newsletter feature = "Roundups", photo archive = "The Valley Collection"; the heart is
always red `#E03A33`; no em dashes anywhere; deploy to Vercel (local dev stays on SQLite; production on Turso/libSQL).
Brand palette below is SUPERSEDED by the tokens in `src/app/globals.css` (leaf `#1F8A4C`, sidebar `#235C49`,
sky `#3F7CA6`, cinnamon `#C2622F`).

# Project

Next.js 16 alumni website. Tailwind CSS v4, shadcn/ui (base-nova), Prisma ORM, NextAuth v5 (email+password;
magic links being removed), SQLite local / Turso (libSQL) production. Deploying to Vercel.

**Brand (legacy; see globals.css for live tokens)**: Leaf green `#22A845`/`#34C759`, Bark `#B8860B`/`#DAA520`, Clay `#E8DCC8`, Paper `#F8FBF8`, Ink `#1A1A2E`.
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

## Design Guardrails

- **Shadows**: Layered, color-tinted at low opacity. Never flat `shadow-md`.
- **Typography**: Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients**: Layer multiple radial gradients. SVG noise for texture where appropriate.
- **Interactive states**: Every clickable element needs `hover`, `focus-visible`, and `active`. No exceptions.
- **Spacing**: Use LiftKit golden ratio tokens from `.claude/skills/liftkit-spacing/SKILL.md`. Never arbitrary Tailwind steps.
- **Depth**: Layering system — base → elevated → floating. Use `.glass` utility for frosted overlays.
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
