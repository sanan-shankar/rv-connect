import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/demo";
import { runRetentionSweep } from "@/lib/retention";
import { timingSafeEqualStrings } from "@/lib/timing-safe";

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
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqualStrings(authHeader, `Bearer ${secret}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (IS_DEMO) {
    return NextResponse.json({ skipped: "demo" });
  }

  const result = await runRetentionSweep();
  return NextResponse.json(result);
}
