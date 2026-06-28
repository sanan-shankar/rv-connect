import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatBatch } from "@/lib/utils";

/**
 * FeedRail: the right-hand companion column on the feed.
 * Shows real data only: who recently joined, and the groups you belong to.
 * (A "Coming up" events card joins this rail when the Events feature lands.)
 */
export async function FeedRail({ userId }: { userId: string }) {
  const [recentMembers, myGroups] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false, id: { not: userId } },
      orderBy: { createdAt: "desc" },
      take: 4,
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
        {recentMembers.length > 0 && (
          <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
            <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              New in the directory
            </h3>
            <div className="[&>a+a]:border-t [&>a+a]:border-border">
              {recentMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/profile/${m.id}`}
                  className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <BirdAvatar user={{ id: m.id, name: m.name }} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
                      {m.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {formatBatch(m.batchType, m.batchYear)}
                      {m.currentCity ? ` · ${m.currentCity}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              href="/directory"
              className="mt-2 inline-block text-[12.5px] font-semibold text-leaf hover:underline"
            >
              Browse the directory
            </Link>
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
                  className="flex items-center py-2 text-[13.5px] font-semibold text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
