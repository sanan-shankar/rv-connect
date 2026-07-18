# Auth Flight Speed and Support Icon Design

## Goal

Make the hoopoe's desktop flight from the landing-page Join and Sign in calls to action feel 25% slower, and replace the sidebar Support item's piggy-bank icon with Lucide's heart-handshake icon.

## Design

The landing hero will pass a named `0.8` playback-speed multiplier to the existing `launchFlight` call. The flight system defines speed as a playback-rate multiplier, so `0.8` makes each flight phase take `1 / 0.8 = 1.25` times as long. The value applies equally to Join and Sign in because both routes share the same launcher. Other hoopoe flights retain the default `1` speed.

The sidebar navigation will import Lucide's `HeartHandshake` icon and use it for the existing Support entry in place of `PiggyBank`. The nav renderer continues to own sizing, spacing, active state, hover state, focus treatment, and mobile/desktop parity, so the replacement requires no layout changes.

## Alternatives Considered

- Changing the flight layer's default speed would slow every current and future caller, which is broader than requested.
- Editing individual takeoff, cruise, and handoff durations would duplicate an abstraction the flight system already provides.
- Wrapping or restyling the Support icon would add needless component and layout changes; the direct Lucide component swap preserves the established navigation system.

## Accessibility and Resilience

The current reduced-motion handling remains unchanged. Modified clicks and small viewports continue to bypass the desktop cross-page flight and navigate normally. The icon is decorative beside the visible Support label, so its accessible name continues to come from the link text.

## Verification

- Add a focused source-level regression test that confirms the landing auth flight uses `0.8` and the Support item uses `HeartHandshake` rather than `PiggyBank`.
- Run the focused test, TypeScript checking, and lint on the changed source files.
- Verify the landing-to-login and landing-to-signup flights in a browser at desktop width, and inspect the Support item in desktop and mobile navigation.

