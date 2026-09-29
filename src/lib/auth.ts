import NextAuth, { CredentialsSignin, type Session } from "next-auth";
import { cache } from "react";
import { IS_DEMO, DEMO_USER_ID } from "./demo";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { recordLoginAttempt } from "@/lib/login-attempt";
import { botCheckDetail } from "@/lib/bot-check-detail";
import { hasBudget, consume, ipFromRequest } from "@/lib/rate-limit";
import { checkTurnstile, devBypassAllowed, hostFromRequest } from "@/lib/turnstile";
import { humanPassValid, humanPassFromCookieHeader } from "@/lib/human-pass-rule";
import { appSecret } from "@/lib/app-secret";
import { writeAudit } from "@/lib/audit";
import { prisma } from "./prisma";
import { normalizeEmail } from "./email-address";
import { ownProfileLink } from "./notification-links";
import { sessionRevoked, SESSION_MAX_AGE } from "./session-revocation";
import { emailGateOpenFor } from "./email-gate-open";

/* authorize() below can only say "yes" (a user) or "no" (null), and null
   always surfaces as "Invalid email or password." These two let the login
   form tell the truth when the refusal was never about the password.
   CredentialsSignin subclasses are the ONE kind of throw NextAuth turns
   into a clean error code instead of a 500; the code strings are matched
   by the login client. */
class RateLimitedLogin extends CredentialsSignin {
  code = "rate-limited";
}
class BotCheckFailed extends CredentialsSignin {
  code = "bot-check";
}
/**
 * Something broke that has nothing to do with the credentials: the database
 * was unreachable, a query timed out, the pool was exhausted.
 *
 * Its own code because the alternative is silence. Any such throw used to
 * leave `authorize` through NextAuth's generic channel, and the form prints
 * that channel as "Invalid email or password." -- to somebody whose password
 * was right (bug audit M18).
 */
class LoginUnavailable extends CredentialsSignin {
  code = "unavailable";
}

/* A real bcrypt cost-12 hash of a throwaway string, compared against in the
   branches that reject BEFORE reaching the genuine bcrypt.compare below (no
   such account, or an account with no password set). Without it those branches
   return after a single DB read in single-digit milliseconds while a real
   account always pays ~150-300ms for the compare, and that difference alone
   tells an attacker which addresses belong to members -- the exact membership
   fact the generic "Invalid email or password" and the reset flow's `after()`
   both exist to hide. Burning one equivalent compare in the fast branches makes
   all three failure paths cost roughly the same. The hash must be valid, or
   bcryptjs short-circuits on a parse error and the equalisation is lost. */
const DUMMY_PASSWORD_HASH =
  "$2b$12$i80egBbL/FYVUTbemVUv4uMONfzeXjEd2dwV1Ssq8TIAOTKKpCWrW";

