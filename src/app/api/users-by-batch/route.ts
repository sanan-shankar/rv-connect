import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batches = searchParams.get("batches")?.split(",").map(Number).filter(Boolean) || [];

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
  });

  if (detail) return NextResponse.json({ users });
  return NextResponse.json({ userIds: users.map((u) => u.id) });
}
