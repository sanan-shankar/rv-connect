import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireVerifiedEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Whole batches of names at a time: the exact bulk-harvest shape audit M1
  // describes, so it sits behind the directory's Stage 1 line too.
  const gate = await requireVerifiedEmail();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  // Cap the number of batch years in one query: there are ~108 possible years,
  // and no legitimate picker asks for a range wider than that. Bounding the
  // `IN` list here is half of audit H18; the `take` on the query below is the
  // other half.
  const batches = (searchParams.get("batches")?.split(",").map(Number).filter(Boolean) || []).slice(0, 120);

  // `?detail=1` returns whole people instead of bare ids, for pickers that
  // have to render a name and an avatar (the Catch-up "everyone from my batch"
  // shortcut). Opt-in so the default `{ userIds }` shape existing callers
  // depend on is untouched.
  const detail = searchParams.get("detail") === "1";

  if (batches.length === 0) {
    return NextResponse.json(detail ? { users: [] } : { userIds: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      batchYear: { in: batches },
      isBlocked: false,
    },
    select: detail
      ? { id: true, name: true, photoUrl: true, birdOverride: true, batchYear: true }
      : { id: true },
    ...(detail ? { orderBy: { name: "asc" as const } } : {}),
    // A hard ceiling so a signed-in account can never turn this into a
    // whole-table dump that OOMs the function (audit H18). Well above the
    // expected member ceiling (~1,000), so it never truncates a real picker;
    // if the community ever outgrows it, the pickers move to pagination.
    take: 5000,
  });

  if (detail) return NextResponse.json({ users });
  return NextResponse.json({ userIds: users.map((u) => u.id) });
}
