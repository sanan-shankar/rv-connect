import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { FeedRail } from "@/components/feed/feed-rail";
import { NewPostCTA } from "@/components/feed/new-post-cta";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user) return null;

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
      <div className="min-w-0">
        <PageHeader
          title="Feed"
          subtitle="What the valley's alumni are sharing today."
          showSearch
          unreadCount={unreadCount}
          actions={<NewPostCTA />}
        />
        <FeedColumn
          showControls={false}
          currentUser={{ id: session.user.id, name: session.user.name }}
        />
      </div>
      {/* The rail drops to the composer line, matching the contract (Coming up
          aligns with the composer, not the page header). */}
      <aside className="hidden min-[1180px]:block">
        <div className="mt-[88px]">
          <FeedRail userId={session.user.id} />
        </div>
      </aside>
    </div>
  );
}
