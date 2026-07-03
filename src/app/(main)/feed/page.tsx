import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { FeedRail } from "@/components/feed/feed-rail";
import { NewPostCTA } from "@/components/feed/new-post-cta";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user) return null;

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
      <div className="min-w-0">
        {/* The header lives in the main column, so the space beside it (above the
            rail) stays header-only, and the search / bell / New post never run
            over the rail. */}
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
      {/* The rail starts level with the composer, not the page header, so its
          first card aligns with the composer tile (per the contract). The offset
          equals the header block height plus its bottom margin. */}
      <aside className="hidden min-[1180px]:block">
        <div className="min-[1180px]:pt-[85px]">
          <FeedRail userId={session.user.id} />
        </div>
      </aside>
    </div>
  );
}
