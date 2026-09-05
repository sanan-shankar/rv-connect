import Link from "next/link";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine, metaLine } from "@/lib/utils";
import { shortPlaceLabel } from "@/lib/normalize";
import { RailCard } from "./rail-card";
import { IDENTITY_SELECT } from "@/lib/people-select";

/**
 * "New in the directory": the most recently joined members, excluding the
 * viewer. Hides entirely if there is no one else in the directory yet.
 */
export async function DirectoryModule({ userId }: { userId: string }) {
  /* This card is directory data wearing a feed shape -- names, batches,
     cities -- so it holds the directory's own Stage 1 line (trust model,
     audit M1): no confirmed email, no names. Found by the Phase 3 write-path
     review AFTER the directory page itself was gated; the lesson is that a
     capability lives everywhere its data is serialized, not on one route.
     Hidden rather than locked-carded: the rail is optional garnish, and the
     directory page already teaches the gate. */
  const session = await auth();
  if (!IS_DEMO && !session?.user?.emailConfirmed) return null;

  // Untyped so the avatar-override column (photoUrl) selects alongside the
  // always-present fields, matching the post-card author select.
  const recentMembers = await prisma.user.findMany({
    where: { isBlocked: false, deletionRequestedAt: null, id: { not: userId } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      ...IDENTITY_SELECT,
      accountType: true,
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
              /* metaLine: blankWhenUnknown keeps this deliberately blank for
                 members with no batch year (a compact rail, no "Member" filler
                 wanted), and the blank must take its dot with it or the row
                 reads "· City". batchLine, not formatBatch, so a teacher reads
                 "Teacher" here rather than falling through to that same blank. */
              metaLine(
                batchLine(m, { blankWhenUnknown: true }),
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
