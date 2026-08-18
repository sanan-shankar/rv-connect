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
      // This endpoint's only consumers are the Catch-ups people surfaces,
      // and Catch-ups is an alumni feature (owner, 2026-08-18): teachers
      // cannot open the section, so offering them as invitees would only
      // create members who can never attend.
      accountType: { notIn: ["teacher", "ex_teacher"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      photoUrl: true,
      birdOverride: true,
      batchYear: true,
      // Returned even though the filter above excludes teachers, so the rows
      // that render this can call `batchLine()` and be right on their own
      // terms. A component whose output depends on a `where` clause in a
      // different file is one relaxed filter away from being wrong.
      accountType: true,
    },
    take: 8,
  });

  return NextResponse.json(users);
}
