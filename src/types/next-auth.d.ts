import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Set by the session callback when the token is cryptographically valid
     *  but no longer stands for a session: the row is gone, the member is
     *  blocked, or credentialVersion has moved on. The auth() wrapper in
     *  src/lib/auth.ts turns this into null, so application code never sees a
     *  session carrying it. */
    invalid?: boolean;
    /** Set by the session callback when the member's row could not be READ
     *  (a pool timeout, the database down): not a verdict on the session. The
     *  auth() wrapper turns it into null plus sessionWasUnavailable(), so the
     *  (main) layout shows the error screen instead of the sign-in form. */
    unavailable?: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accountType: string;
      /** Community standing (office list / vouching / flagged). Unrelated to
       *  `emailVerified` below, which is only ever "did this address answer". */
      verifyState: string;
      /** True once the person clicked the link we mailed them. The FACT
       *  only: since 2026-09-29 no gate reads it directly, they read
       *  `emailGateOpen` below, which is this or a confirmation still
       *  waiting on our daily limit.
       *
       *  NOT called `emailVerified`: NextAuth's own adapter types already
       *  declare that name on this user as a `Date`, and interface merging
       *  INTERSECTS rather than overrides, so a boolean of the same name
       *  resolves to the uninhabitable `Date & boolean`. The database column
       *  is still `User.emailVerified`; this is the derived flag. */
      emailConfirmed: boolean;
      /** What every confirmed-email gate reads: `emailConfirmed`, OR the
       *  member's confirmation is still waiting in our queue with none ever
       *  sent to this address (src/lib/email-gate-open.ts). The daily email
       *  limit is ours, so it must not lock anybody out (owner, 2026-09-29).
       *  Read `emailConfirmed` only for the FACT -- the banner, "already
       *  confirmed" -- and this for every permission. */
      emailGateOpen: boolean;
      batchType: string | null;
      batchYear: number | null;
      photoUrl: string | null;
      birdOverride: string | null;
      /** When this member was last recorded as here, as an ISO string -- the
       *  session is a JSON payload, so a Date does not survive the crossing.
       *  Optional because the demo persona is assembled by hand and has no
       *  row-read behind it; the presence write treats "unknown" as "stale",
       *  so an absent value costs one UPDATE and never a wrong one. */
      lastSeenAt?: string | null;
    };
  }

  interface User {
    role?: string;
    /** Copied into the JWT at sign-in so the session callback can compare it
     *  against the row on every read. */
    credentialVersion?: number;
    accountType?: string;
    verifyState?: string;
    batchType?: string | null;
    batchYear?: number | null;
    photoUrl?: string | null;
    birdOverride?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    credentialVersion?: number;
    batchType?: string | null;
    batchYear?: number | null;
  }
}
