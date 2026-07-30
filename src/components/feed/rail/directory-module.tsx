import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { formatBatch, metaLine } from "@/lib/utils";
import { shortPlaceLabel } from "@/lib/normalize";
import { RailCard } from "./rail-card";

/**
 * "New in the directory": the most recently joined members, excluding the
 * viewer. Hides entirely if there is no one else in the directory yet.
 */
export async function DirectoryModule({ userId }: { userId: string }) {
  // Untyped so the avatar-override column (photoUrl) selects alongside the
  // always-present fields, matching the post-card author select.
  const recentMembers = await prisma.user.findMany({
    where: { isBlocked: false, id: { not: userId } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      name: true,
      photoUrl: true,
      birdOverride: true,
      batchType: true,
      batchYear: true,
      currentCity: true,
    },
  });

  if (recentMembers.length === 0) return null;

  return (
    <RailCard label="New in the directory">
      <div className="[&>*:last-child]:pb-0 [&>div+div]:border-t [&>div+div]:border-border">
        {recentMembers.map((m) => (
          <IdentityRow
            key={m.id}
            user={{ id: m.id, name: m.name, photoUrl: m.photoUrl ?? null, birdOverride: m.birdOverride }}
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
              /* metaLine: formatBatch is deliberately blank for members with
                 no batch year (a compact rail, no "Member" filler wanted), and
                 the blank must take its dot with it or the row reads "· City". */
              metaLine(
                formatBatch(m.batchType, m.batchYear),
                m.currentCity && shortPlaceLabel(m.currentCity)
              )
            }
            metaClassName="truncate leading-none"
          />
        ))}
      </div>
    </RailCard>
  );
}
