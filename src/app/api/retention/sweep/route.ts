import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/demo";
import { runRetentionSweep } from "@/lib/retention";
import { requireCronSecret } from "@/lib/api-gate";

/**
 * The nightly retention sweep (audit M34), and with it the grace-period
 * account purge (audits H9 + M35). Triggered by .github/workflows/
 * retention.yml — GitHub Actions rather than a third Vercel cron, because
 * the Hobby plan allows two and both are spent (the Catch-up tick and the
 * demo reset).
 *
 * Same door as /api/catchups/tick: `Authorization: Bearer $CRON_SECRET`,
 * compared constant-time and REQUIRED, because this route deletes rows and
 * purges accounts on demand for anyone who can call it. Listed in proxy.ts
 * `publicPaths` so the cookie-less server-to-server GET is not bounced to
 * /login before it can present the header.
 *
 * The demo answers early with a skip: its database is invented people reset
 * nightly, its Prisma write-guard would refuse most of these deletes anyway,
 * and "the demo ran retention" is a sentence with no meaning.
 */
/**
 * Longer than the default, because this route's worst case is not a request's
 * worst case (audit C-079).
 *
 * Nothing declared a `maxDuration` anywhere in this project, so every function
 * ran on the platform default -- and the default is sized for a page render,
 * not for a sweep that walks ten tables and then purges whole accounts, each
 * of which is its own 30-second transaction plus its R2 objects. A sweep cut
 * off part-way is not a disaster (the pass is idempotent and every step is
 * batched, so tomorrow finishes it), but it is a silent one: the invocation
 * dies without reaching the `reportSwallowed` that every other failure here
 * goes through, so a sweep that has been timing out for a month leaves the
 * same no-symptom gap M54 exists to close.
 *
 * 300 seconds is the Hobby plan's ceiling. It costs nothing on a night with
 * nothing to do -- the sweep returns in milliseconds -- and it is the
 * difference between finishing and vanishing on the night an account purge
 * finally comes due.
 *
 * The sweep keeps its own time inside it (`SWEEP_BUDGET_MS` in retention.ts),
 * and retention.yml waits longer than it, so a night that does run out still
 * answers with the body that says why (bug audit 3, L11-07). The workflow's
 * timeout used to equal this ceiling, and GitHub cancelled the request before
 * Vercel's 504 could arrive.
 */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const refusal = requireCronSecret(req);
  if (refusal) return refusal;

  if (IS_DEMO) {
    return NextResponse.json({ skipped: "demo" });
  }

  /* Only the production deployment sweeps (bug audit 3, L11-06). Every other
     process that can serve this route -- the dev server, `next start` on the
     laptop, a Vercel preview -- talks to the same one database, so a sweep
     there is the production sweep in every respect: it erases whoever's sixty
     days are up, hours before the night's run, and writes a retention.sweep
     line /admin/audit cannot tell from GitHub's. Six laptop sweeps did exactly
     that in August. SWEEP_IN_DEV=1 on that server runs it anyway, knowingly
     (the phase-8 probe's server). VERCEL_ENV is the platform's own, the same
     signal statsWritesEnabled() keys on. */
  if (process.env.VERCEL_ENV !== "production" && process.env.SWEEP_IN_DEV !== "1") {
    return NextResponse.json(
      {
        error:
          "The retention sweep runs only on the production deployment. To run it from this server, against the one database, start it with SWEEP_IN_DEV=1.",
      },
      { status: 403 }
    );
  }

  const result = await runRetentionSweep();

  /* A pass with a failed step answers 502, not 200 (audit M54).
   *
   * The sweep is deliberately fault-tolerant: one table failing must not stop
   * the other nine, so every step catches its own error and the pass finishes.
   * That was the whole of the reporting too -- the route answered 200 with the
   * failures listed in a JSON body nobody reads, so the GitHub Actions job
   * went green and the nightly alarm this route exists to be stayed quiet
   * while retention silently stopped working.
   *
   * 502 rather than 500: the sweep itself ran, and what failed was downstream
   * of it. The body is unchanged, so whoever opens the failed run still sees
   * exactly which steps went wrong and what the other steps managed to delete.
   * Safe to be loud about: every step is a hard-cutoff deleteMany, so tomorrow
   * night simply deletes two days' worth. */
  const status = result.errors.length > 0 ? 502 : 200;
  return NextResponse.json(result, { status });
}
