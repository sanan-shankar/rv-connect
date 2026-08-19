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
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accountType: string;
      /** Community standing (office list / vouching / flagged). Unrelated to
       *  `emailVerified` below, which is only ever "did this address answer". */
      verifyState: string;
      /** True once the person clicked the link we mailed them. Gates posting,
       *  uploads and other members' contact details
       *  (src/lib/email-verification.ts).
       *
       *  NOT called `emailVerified`: NextAuth's own adapter types already
       *  declare that name on this user as a `Date`, and interface merging
       *  INTERSECTS rather than overrides, so a boolean of the same name
       *  resolves to the uninhabitable `Date & boolean`. The database column
       *  is still `User.emailVerified`; this is the derived flag. */
      emailConfirmed: boolean;
      batchType: string | null;
      batchYear: number | null;
      avatarColor: string | null;
      photoUrl: string | null;
      birdOverride: string | null;
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
    avatarColor?: string | null;
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
    avatarColor?: string | null;
  }
}
