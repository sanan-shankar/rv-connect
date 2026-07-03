import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupHeader } from "@/components/groups/group-header";
import { FeedColumn } from "@/components/posts/feed-column";
import { InviteResponse } from "@/components/groups/invite-response";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return { title: "Group" };

  const group = await prisma.group.findUnique({
    where: { id },
    select: {
      name: true,
      visibility: true,
      members: { where: { userId: session.user.id }, select: { id: true } },
    },
  });
  if (!group) return { title: "Group" };

  // Private groups are hidden from non-members; do not leak the name in the title.
  if (group.visibility === "private" && group.members.length === 0) {
    return { title: "Group" };
  }

  return { title: group.name };
}

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
            select: {
              id: true,
              name: true,
              avatarColor: true,
              photoUrl: true,
              accountType: true,
              batchYear: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            This group is not available.
          </h1>
          <p className="mt-2 text-muted-foreground">
            The demo data may have been reset, or this link points to an older group id.
          </p>
          <Link href="/groups" className="mt-5 inline-flex">
            <Button variant="primary">View current groups</Button>
          </Link>
        </div>
      </div>
    );
  }

  const membership = group.members.find((m) => m.userId === session.user.id);
  const myRole = membership?.role ?? null;
  const isPrivate = group.visibility === "private";

  // A pending invite lets a non-member preview the group and accept/decline,
  // even when it is private (this is the bell's "invited you" entry point).
  const pendingInvite = membership
    ? null
    : await prisma.groupInvite.findUnique({
        where: {
          groupId_inviteeId: { groupId: id, inviteeId: session.user.id },
        },
        select: {
          status: true,
          inviter: { select: { name: true } },
        },
      });
  const hasPendingInvite = pendingInvite?.status === "pending";

  // Private groups are hidden from non-members without an invite. Public groups
  // are previewable (header + Join), so members and browsers can both reach this.
  if (isPrivate && !membership && !hasPendingInvite) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            This group is invite-only.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ask the group Keeper for an invite to see what is shared here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <GroupHeader
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          coverImage: group.coverImage,
          visibility: group.visibility,
        }}
        members={group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          avatarColor: m.user.avatarColor,
          photoUrl: m.user.photoUrl,
          accountType: m.user.accountType,
          batchYear: m.user.batchYear,
          role: m.role,
        }))}
        myRole={myRole}
      />

      {hasPendingInvite && (
        <InviteResponse
          groupId={group.id}
          groupName={group.name}
          inviterName={pendingInvite?.inviter.name ?? "A Keeper"}
        />
      )}

      {membership ? (
        <FeedColumn
          groupId={group.id}
          showControls={false}
          placeholder={`Share something with ${group.name}...`}
          currentUser={{ id: session.user.id, name: session.user.name, photoUrl: session.user.photoUrl }}
          emptyTitle="No posts yet in this group."
          emptyHint="Be the first to share something with the group."
        />
      ) : (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center">
          <p className="font-heading text-lg tracking-tight text-foreground">
            Join to see and share posts
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {hasPendingInvite
              ? "Accept the invite above to read the feed and post here."
              : "This is a public group. Join from the header above to read the feed and post."}
          </p>
        </div>
      )}
    </div>
  );
}
