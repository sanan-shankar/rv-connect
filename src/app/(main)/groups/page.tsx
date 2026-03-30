import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { members: true, posts: true } },
      creator: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-[-0.02em] text-foreground">
            Groups
          </h1>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Private spaces for batches, friends, or any group of alumni.
          </p>
        </div>
        <Link href="/groups/new">
          <Button variant="leaf">
            <Plus className="mr-1.5 h-4 w-4" />
            New Group
          </Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-heading text-lg tracking-tight text-foreground">
            You&apos;re not in any groups yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a group to share memories privately with your batchmates or friends.
          </p>
          <Link href="/groups/new">
            <Button variant="leaf" className="mt-4">
              Create your first group
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <div className="glass rounded-xl p-4 pt-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                      {group.name}
                    </h2>
                    {group.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                        {group.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{group._count.members} members</span>
                      <span>{group._count.posts} posts</span>
                      <span>Created by {group.creator.name.split(" ")[0]}</span>
                    </div>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
