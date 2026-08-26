---
name: UI Audit & Retrofit
description: Retroactively review and improve existing pages. Evaluates spacing, icons, animations, interactive states, and mobile responsiveness against the LiftKit system. Invoke when asked to review or improve existing UI.
trigger: When user asks to review, audit, improve, or retrofit existing UI pages.
---

# UI Audit & Retrofit Skill

Systematically review existing pages and produce actionable improvements.

## Audit Process

### Step 1: Screenshot Every Page
Use parallel sub-agents to screenshot all key pages (desktop + mobile).

Take the list from `scripts/qa/crawl.mjs`'s `routes` array rather than from here:
that one is exercised by `npm run verify:crawl`, and this one was not, so it spent
weeks naming `/groups` and `/settings` after both were deleted. The landing page
(`/`) is in it too; everything else in it needs a signed-in shot.

### Step 2: Evaluate Against LiftKit Rules
For each page, check (reference `.claude/skills/liftkit-spacing/SKILL.md`):

**Spacing:**
- [ ] Card padding uses optical correction (top < sides/bottom)
- [ ] Button padding follows golden ratio (px = font × 1.618, py = font / line-height)
- [ ] Element spacing uses the golden ratio scale, not arbitrary values
- [ ] Related elements are closer than unrelated elements
- [ ] Mobile spacing steps down one level

**Corner Rounding:**
- [ ] Border-radius proportional to padding (not arbitrary)
- [ ] Nested elements use inner-radius = outer-radius - gap
- [ ] No excessive pill shapes on rectangular buttons
- [ ] Images in cards use rounded-t-[inherit]

**Icons:**
- [ ] All actionable icons have labels or tooltips
- [ ] Icon size is proportional to surrounding text
- [ ] Decorative icons use Phosphor duotone, UI icons use Lucide
- [ ] Like/heart, comment, notification icons have micro-animations

**Interactive States:**
- [ ] Every clickable element has hover, focus-visible, and active states
- [ ] Hover states use transform/opacity only (no transition-all)
- [ ] Focus-visible uses ring for accessibility
- [ ] Active state provides tactile feedback (slight scale down)

**Animations:**
- [ ] Page transitions use Motion (Framer Motion) AnimatePresence
- [ ] Lists use AutoAnimate for add/remove transitions
- [ ] Only transform and opacity are animated
- [ ] Spring-style easing, no linear

**Typography:**
- [ ] Headings use Libre Baskerville (font-heading)
- [ ] Body uses Source Sans 3 (font-sans)
- [ ] Large headings have tight tracking (-0.03em)
- [ ] Body text has generous line-height (1.7)

**Colors:**
- [ ] No default Tailwind blue/indigo anywhere
- [ ] Primary = leaf green (#22A845 light / #34C759 dark)
- [ ] Accent = bark (#B8860B / #DAA520)
- [ ] Shadows are color-tinted, not flat shadow-md

**Depth:**
- [ ] Surfaces use layering (base → elevated → floating)
- [ ] Elevated surfaces have color-tinted shadows at low opacity
- [ ] Glass effect used appropriately for overlays

### Step 3: Produce Findings
Output a prioritized list:
1. **Critical** — Broken layout, accessibility issues, missing states
2. **High** — Spacing violations, wrong colors, missing animations
3. **Medium** — Suboptimal radii, icon improvements, typography tweaks
4. **Low** — Polish items, micro-interactions, optional enhancements

### Step 4: Fix Iteratively
For each fix:
1. Make the change
2. Screenshot (desktop)
3. Compare before/after — note specific improvements
4. Screenshot (mobile)
5. Verify mobile looks correct
6. Move to next fix

Use sub-agents to parallelize independent fixes across different pages.
