import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { GroupHeader } from "@/components/groups/group-header";
import { FeedColumn } from "@/components/posts/feed-column";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true, accountType: true, batchYear: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) notFound();

  const membership = group.members.find((m) => m.userId === session.user.id);
  if (!membership) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            You&apos;re not a member of this group.
          </h1>
          <p className="mt-2 text-muted-foreground">Ask a group admin to add you.</p>
        </div>
      </div>
    );
  }

  const isAdmin = membership.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <GroupHeader
        group={{ id: group.id, name: group.name, description: group.description }}
        members={group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          avatarColor: m.user.avatarColor,
          accountType: m.user.accountType,
          batchYear: m.user.batchYear,
          role: m.role,
        }))}
        isAdmin={isAdmin}
      />
      <FeedColumn
        groupId={group.id}
        showControls={false}
        placeholder={`Share something with ${group.name}...`}
        emptyTitle="No posts yet in this group."
        emptyHint="Be the first to share something with the group."
      />
    </div>
  );
}
