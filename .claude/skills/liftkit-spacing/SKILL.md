---
name: LiftKit Spacing & Corner Rounding
description: Golden ratio spacing system with optical corrections and Apple-style squircle corners. Invoke for every UI task — new components, layout changes, and retroactive spacing audits.
trigger: When writing or modifying any UI component, layout, card, button, list item, or container. Also when auditing existing UI.
---

# LiftKit Spacing & Corner Rounding System

You are an expert in optically-balanced spacing and corner rounding. Apply these rules to ALL UI work.

## Golden Ratio Spacing Scale

All spacing derives from φ (1.618). Use CSS custom properties defined in `globals.css`:

| Token | Value (em) | Typical use |
|-------|-----------|-------------|
| `--space-xxs` | 0.236 | Inline icon gaps, tight label margins |
| `--space-xs` | 0.382 | Related element gaps (title↔subtitle) |
| `--space-s` | 0.618 | Input padding, badge padding |
| `--space-m` | 1.0 | Button padding-y, standard card gaps |
| `--space-l` | 1.618 | Card padding, section gaps |
| `--space-xl` | 2.618 | Section padding, page-level spacing |
| `--space-xxl` | 4.236 | Hero/banner internal spacing |
| `--space-3xl` | 6.854 | Page section dividers |

**Units are em, not px.** Spacing scales proportionally to the parent font size, ensuring responsiveness.

### Half-steps & Quarter-steps
- Whole step: multiply by φ (1.618)
- Half step: multiply by √φ (1.272)
- Quarter step: multiply by ⁴√φ (1.128)
- Use half/quarter steps when the jump between levels feels too large (common between xxs↔xs and xs↔s)

## The Three Laws of Spacing

1. **Every element is related to every other element** — stronger relationships = closer together
2. **Spacing is always relative to the larger element** — apply margin/padding relative to the bigger text/component
3. **Use preset variables, not arbitrary values** — pick from the scale, never eyeball pixel values

### Relationship Strength → Spacing Level
- **Strongest** (title↔subtitle, icon↔label): `--space-xxs` or `--space-xs`
- **Strong** (heading↔paragraph, form label↔input): `--space-xs` or `--space-s`
- **Medium** (paragraph↔next heading, card sections): `--space-m` or `--space-l`
- **Weak** (separate sections, nav↔content): `--space-l` to `--space-xl`
- **Unrelated** (page sections, major divisions): `--space-xl` to `--space-3xl`

When two consecutive spacing levels feel too close, **skip a level** — especially in the xxs→s range where the exponential curve is shallow.

## Optical Corrections

### Card Padding
Mathematical symmetry looks wrong. Apply optical correction:

```
Let X = largest font size in the container
Let H = line-height of X

padding-left = X
padding-right = X
padding-bottom = X
padding-top = X / H    ← OPTICAL CORRECTION (reduces top padding)
border-radius = padding-top   ← radius matches corrected top padding
```

The correction accounts for the bounding-box height vs rendered text height. The eye focuses on the top-left corner, so asymmetry there is most noticeable.

**In Tailwind**: Use asymmetric padding. Example for a card with text-lg (1.125rem, line-height 1.75):
```
p-[1.125rem] pt-[0.643rem]  /* 1.125 / 1.75 = 0.643 */
```

### Button Spacing
```
Let F = button font size
Let H = line-height of F

padding-x = F × 1.618        ← golden ratio horizontal padding
padding-y = F / H             ← optical correction vertical
border-radius = padding-y     ← matches vertical padding
icon-gap = F × 0.382          ← xs spacing for icon↔text
```

This ensures the icon appears to have equal space on all sides (optical centering). Both iOS and Material Design have asymmetries in inline buttons — this formula corrects them.

**IMPORTANT**: Not all buttons should be pill-shaped (fully rounded ends). Use `border-radius = padding-y` which gives proportional rounding. Only use `rounded-full` for circular icon-only buttons.

### List Item Spacing
```
margin-top = space-xs (relative to the LARGER text element)
margin-bottom = space-xs
```
For list items with single text: use symmetric xs margins.
For list items with title + description: use xs between title↔desc, s between items.

## Corner Rounding — Apple Squircle Approach

Standard CSS `border-radius` creates a visible junction where the straight edge meets the curve. Apple uses **continuous curvature** (G2/G3 continuity) — the squircle.

### Implementation (Progressive Enhancement)
```css
/* Modern browsers (Chrome 139+) */
.card {
  corner-shape: squircle;
  border-radius: var(--radius-lg);
}

/* Fallback for all browsers — standard border-radius still looks good */
@supports not (corner-shape: squircle) {
  .card {
    border-radius: var(--radius-lg);
  }
}
```

### Corner Rounding Rules
1. **`border-radius` = card's corrected top padding** (from optical correction formula)
2. **Nested radius**: `inner-radius = outer-radius - gap` (e.g., inner card inside outer card)
3. **Buttons**: radius = vertical padding (proportional, not pill)
4. **Input fields**: match the button radius for visual consistency
5. **Images inside cards**: use `rounded-t-[inherit]` to match parent
6. **Scale with size**: Larger containers get proportionally larger radii

### Squircle Values by Context
| Element | Radius approach |
|---------|----------------|
| Full-page cards | `--radius-xl` to `--radius-2xl` |
| Content cards | `--radius-lg` |
| Buttons | `= padding-y` (typically `--radius-sm` to `--radius-md`) |
| Input fields | Match button radius |
| Badges/chips | `--radius-sm` |
| Avatars | `rounded-full` |
| Images in cards | `rounded-t-[inherit]` |

## Mobile Adaptation

On mobile (< 640px), step down each spacing token by one level:
- Where you used `--space-l`, use `--space-m`
- Where you used `--space-m`, use `--space-s`
- Exception: `--space-xxs` stays as-is (already minimal)

## Retroactive Audit Checklist

When reviewing existing components, check:
- [ ] Card padding uses optical correction (top < sides)
- [ ] Button padding follows golden ratio formula
- [ ] Spacing between related elements uses scale tokens, not arbitrary values
- [ ] Border-radius is proportional to padding, not arbitrary
- [ ] Nested elements have `inner-radius = outer-radius - gap`
- [ ] Mobile spacing steps down one level
- [ ] No `margin: auto` or `gap: 1rem` without justification from the scale
- [ ] Interactive states don't shift layout (padding stays constant)

## Tailwind Custom Classes

Use the spacing tokens via CSS custom properties in Tailwind:
```html
<div class="p-[var(--space-l)] pt-[var(--space-m)]">
  <!-- Card with optical correction -->
</div>
```

Or use the Tailwind theme extensions defined in globals.css for cleaner syntax when available.
