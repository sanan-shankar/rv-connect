import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q },
      isBlocked: false,
    },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      batchYear: true,
    },
    take: 8,
  });

  return NextResponse.json(users);
}
