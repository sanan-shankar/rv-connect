import { auth } from "@/lib/auth";
import { CreatePostForm } from "@/components/posts/create-post-form";
import { PostFeed } from "@/components/posts/post-feed";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="space-y-6">
      <CreatePostForm />
      <PostFeed />
    </div>
  );
}
