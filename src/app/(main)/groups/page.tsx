import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { GroupCard, type GroupCardData } from "@/components/groups/group-card";

export const metadata: Metadata = {
  title: "Groups",
};

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const select = {
    id: true,
    name: true,
    description: true,
    coverImage: true,
    visibility: true,
    creator: { select: { name: true } },
    members: { where: { role: "admin" }, select: { user: { select: { name: true } } } },
    _count: { select: { members: true, posts: true } },
  };

  const [myGroups, browseGroups] = await Promise.all([
    prisma.group.findMany({
      where: { members: { some: { userId } } },
      select,
      orderBy: { updatedAt: "desc" },
    }),
    // Public groups the viewer has not joined: the browseable, auto-joinable set.
    prisma.group.findMany({
      where: { visibility: "public", members: { none: { userId } } },
      select,
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  const toCard = (g: (typeof myGroups)[number]): GroupCardData => ({
    id: g.id,
    name: g.name,
    description: g.description,
    coverImage: g.coverImage,
    visibility: g.visibility,
    memberCount: g._count.members,
    postCount: g._count.posts,
    keeperName: g.members[0]?.user.name ?? g.creator.name,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Groups"
        subtitle="Spaces for batches, friends, and shared interests across the valley."
        actions={
          <Link href="/groups/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New group
            </Button>
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          Your groups
        </h2>
        {myGroups.length === 0 ? (
          <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-heading text-lg tracking-tight text-foreground">
              You have not joined any groups yet.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Join a public group below, or start your own.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myGroups.map((g) => (
              <GroupCard key={g.id} group={toCard(g)} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-9 space-y-3">
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Browse public groups
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open to everyone. Join from the group page anytime.
          </p>
        </div>
        {browseGroups.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing new to browse right now. You have joined every public group.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {browseGroups.map((g) => (
              <GroupCard key={g.id} group={toCard(g)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
