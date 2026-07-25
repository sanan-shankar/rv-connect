import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { insensitive } from "@/lib/db-text";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  // Every whitespace-separated token has to appear somewhere in the name, so
  // "afia sh" finds "Afia Shankar" and a trailing space never kills the match.
  const terms = q.split(/\s+/).filter(Boolean);

  const users = await prisma.user.findMany({
    where: {
      AND: terms.map((term) => ({ name: { contains: term, ...insensitive } })),
      isBlocked: false,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      photoUrl: true,
      birdOverride: true,
      batchYear: true,
    },
    take: 8,
  });

  return NextResponse.json(users);
}
