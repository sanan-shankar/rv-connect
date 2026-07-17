import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { FeedRail } from "@/components/feed/feed-rail";
import { NewPostCTA } from "@/components/feed/new-post-cta";
import { CelebrationSignals } from "@/components/mascot/moments/celebration-signals";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { q } = await searchParams;

  const [unreadCount, userPlaces] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
    prisma.userPlace.findMany({
      where: { userId: session.user.id },
      orderBy: { position: "asc" },
      select: { city: true },
    }),
  ]);

  return (
    <>
      {/* Post-signup welcome, first-Letter, and proud-moment celebrations
          (mascot-moments board). Invisible unless a one-shot is due; see
          src/components/mascot/moments/celebration-signals.tsx. The
          post-signup welcome piece itself now plays on /welcome (a fresh
          signup lands there first, before ever reaching this page) — this
          mount stays for the other two, which are unrelated to onboarding. */}
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
            searchScope="posts"
            unreadCount={unreadCount}
            actions={<NewPostCTA />}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
        <div className="min-w-0">
          <FeedColumn
            showControls={false}
            initialSearch={q}
            currentUser={{ id: session.user.id, name: session.user.name, photoUrl: session.user.photoUrl, birdOverride: session.user.birdOverride }}
            userPlaces={userPlaces.map((p) => p.city)}
          />
        </div>
        <aside className="hidden min-[1180px]:block">
          <FeedRail userId={session.user.id} />
        </aside>
      </div>
    </>
  );
}
