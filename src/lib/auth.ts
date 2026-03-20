import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "RV Alumni <onboarding@resend.dev>",
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch full user data for the session
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            batchType: true,
            batchYear: true,
            name: true,
            avatarColor: true,
          },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.batchType = dbUser.batchType;
          session.user.batchYear = dbUser.batchYear;
          session.user.name = dbUser.name;
          session.user.avatarColor = dbUser.avatarColor;
        }
      }
      return session;
    },
    async signIn({ user }) {
      if (user.email) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && user.email === adminEmail) {
          await prisma.user.updateMany({
            where: { email: adminEmail },
            data: { role: "admin" },
          });
        }
      }
      return true;
    },
  },
});
