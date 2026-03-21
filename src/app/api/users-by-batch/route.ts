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

  if (batches.length === 0) {
    return NextResponse.json({ userIds: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      batchYear: { in: batches },
      isBlocked: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ userIds: users.map((u) => u.id) });
}
