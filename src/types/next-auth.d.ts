import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      batchType: string;
      batchYear: number;
      avatarColor: string | null;
    };
  }

  interface User {
    role?: string;
    batchType?: string;
    batchYear?: number;
    avatarColor?: string | null;
  }
}
