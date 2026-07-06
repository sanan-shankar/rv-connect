import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { FeedRail } from "@/components/feed/feed-rail";
import { NewPostCTA } from "@/components/feed/new-post-cta";
import { GreetingStrip } from "@/components/feed/greeting-strip";
import { CelebrationSignals } from "@/components/mascot/moments/celebration-signals";

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
    <>
      {/* Post-signup welcome, first-Letter, and proud-moment celebrations
          (mascot-moments board). Invisible unless a one-shot is due; see
          src/components/mascot/moments/celebration-signals.tsx. */}
      <CelebrationSignals userId={session.user.id} />
      <div className="grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
        <div className="min-w-0">
          {/* The header lives in the main column, so the space beside it (above the
              rail) stays header-only, and the search / bell / New post never run
              over the rail. */}
          <PageHeader
            title="Feed"
            subtitle="What the valley is sharing today."
            showSearch
            unreadCount={unreadCount}
            actions={<NewPostCTA />}
          />
          <FeedColumn
            showControls={false}
            currentUser={{ id: session.user.id, name: session.user.name, photoUrl: session.user.photoUrl }}
          />
        </div>
        {/* The greeting strip fills the top-right rectangle beside the page header
            (the owner's pick from /preview/delight/feed-canvas). The rail below it
            still starts level with the composer, not the header, so its first card
            aligns with the composer tile (per the contract). */}
        <aside className="hidden min-[1180px]:block">
          <div className="flex flex-col gap-4">
            <GreetingStrip name={session.user.name} />
            <FeedRail userId={session.user.id} />
          </div>
        </aside>
      </div>
    </>
  );
}
