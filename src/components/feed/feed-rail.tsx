import Link from "next/link";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatBatch } from "@/lib/utils";

/**
 * FeedRail: the right-hand companion column on the feed.
 *
 * Three cards, top to bottom, matching the contract:
 *  - "Coming up": the next event, with an iPhone-calendar date chip (cinnamon)
 *    and an RSVP. Static for now; swaps to real data when the Events feature lands.
 *  - "New in the directory": recent joiners, centered bird avatars, names link
 *    to their profile.
 *  - "Your groups": the groups you belong to, with member counts in office-blue.
 */
export async function FeedRail({ userId }: { userId: string }) {
  const [recentMembers, myGroups] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false, id: { not: userId } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        avatarColor: true,
        batchType: true,
        batchYear: true,
        currentCity: true,
      },
    }),
    prisma.group.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, _count: { select: { members: true } } },
    }),
  ]);

  return (
    <div className="w-full">
      <div className="sticky top-7 space-y-4">
        <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
          <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Coming up
          </h3>
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-[52px] shrink-0 flex-col items-center justify-center gap-px rounded-[14px] bg-cinnamon/[0.13]">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cinnamon">
                Nov
              </span>
              <span className="text-[21px] font-bold leading-none text-foreground">14</span>
            </div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold leading-tight text-foreground">
                Founders&rsquo; Week
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <MapPin className="h-[13px] w-[13px] shrink-0" />
                Rishi Valley, AP
              </div>
              <button
                type="button"
                className="mt-2.5 inline-flex h-[34px] items-center justify-center rounded-full bg-cinnamon/[0.14] px-4 text-[13px] font-semibold text-cinnamon transition-[transform,background-color] duration-150 ease-out hover:bg-cinnamon/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinnamon/50 active:scale-[0.97]"
              >
                RSVP
              </button>
            </div>
          </div>
        </section>

        {recentMembers.length > 0 && (
          <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
            <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              New in the directory
            </h3>
            <div className="[&>div+div]:border-t [&>div+div]:border-border">
              {recentMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <Link
                    href={`/profile/${m.id}`}
                    aria-label={m.name}
                    className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
                  >
                    <BirdAvatar
                      user={{ id: m.id, name: m.name, avatarColor: m.avatarColor }}
                      size="sm"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${m.id}`}
                      className="block truncate text-[13.5px] font-semibold leading-tight text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {m.name}
                    </Link>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {formatBatch(m.batchType, m.batchYear)}
                      {m.currentCity ? ` · ${m.currentCity}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
          <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Your groups
          </h3>
          {myGroups.length === 0 ? (
            <p className="py-1 text-[13px] leading-relaxed text-muted-foreground">
              You have not joined any groups yet.{" "}
              <Link href="/groups" className="font-semibold text-leaf hover:underline">
                Find one
              </Link>
              .
            </p>
          ) : (
            <div className="[&>a+a]:border-t [&>a+a]:border-border">
              {myGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="flex items-center py-2 text-[13.5px] font-semibold text-foreground transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="ml-auto pl-3 text-xs font-semibold text-sky">
                    {g._count.members}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
