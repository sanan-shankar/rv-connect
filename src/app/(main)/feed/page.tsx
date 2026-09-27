import { logSearch } from "@/lib/search-log";
import type { Metadata } from "next";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadNotificationCount } from "@/lib/notification-count";
import { getViewerCities } from "@/lib/city-scope";
import { FeedColumn } from "@/components/posts/feed-column";
import { PageHeader } from "@/components/layout/page-header";
import { SearchPill } from "@/components/layout/search-pill";
import { RAIL_GRID, RAIL_ASIDE } from "@/components/layout/rail-grid";
import { FeedRail } from "@/components/feed/feed-rail";
import { NewPostCTA } from "@/components/feed/new-post-cta";
import { NewPostDock } from "@/components/feed/new-post-dock";
import { CelebrationSignals } from "@/components/mascot/moments/celebration-signals";
import { batchTargetKey } from "@/lib/post-visibility-rule";
import { IS_DEMO } from "@/lib/demo";
import { GuideTourStart } from "@/components/guide/guide-tour-start";

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

  /* The header pill submits here, so this is where a feed search becomes
     visible. after(), not the old `void`: the feed still renders at the same
     speed whether or not a statistics row lands, but a bare `void` write
     raced the response and Vercel can freeze or tear down the instance the
     moment that response streams, silently losing the row (bug audit Lows
     25/35/44/72/77/82/87). after() keeps the invocation alive for it. */
  if (q) {
    after(() => logSearch({ scope: "feed", query: q, userId: session.user.id }));
  }

  const [unreadCount, userPlaces, marker] = await Promise.all([
    unreadNotificationCount(session.user.id),
    getViewerCities(session.user.id),
    /* The "New since you were last here" marker. Read here rather than in the
       client so it is the ACCOUNT's marker, not this browser's -- it used to
       sit in localStorage, which announced the same posts as new again on
       every device the member signed in on (owner, 2026-08-20). The guide's
       tour marker rides on the same read for the same reason, and costs no
       second round trip (docs/spec/guide.md 5.3). */
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { feedSeenAt: true, guideSeenAt: true },
    }),
  ]);

  const you = {
    id: session.user.id,
    name: session.user.name,
    photoUrl: session.user.photoUrl,
    birdOverride: session.user.birdOverride,
  };

  return (
    <>
      {/* Post-signup welcome, first-Letter, and proud-moment celebrations
          (mascot-moments board). Invisible unless a one-shot is due; see
          src/components/mascot/moments/celebration-signals.tsx. The
          post-signup welcome piece itself now plays on /welcome (a fresh
          signup lands there first, before ever reaching this page) — this
          mount stays for the other two, which are unrelated to onboarding. */}
      <CelebrationSignals userId={session.user.id} />
      {/* The guide's first-run tour, once per account, and never on the demo,
          whose first frame is the product (docs/spec/guide.md 5.1). */}
      {!IS_DEMO && marker && !marker.guideSeenAt && (
        <GuideTourStart
          userId={session.user.id}
          isTeacher={session.user.accountType === "teacher" || session.user.accountType === "ex_teacher"}
        />
      )}
      {/* The New post badge in the header and the composer in the column are
          one control split across two grid rows; the dock is what they share. */}
      <NewPostDock>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          {/* The header lives in the main column, so the space beside it (above the
              rail) stays header-only, and the search / bell / New post never run
              over the rail. */}
          {/* No subtitle (owner, 2026-08-22): the feed says what it is. */}
          <PageHeader
        guide="feed"
            title="Feed"
            search={<SearchPill />}
            unreadCount={unreadCount}
            actions={<NewPostCTA user={you} />}
          />
        </div>
      </div>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          <FeedColumn
            initialSearch={q}
            currentUser={you}
            userPlaces={userPlaces}
            lastSeenAt={marker?.feedSeenAt?.toISOString() ?? null}
          />
        </div>
        <aside className={RAIL_ASIDE}>
          <FeedRail
            userId={session.user.id}
            viewer={{
              cities: userPlaces,
              batch: batchTargetKey(session.user.batchType, session.user.batchYear),
              isAdmin: session.user.role === "admin",
            }}
          />
        </aside>
      </div>
      </NewPostDock>
    </>
  );
}
