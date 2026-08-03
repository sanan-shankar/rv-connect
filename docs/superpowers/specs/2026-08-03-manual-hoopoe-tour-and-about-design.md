# Manual Hoopoe Tour and Minimal About Page

Date: 2026-08-03

## Goal

Stop presenting the product tour automatically after login, preserve the tour implementation for deliberate use, move its only visible trigger to an owner-only admin control, and reduce the About page to the requested unfinished placeholder.

## Approved Experience

### Tour entry

- Arriving on `/feed` after login must not offer or start the tour.
- The existing tour steps, spotlight, panel, mascot choreography, completion state, and manual `start()` entry point remain available.
- The dormant first-feed offer logic remains in the source behind an explicit opt-in that defaults to disabled. Re-enabling it later should require a deliberate code change, not user storage changes.
- Manually starting the tour always begins at its first stop and continues to ignore prior completed or dismissed state, matching current behavior.

### About

- The visible page title is `About`.
- There is no subtitle.
- Remove every existing section, paragraph, separator, external link, guideline, explanatory card, and tour control.
- Beneath the title, show only the exact lowercase text `indefinitely procrastinated`.
- Give that line generous open space and center it casually in the remaining content region. It is plain text, not a card, alert, empty-state illustration, or prominent hero statement.

### Admin control

- Put a compact CTA in the existing Admin page header action area so it consumes little space and has no surrounding box.
- Its exact visible label is `hoopoe tour`.
- Render it only when the authenticated session email exactly equals the server-side `ADMIN_EMAIL` value.
- The existing admin-role redirect remains the first authorization boundary. The email comparison is an additional owner-only visibility check; other role-`admin` accounts do not receive the CTA.
- If `ADMIN_EMAIL` is absent or does not match, render no tour CTA.
- Clicking the CTA calls the existing client-side `useTour().start()` function.

## Architecture and Data Flow

`TourProvider` continues to wrap the authenticated application in `(main)/layout.tsx`, so a small client CTA nested inside the server-rendered Admin page can consume its context without moving the provider or exposing owner data to the browser.

The provider accepts an automatic-offer opt-in whose default is `false`. Its existing first-feed checks and offer component are evaluated only when that opt-in is enabled. The manual `start()` path is not gated by this setting.

The Admin page already reads the authenticated session on the server. It compares `session.user.email` with `process.env.ADMIN_EMAIL` and conditionally supplies the CTA through `PageHeader`'s `actions` slot. Neither email nor authorization logic is passed into the client component.

## Components Affected

- `src/components/tour/tour-provider.tsx`: add the disabled-by-default automatic-offer gate while retaining manual operation and offer code.
- `src/components/tour/take-tour-again-button.tsx`: make the retained trigger a compact `hoopoe tour` CTA suitable for Admin.
- `src/app/(main)/about/page.tsx`: replace the current content with the minimal approved layout.
- `src/app/(main)/admin/page.tsx`: add the owner-only CTA to the page header.
- `scripts/qa/tour-mobile-verify.mjs`: start the tour from Admin instead of About and use the new exact label.

No database schema, route, API, session shape, local-storage format, or tour-step changes are required.

## Layout and Accessibility

- Preserve `PageHeader` so the page title remains structurally consistent and is still the page's `h1`.
- Use the existing content column and shell padding. The placeholder region supplies the additional vertical room and centers its single line at mobile and desktop sizes.
- Style the placeholder as ordinary, muted body copy with no decorative container.
- Use the shared small button size and existing focus, hover, active, and disabled behavior for the CTA.
- The button's visible label is also its accessible name.

## Testing

Implementation follows a red-green cycle:

1. Add a regression test proving the automatic-offer decision is false by default and remains available only through explicit opt-in.
2. Add source-level page contracts, consistent with the repository's existing lightweight UI tests, for the exact About title/copy, absence of the old subtitle and tour control, exact CTA label, and server-side `ADMIN_EMAIL` gate.
3. Update the authenticated mobile tour QA script to visit `/admin`, select `hoopoe tour`, and confirm the existing tour can still run.
4. Run the focused tests, the repository test suite, ESLint, and a production build.
5. Use authenticated screenshots at representative desktop and mobile sizes to verify the About whitespace/centering and the compact owner Admin header action. Non-owner absence is covered by the server-gating regression test.

## Out of Scope

- Rewriting tour steps or choreography.
- Deleting the dormant offer component or settled-tour storage helpers.
- Adding a member-facing tour entry point elsewhere.
- Changing Admin access rules beyond hiding this CTA from non-owner admins.
- Replacing other occurrences of the site's general tagline outside About.