const nextAuth = NextAuth({
  // No adapter. Sessions are JWTs (`strategy: "jwt"` below) and the only
  // provider is Credentials, so NextAuth never had an adapter method to call:
  // the adapter path is reached only by OAuth account linking, the email
  // provider's VerificationToken flow, and database sessions. Revocation is
  // `User.credentialVersion` (audits M4/M5/H4), not Session rows.
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        /* Produced by the widget on the login form and verified against
           Cloudflare below. Never trusted client-side (audit H22). */
        turnstileToken: { type: "text" },
        /* QA scripts only; see devBypassAllowed — dead in production. */
        devBypass: { type: "text" },
        /* The widget's own account of why it could not produce a token
           ("timeout", "blocked", "error-110200"). DIAGNOSTIC ONLY: it is
           recorded on the refusal and never read by any branch, because it
           comes from the browser and a browser that cannot pass the bot check
           is exactly the one whose word is worth least. */
        botFailHint: { type: "text" },
      },
      async authorize(credentials, request) {
        /* One net over everything below (bug audit M18). The two refusals
           this function makes on purpose (rate-limited, bot-check) are
           CredentialsSignin throws and are re-thrown untouched -- they are
           the answer, not a failure to reach one. Anything else reaching
           here is the database being unreachable, a query timing out, or the
           pool being exhausted, and NextAuth would have handed all of it to
           the form as the generic refusal, which the form prints as "Invalid
           email or password." Telling somebody their correct password is
           wrong sends them to the reset flow, which needs the same database,
           so it fails too: a loop with no exit during exactly the minutes
           when the thing to do is wait a moment and try again. */
        try {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;

          if (!email) return null;

          const ip = ipFromRequest(request);
          const acctKey = normalizeEmail(email);

          /* H6: the door itself is metered. Read-only here — a successful
             sign-in must never spend anyone's budget, or the QA scripts and
             any member who signs in often would rate-limit themselves — and
             spent only in the failure branches below (see fail()). */
          const [ipOk, acctOk] = await Promise.all([
            hasBudget("login-ip", ip),
            hasBudget("login-account", acctKey),
          ]);
          if (!ipOk || !acctOk) {
            recordLoginAttempt({ email, ok: false, reason: "rate-limited" });
            throw new RateLimitedLogin();
          }

          /* H22: prove a human before proving a password. Three doors, in
             cost order: the five-minute pass a fresh signup or reset already
             earned (no network), the QA bypass (refused outright in
             production), then a live Turnstile token checked with
             Cloudflare. bcrypt never runs for a caller the last of these
             cannot vouch for AND who has no spare budget below. */
          const vouched =
            humanPassValid(
              humanPassFromCookieHeader(request.headers.get("cookie")),
              acctKey,
              Date.now(),
              appSecret(),
            ) || devBypassAllowed(credentials?.devBypass as string | undefined);

          const verdict = vouched
            ? ({ ok: true } as const)
            : await checkTurnstile(
                credentials?.turnstileToken as string | undefined,
                ip,
                hostFromRequest(request),
              );

          if (!verdict.ok) {
            /* THE BOT CHECK COULD NOT ANSWER FOR THIS BROWSER. It is not a
               verdict that the visitor is a bot — `no-token`, far and away
               the commonest of the three, means only that the widget never
               produced one, and the widget fails for blocked scripts, network
               filters, a challenge that errors its retries out, and a wait
               that simply elapses.

               Until 2026-09-11 this threw, and that was a PERMANENT lockout:
               a member with the correct password, whose browser Cloudflare
               had decided to challenge, could not sign in, could not reset
               (the reset form wears the same widget), and was told to refresh
               the page and try once more, which never once helped. Thirteen
               of the thirty-nine sign-in attempts in the fortnight to
               2026-09-10 died here.

               So the refusal becomes a much smaller allowance instead. The
               attempt goes through on the `login-unverified` meter — five an
               hour per IP, spent whether it succeeds or fails — which a
               person signing in never notices and a stuffing run cannot work
               with. Everything else still applies underneath: the ordinary
               login meters, bcrypt at cost 12, the block list, and
               credentialVersion. The bot check is one layer of several, and
               it is now the only one that cannot lock somebody out on its
               own. Signup and the reset REQUEST keep the hard refusal: a bot
               minting accounts is the thing Turnstile is most for, and
               someone turned away there has a human to write to.

               `detail` is what makes this diagnosable rather than a fourth
               investigation from scratch. The half after the slash is the
               widget's own account of what went wrong, sent with the request
               and TRUSTED FOR NOTHING — it is recorded, never branched on. */
            const detail = botCheckDetail(
              verdict.why,
              credentials?.botFailHint as string | undefined,
              verdict.detail,
            );

            const spare = await hasBudget("login-unverified", ip);
            // Spent before the verdict is acted on, so a caller that races
            // many attempts through at once cannot outrun its own meter.
            await consume("login-unverified", ip);
            if (!spare) {
              recordLoginAttempt({ email, ok: false, reason: "bot-check", detail });
              throw new BotCheckFailed();
            }
            console.warn(
              `[turnstile] no verdict for a sign-in (${detail}); allowing it on the unverified budget`,
            );
          }

          /* Every refusal below is what the limiter counts: guesses, not
             visits. Awaited so a serverless instance cannot freeze before
             the count lands. */
          const fail = () =>
            Promise.all([consume("login-ip", ip), consume("login-account", acctKey)]);

          // acctKey, not the raw submission. User.email is a case-sensitive
          // unique column holding the canonical (trimmed, lowercased) form, so
          // looking up what somebody typed refused a correct password whenever
          // the capitalisation differed (bug audit B-020).
          const user = await prisma.user.findUnique({
            where: { email: acctKey },
          });

          /* Every branch below records its outcome. Purely additive: nothing
             here changes what this function returns, and recordLoginAttempt
             cannot throw or block. A member who cannot sign in was previously
             invisible to every number in /admin/analytics, which is backwards --
             they are the ones most likely to need help. */
          if (!user) {
            // Spend an equivalent bcrypt compare so this branch costs about what
            // a real account's wrong-password branch does (see DUMMY_PASSWORD_HASH).
            await bcrypt.compare(password ?? "", DUMMY_PASSWORD_HASH);
            recordLoginAttempt({ email, ok: false, reason: "no-account" });
            await fail();
            return null;
          }

          /* There is deliberately no admin branch here. Until 2026-08-19 this
             function short-circuited on `email === process.env.ADMIN_EMAIL` and
             returned role:"admin" BEFORE bcrypt.compare ever ran, so the admin
             address signed in with any password, including an empty one
             (security audit C1-a). The role now comes from the database row
             like everybody else's, by way of the ordinary path below. */

          // Regular user: verify password
          if (!password || !user.password) {
            /* An account with no password set is an invited member who never
               finished signing up. Different problem, different help. */
            // Same constant-time reasoning as the no-account branch above.
            await bcrypt.compare(password ?? "", DUMMY_PASSWORD_HASH);
            recordLoginAttempt({
              email,
              ok: false,
              reason: "no-password-set",
              userId: user.id,
            });
            await fail();
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            recordLoginAttempt({ email, ok: false, reason: "wrong-password", userId: user.id });
            await fail();
            return null;
          }

          /* A blocked member may not sign in. Until now `isBlocked` was read by
             six list queries and by nothing else -- not here, not in the session
             callback, not in any write path -- so blocking somebody removed them
             from the directory and left them posting, commenting, uploading and
             messaging exactly as before (audit H4). The block starts at the door. */
          if (user.isBlocked) {
            recordLoginAttempt({ email, ok: false, reason: "blocked", userId: user.id });
            /* Deliberately NOT counted: this is a correct password from a
               known account. Counting it would let the block's own refusals
               exhaust the member's budget and muddy the door for the account
               they may be unblocked back into. */
            return null;
          }

          /* A sign-in during the deletion grace window IS the cancel gesture
             (audit M35): only the account's real owner can produce the
             password, so nothing weaker than this may undo — or keep — a
             deletion request. Best-effort around the notification: a failure
             to say "we cancelled it" must not turn a successful sign-in into
             an error, but the clearing itself is awaited, because signing
             someone in while their purge date still stands is the one wrong
             outcome here. */
          if (user.deletionRequestedAt) {
            await prisma.user.update({
              where: { id: user.id },
              data: { deletionRequestedAt: null },
            });
            await writeAudit({
              actorId: user.id,
              action: "account.delete_cancel",
              targetType: "user",
              targetId: user.id,
              detail: `${user.name} <${user.email}> signed in during the grace period`,
            });
            try {
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: "admin",
                  message:
                    "Welcome back. Your account was scheduled for deletion; signing in has cancelled that, and everything is exactly as you left it.",
                  // Not "/settings": that route does not exist. The profile
                  // is the settings surface (audit M49).
                  link: ownProfileLink(user.id),
                },
              });
            } catch (err) {
              console.error("delete-cancel notification failed:", err);
            }
          }

          recordLoginAttempt({ email, ok: true, reason: "ok", userId: user.id });
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            batchType: user.batchType,
            batchYear: user.batchYear,
            /* MUST be carried, or the epoch check below rejects the very token
               this call is minting. Anyone who had ever reset their password
               would sign in successfully, receive a token stamped 0, be compared
               against a row reading 1, and be thrown straight back out -- every
               time, permanently. Caught by the Phase 2 behavioural probe; the
               static checks were perfectly happy with it. */
            credentialVersion: user.credentialVersion,
          };
        } catch (err) {
          if (err instanceof CredentialsSignin) throw err;
          console.error("[auth] sign-in could not be completed:", err);
          throw new LoginUnavailable();
        }
      },
    }),
  ],
  /* An ABSOLUTE ninety days, not a rolling one (audit C-032; ninety is the
   * owner's call, 2026-08-25, replacing @auth/core's 30-day default).
   *
   * ABSOLUTE is the part to understand. NextAuth documents `maxAge` as a
   * session that refreshes on activity, but that refresh rides on Set-Cookie
   * headers emitted by GET /api/auth/session, and this app never asks for it:
   * `auth()` takes the RSC path, which reads the response BODY and drops those
   * headers, and there is no middleware, no SessionProvider and no useSession
   * anywhere in src. So the cookie's expiry is fixed at sign-in and does not
   * advance no matter how often somebody visits.
   *
   * What that means for a member: one forced re-login roughly three months
   * after they signed in, and a launch cohort hitting it together on the same
   * day. Recoverable, with no data loss. Thirty days made that a quarterly
   * nuisance for the most active members; ninety makes it rare enough to feel
   * like ordinary housekeeping, while still being a real ceiling on a cookie
   * somebody left on a borrowed laptop.
   *
   * If it should ever genuinely roll, the change is not a bigger number here:
   * it is a middleware or a route that re-issues the cookie, because nothing
   * in the current request path can.
   *
   * Revocation does NOT depend on any of this: `User.credentialVersion` is
   * stamped into the token and compared on every session read, so a password
   * reset, a block or a deletion request ends every live session at once. */
  session: {
    strategy: "jwt",
    // Ninety days. `SESSION_MAX_AGE` is shared with the dev-login route so the
    // tooling cookie cannot outlive or undercut a real one.
    maxAge: SESSION_MAX_AGE,
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
        /* Stamped at sign-in and compared on every session read. Tokens minted
           before this claim existed carry undefined, which reads as 0 below --
           the same value every existing row was backfilled with -- so shipping
           this signs nobody out. */
        token.credentialVersion = user.credentialVersion ?? 0;
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
            isBlocked: true,
            credentialVersion: true,
            emailVerified: true,
            email: true,
            batchType: true,
            batchYear: true,
            name: true,
            photoUrl: true,
            birdOverride: true,
            /* Not chrome: the only reader is the layout's presence write, which
               skips its throttled UPDATE when this is fresh. Riding on the read
               this callback already does is what makes that skip free -- asking
               the row for it separately would cost the round trip it saves. */
            lastSeenAt: true,
          },
        });
        /* The three ways a token that verifies cryptographically is still not
           a session any more -- deleted row, blocked account, stale password
           epoch -- all live in `sessionRevoked`, which spells each one out.
           An INVALID marker is returned rather than a patched-up session, and
           the auth() wrapper below turns that into null, so every one of the
           ~86 `if (!session?.user?.id)` guards refuses with no per-action
           change needed. (The row-gone case used to skip this branch but
           still RETURN a session with an id set from the JWT, so a deleted
           account kept browsing until the token expired, now ninety days
           -- audit M6.) */
        if (sessionRevoked(dbUser, token.credentialVersion)) {
          session.invalid = true;
          return session;
        }

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
          /* What every gate reads: confirmed, OR still waiting behind the
             daily email limit with nothing yet sent (owner, 2026-09-29;
             docs/spec/email.md Rule 1). Kept apart from emailConfirmed
             because the banner must stay up during the wait -- the fact and
             the permission are two different questions. */
          session.user.emailGateOpen = await emailGateOpenFor({
            id: token.id as string,
            email: dbUser.email,
            emailVerified: dbUser.emailVerified,
          });
          session.user.email = dbUser.email;
          session.user.batchType = dbUser.batchType;
          session.user.batchYear = dbUser.batchYear;
          session.user.name = dbUser.name;
          session.user.photoUrl = dbUser.photoUrl;
          session.user.birdOverride = dbUser.birdOverride;
          /* ISO string, not the Date the row holds: NextAuth's session is a
             JSON payload, so a Date put on `session.user` arrives at the
             reader as a string and `.getTime()` throws. Converted here so the
             type says what actually crosses. */
          session.user.lastSeenAt = dbUser.lastSeenAt?.toISOString() ?? null;
        }
      }
      return session;
    },
    /* There is deliberately no signIn callback promoting anybody.
       Until 2026-08-19 this block re-wrote `role: "admin"` onto whichever row
       matched process.env.ADMIN_EMAIL, on every single sign-in. It was not a
       bypass -- authorize() has already checked the password by the time it
       runs -- but it is the same anti-pattern as C1-a: a privilege granted by
       comparing a string instead of reading the row. Two concrete costs. It
       made adminSetRole's demotion meaningless for that one address, which
       would silently re-promote on next sign-in. And it meant control of one
       mailbox, rather than one password, was what ultimately decided who
       administered the community.
       Recovery, if an admin role is ever lost, is deliberate and local:
         node scripts/dev/set-password.mjs <email> --admin              */
  },
});

export const { handlers } = nextAuth;

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
      emailGateOpen: true,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session;
}

// Dedupe auth() within a single request. Without this, layout + page + each
// server action all call auth() independently, and each re-runs the session()
// callback's prisma.user.findUnique. React cache() collapses the repeat calls
// in one request to a single session resolution (one DB read instead of ~3).
/* The one place a revoked session becomes "not signed in".
 *
 *  The session callback can tell that a token is finished -- account deleted,
 *  member blocked, credentials rotated -- but its return type is a Session, so
 *  it cannot say "nobody". It marks the session instead, and this drops it.
 *
 *  Doing it here, rather than asking ~86 server actions to check a flag, is
 *  the whole point: this is the ONE function every page and every action calls
 *  to learn who you are, so a guard here cannot be forgotten by the next
 *  action somebody writes. That is precisely how H1 and H3 happened. */
async function guardedSession(): Promise<Session | null> {
  const session = await nextAuth.auth();
  if (!session || session.invalid) return null;
  return session;
}

export const auth = cache(
  IS_DEMO ? (demoSession as typeof nextAuth.auth) : (guardedSession as typeof nextAuth.auth),
);
