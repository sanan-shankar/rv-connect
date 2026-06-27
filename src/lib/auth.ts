import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // Admin bypass: skip password check for admin email
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && email === adminEmail) {
          // Ensure admin role is set
          if (user.role !== "admin") {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "admin" },
            });
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: "admin",
            batchType: user.batchType,
            batchYear: user.batchYear,
            avatarColor: user.avatarColor,
          };
        }

        // Regular user: verify password
        if (!password || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          batchType: user.batchType,
          batchYear: user.batchYear,
          avatarColor: user.avatarColor,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.batchType = user.batchType;
        token.batchYear = user.batchYear;
        token.avatarColor = user.avatarColor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // Fetch fresh user data from DB on each session read
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            accountType: true,
            verifyState: true,
            batchType: true,
            batchYear: true,
            name: true,
            avatarColor: true,
          },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.accountType = dbUser.accountType;
          session.user.verifyState = dbUser.verifyState;
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
