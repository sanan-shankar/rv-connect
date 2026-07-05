import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RailCard } from "./rail-card";

/**
 * "Your groups": the groups the viewer belongs to, member counts in
 * office-blue. Unlike the other modules this keeps its empty state (a
 * "Find one" nudge into /groups) rather than hiding -- it is the viewer's
 * own module, not ambient content, so an intentional invitation reads as
 * useful rather than padded.
 */
export async function GroupsModule({ userId }: { userId: string }) {
  const myGroups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, name: true, _count: { select: { members: true } } },
  });

  return (
    <RailCard label="Your groups">
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
    </RailCard>
  );
}
