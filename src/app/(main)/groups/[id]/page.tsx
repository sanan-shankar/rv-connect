import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { GroupFeed } from "@/components/groups/group-feed";

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
              batchYear: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!group) notFound();

  // Check membership
  const isMember = group.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="glass rounded-xl p-12">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            You&apos;re not a member of this group.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ask a group admin to add you.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin =
    group.members.find((m) => m.userId === session.user.id)?.role === "admin";

  // Get author names for posts
  const authorIds = [...new Set(group.posts.map((p) => p.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, avatarColor: true, batchYear: true },
  });
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));

  const posts = group.posts.map((p) => ({
    id: p.id,
    content: p.content,
    images: p.images,
    createdAt: p.createdAt.toISOString(),
    author: authorMap[p.authorId] || { id: p.authorId, name: "Unknown", avatarColor: null, batchYear: 0 },
    isOwn: p.authorId === session.user.id,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <GroupFeed
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          creatorName: group.creator.name,
        }}
        members={group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          avatarColor: m.user.avatarColor,
          batchYear: m.user.batchYear,
          role: m.role,
        }))}
        posts={posts}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
      />
    </div>
  );
}
