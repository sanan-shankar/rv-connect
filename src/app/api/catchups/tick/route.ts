import { NextResponse, type NextRequest } from "next/server";
import { advanceDueCatchups } from "@/lib/catchups";
import { requireCronSecret } from "@/lib/api-gate";

/**
 * The nightly Catch-up advance (audit M27). `vercel.json` has scheduled this
 * path daily at 02:00 all along, but the route never existed, so every night
 * the cron 404'd and Catch-up Editions only ever advanced when a member happened
 * to load an authenticated page (the lazy tick in the `(main)` layout). On a
 * quiet week a deadline could silently fail to fire.
 *
 * `advanceDueCatchups()` with no user id is the cron-wide advance the function
 * was written to be a thin wrapper over (see its doc comment): it sweeps every
 * group, and it can never throw. It is idempotent — running it a second time
 * finds nothing left due — so a retried cron is harmless.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that env var is set;
 * the secret is REQUIRED here (unlike the demo-reset cron, which no-ops off the
 * demo flag) because without it anyone could trigger a full Catch-up scan on
 * demand. `/api/catchups/tick` is listed in proxy.ts `publicPaths` so this
 * server-to-server GET, which carries no session cookie, is not redirected to
 * /login before it can present that header.
 */
/**
 * Same reasoning as the retention sweep's (audit C-079): a nightly pass over
 * every live Catch-up is not shaped like a page render, and a cut-off
 * invocation dies without reaching the reporter that every in-band failure
 * here goes through. Two minutes is far more than the pass has ever needed and
 * far less than the plan's ceiling.
 */
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const refusal = requireCronSecret(req);
  if (refusal) return refusal;

  await advanceDueCatchups();
  return NextResponse.json({ ok: true });
}
