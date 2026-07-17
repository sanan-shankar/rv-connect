import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accountType: string;
      verifyState: string;
      batchType: string | null;
      batchYear: number | null;
      avatarColor: string | null;
      photoUrl: string | null;
      birdOverride: string | null;
    };
  }

  interface User {
    role?: string;
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
    batchType?: string | null;
    batchYear?: number | null;
    avatarColor?: string | null;
  }
}
