import { auth } from "@/lib/auth";

export default async function FeedPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">Feed</h1>
      <p className="text-muted-foreground">
        Welcome back, {session?.user?.name || "friend"}! The feed will be built
        in Phase 4.
      </p>
    </div>
  );
}
