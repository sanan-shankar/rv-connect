/* ------------------------------------------------------------------ *
 *  POST/GET /api/demo/reset — put the demo world back the way it was.
 *
 *  This is the mechanism that makes "let visitors write freely" a safe
 *  offer. Because the demo can always be restored in one call, nothing a
 *  visitor does needs to be prevented on the grounds that it might spoil
 *  the next visitor's look at it.
 *
 *  It runs on an UNGUARDED Prisma client, which is the one deliberate
 *  hole in the demo's write policy, so it is worth being precise about
 *  why that is acceptable:
 *
 *   - The route does not exist unless DEMO_MODE=1. On the real
 *     deployment it is a 404, so the hole is not present in the build
 *     that has anything worth protecting.
 *   - Its blast radius is one database of invented people, whose entire
 *     contents are reproducible from files in this repository.
 *   - The worst outcome an attacker can buy is "the demo looks freshly
 *     seeded", which is also the outcome the nightly cron pays for.
 *
 *  What is left worth defending is cost, not data: a loop hammering this
 *  endpoint would burn database time. Hence the throttle below.
 * ------------------------------------------------------------------ */

import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { IS_DEMO } from "@/lib/demo";
import { seedDemo } from "@/lib/demo-seed/seed";
import { requireCronSecret } from "@/lib/api-gate";
import { withDatabaseTls } from "@/lib/db-tls";

export const dynamic = "force-dynamic";

/* seed.ts runs the whole rewrite inside one transaction with timeout 30s and
 * maxWait 10s, so a slow reset can legitimately spend 40s before it counts a
 * row. Its two sibling crons in vercel.json already declare a ceiling
 * (retention/sweep 300, catchups/tick 120) for the reason audit C-079 gave and
 * which applies word for word here: an invocation cut off part-way dies
 * without reaching its reportSwallowed, so the failure is silent. */
export const maxDuration = 120;

/**
 * Shortest gap between two resets, in ms. Best-effort only: serverless
 * instances do not share memory, so this bounds one instance rather than the
 * fleet. That is the right amount of engineering here, because the thing it
 * protects is a few seconds of Postgres time on a free-tier project, and the
 * honest alternative (a shared counter in the database being reset) is worse
 * than the problem.
 */
const MIN_GAP_MS = 20_000;
let lastReset = 0;

async function runReset() {
  // A plain client, not the guarded singleton from src/lib/prisma.ts: the
  // demo write policy would refuse nearly every statement seedDemo makes,
  // and correctly so. Built per-call and disconnected after, so no
  // unguarded client is ever left sitting in the module graph where some
  // future import could reach for it by mistake.
  const prisma = new PrismaClient({
    // Bounded and impatient for the reasons src/lib/prisma.ts:18-44 sets out
    // at length: a bare `new PrismaPg({ connectionString })` takes pg's
    // defaults, which are max 10 per instance and NO checkout timeout, so a
    // checkout with no free connection waits forever. query_timeout is loose
    // here on purpose -- the seed's own transaction already caps any single
    // statement at 30s, so 60s can only ever catch something genuinely stuck.
    adapter: new PrismaPg({
      ...withDatabaseTls(process.env.DATABASE_URL ?? ""),
      max: 5,
      connectionTimeoutMillis: 5_000,
      query_timeout: 60_000,
    }),
  });
  try {
    return await seedDemo(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST() {
  if (!IS_DEMO) return new NextResponse("Not found", { status: 404 });

  const now = Date.now();
  if (now - lastReset < MIN_GAP_MS) {
    // 200, not 429: the visitor pressed a button and the demo is, in fact,
    // freshly seeded. Telling them off for someone else's timing would be
    // a strange thing for a showcase to do.
    return NextResponse.json({ ok: true, throttled: true });
  }
  lastReset = now;

  try {
    const result = await runReset();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[demo/reset]", e);
    lastReset = 0; // a failed reset should not lock out the next attempt
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}

/** The nightly Vercel cron (see vercel.json). Vercel issues a GET and sends
 *  `Authorization: Bearer $CRON_SECRET`, so this half is authenticated even
 *  though the button half is not. */
export async function GET(req: NextRequest) {
  // Both deployments build from this repo, so both read the same vercel.json
  // and both run this cron. On the real one it is a deliberate no-op: 200
  // rather than 404 so the nightly run reports success instead of raising a
  // failed-cron alert every morning for a job that was never meant for it.
  if (!IS_DEMO) return NextResponse.json({ ok: true, skipped: "not the demo deployment" });

  // The same door as the two sibling cron routes, and now literally the same
  // one. The blast radius here is only the disposable demo database, but this
  // is not the door that should teach the wrong pattern to whoever copies a
  // cron route next.
  const refusal = requireCronSecret(req);
  if (refusal) return refusal;

  try {
    const result = await runReset();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[demo/reset cron]", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
