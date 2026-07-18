# Current Findings

## Auth flight pace and Support icon (2026-07-18)

- `src/components/landing/landing-hero.tsx` is the single desktop launcher for both Join and Sign in.
- `FlightLaunch.speed` already scales all cross-page flight-layer timing; `0.8` produces a 25% longer duration.
- The existing mobile and modified-click branches navigate without launching the cross-page flight.
- `src/components/layout/sidebar.tsx` defines Support once for both desktop and mobile navigation and currently assigns Lucide's `PiggyBank`.
- No project test runner is configured in `package.json`; the implementation plan must use a focused check compatible with the repository's existing tooling.
