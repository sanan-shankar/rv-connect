import NextAuth, { type Session } from "next-auth";
import { cache } from "react";
import { IS_DEMO, DEMO_USER_ID } from "./demo";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const nextAuth = NextAuth({
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
            emailVerified: true,
            email: true,
            batchType: true,
            batchYear: true,
            name: true,
            avatarColor: true,
            photoUrl: true,
            birdOverride: true,
          },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.accountType = dbUser.accountType;
          session.user.verifyState = dbUser.verifyState;
          // Read fresh from the row rather than carried on the JWT, so the
          // moment someone clicks the link in their inbox the gate opens on
          // their next request. A token-carried flag would keep them locked
          // out until the JWT next rotated, which is the failure that makes a
          // verification flow feel broken.
          session.user.emailConfirmed = dbUser.emailVerified != null;
          session.user.email = dbUser.email;
          session.user.batchType = dbUser.batchType;
          session.user.batchYear = dbUser.batchYear;
          session.user.name = dbUser.name;
          session.user.avatarColor = dbUser.avatarColor;
          session.user.photoUrl = dbUser.photoUrl;
          session.user.birdOverride = dbUser.birdOverride;
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

export const { handlers, signIn, signOut } = nextAuth;

/* ------------------------------------------------------------------ *
 *  Demo mode: everyone is already signed in.
 *
 *  The whole point of the demo link is that it opens straight into the
 *  product with no credentials to copy out of an email. Rather than mint a
 *  real NextAuth JWT for an anonymous visitor -- which would mean a signing
 *  secret, a cookie, and a login endpoint that exists purely to be abused --
 *  demo mode swaps out the ONE function every page and all 128 server
 *  actions call to learn who you are, and answers "you are the persona".
 *
 *  There is no session to steal because there is no session: identity is a
 *  constant. Privilege cannot escalate because `role` is pinned to "member"
 *  here, ignoring whatever the row says, so even a tampered database row
 *  cannot open the admin surface.
 *
 *  Profile fields are read live so that editing your profile updates the
 *  sidebar immediately, exactly as it does in the real app.
 * ------------------------------------------------------------------ */
async function demoSession(): Promise<Session | null> {
  const user = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      batchType: true,
      batchYear: true,
      avatarColor: true,
      photoUrl: true,
      birdOverride: true,
    },
  });

  // An unseeded demo database is a deployment mistake, not a runtime state
  // to paper over: returning null sends the visitor to /login, where the
  // demo landing explains itself, instead of rendering a shell with no one
  // in it.
  if (!user) return null;

  return {
    user: {
      ...user,
      role: "member",
      verifyState: "verified",
      // The demo has no mailbox and cannot send mail, so the persona is born
      // confirmed. The gate short-circuits on IS_DEMO anyway
      // (src/lib/email-verification.ts); this keeps the client chrome, which
      // reads the session rather than calling the gate, from showing a nag bar
      // nobody on that deployment could ever clear.
      emailConfirmed: true,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session;
}

// Dedupe auth() within a single request. Without this, layout + page + each
// server action all call auth() independently, and each re-runs the session()
// callback's prisma.user.findUnique. React cache() collapses the repeat calls
// in one request to a single session resolution (one DB read instead of ~3).
export const auth = cache(
  IS_DEMO ? (demoSession as typeof nextAuth.auth) : nextAuth.auth,
);
