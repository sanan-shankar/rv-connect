import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encode } from "@auth/core/jwt";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function POST(req: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!adminEmail || !secret) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { email } = await req.json();

  if (email !== adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No account found. Please sign up first." },
      { status: 404 }
    );
  }

  // Ensure admin role is set
  if (user.role !== "admin") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    });
  }

  // Create a JWT token matching NextAuth's format
  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
      id: user.id,
      role: "admin",
      batchType: user.batchType,
      batchYear: user.batchYear,
      avatarColor: user.avatarColor,
    },
    secret,
    salt: cookieName,
    maxAge: MAX_AGE,
  });

  const response = NextResponse.json({ success: true });

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    expires: new Date(Date.now() + MAX_AGE * 1000),
    path: "/",
  });

  return response;
}
