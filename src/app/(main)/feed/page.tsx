import { auth } from "@/lib/auth";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { FeedRail } from "@/components/feed/feed-rail";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader
        title="Feed"
        subtitle="What the valley's alumni are sharing today."
      />
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <FeedColumn />
        </div>
        <FeedRail userId={session.user.id} />
      </div>
    </div>
  );
}
