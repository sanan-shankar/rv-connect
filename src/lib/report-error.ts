import * as Sentry from "@sentry/nextjs";

/* ------------------------------------------------------------------ *
 *  Swallowed, but not silent.
 *
 *  Several things in this app deliberately catch their own errors and
 *  carry on: the Catch-up engine rides on the app-shell query that runs
 *  on nearly every authenticated page view, the retention sweep must not
 *  let one bad table take the other nine down, and presence telemetry
 *  must never put an error page in front of a member over a statistics
 *  row. All of that is right.
 *
 *  What was wrong is where the error went. `console.error` on Vercel is
 *  a line in a log nobody reads, and Sentry -- which exists precisely
 *  because "with 49 members, nobody reports a broken page, they leave"
 *  (src/instrumentation.ts) -- only ever sees what is THROWN. So the
 *  Catch-up engine could fail on every page view for a week and the one
 *  symptom would be that Rounds stopped happening, with no alert and
 *  nothing in the inbox (bug audit M09).
 *
 *  A guard that hides its own breakage is worse than no guard. This is
 *  the one line that keeps the guard and removes the hiding.
 * ------------------------------------------------------------------ */

export function reportSwallowed(
  /** Where it happened, in the same `[area]` shape the console lines already use. */
  scope: string,
  err: unknown,
  /** Anything that would make the report answerable without a repro. */
  context?: Record<string, unknown>
): void {
  // The console line stays. It is what a developer sees locally, where
  // Sentry is deliberately switched off (a dev server throws constantly on
  // purpose, and the free plan is 5,000 events a month).
  console.error(`[${scope}]`, err, context ?? "");
  try {
    Sentry.captureException(err, {
      tags: { swallowed: "true", area: scope },
      extra: context,
    });
  } catch {
    // Reporting an error must never become one. Sentry is disabled outside
    // deployment, and a transport failure here would be the least useful
    // exception this app could possibly raise.
  }
}
