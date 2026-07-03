import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { formatBatch } from "@/lib/utils";

/**
 * FeedRail: the right-hand companion column on the feed.
 *
 * Two cards, top to bottom, matching the contract:
 *  - "New in the directory": recent joiners, centered bird avatars, names link
 *    to their profile.
 *  - "Your groups": the groups you belong to, with member counts in office-blue.
 */
export async function FeedRail({ userId }: { userId: string }) {
  // Untyped so the avatar-override column (photoUrl) selects alongside the
  // always-present fields, matching the post-card author select.
  const memberSelect = {
    id: true,
    name: true,
    photoUrl: true,
    batchType: true,
    batchYear: true,
    currentCity: true,
  };

  const [recentMembers, myGroups] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false, id: { not: userId } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: memberSelect,
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
            <div className="[&>div+div]:border-t [&>div+div]:border-border">
              {recentMembers.map((m) => (
                <IdentityRow
                  key={m.id}
                  user={{
                    id: m.id,
                    name: m.name,
                    photoUrl: m.photoUrl ?? null,
                  }}
                  avatarHref={`/profile/${m.id}`}
                  avatarLabel={m.name}
                  className="py-2.5"
                  textClassName="flex-1"
                  name={
                    <Link
                      href={`/profile/${m.id}`}
                      className="block truncate text-[13.5px] font-semibold leading-none text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {m.name}
                    </Link>
                  }
                  meta={
                    <>
                      {formatBatch(m.batchType, m.batchYear)}
                      {m.currentCity ? ` · ${m.currentCity}` : ""}
                    </>
                  }
                  metaClassName="truncate leading-none"
                />
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
