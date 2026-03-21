import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatBatch } from "@/lib/utils";
import { PostCard } from "@/components/posts/post-card";
import { AdminProfileTools } from "@/components/profile/admin-profile-tools";
import {
  MapPin,
  Briefcase,
  Building2,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Pencil,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isBlocked) {
    notFound();
  }

  const isOwnProfile = session.user.id === user.id;
  const isAdmin = session.user.role === "admin";

  // Fetch user's posts
  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;
  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      isHidden: false,
      OR: [
        { targetBatches: null },
        { targetBatches: "" },
        { targetBatches: { contains: userBatch } },
      ],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          batchType: true,
          batchYear: true,
        },
      },
      _count: {
        select: { comments: true, likes: true },
      },
      likes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const infoItems = [
    { icon: Hash, label: "Admission No.", value: user.admissionNumber ? String(user.admissionNumber) : null },
    { icon: MapPin, label: "City", value: user.currentCity },
    { icon: Building2, label: "Workplace", value: user.workplace },
    { icon: Briefcase, label: "Job Title", value: user.jobTitle },
    { icon: Phone, label: "Phone", value: user.phone },
    { icon: Instagram, label: "Instagram", value: user.instagram },
    { icon: Linkedin, label: "LinkedIn", value: user.linkedin },
  ].filter((item) => item.value);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <UserAvatar
              name={user.name}
              avatarColor={user.avatarColor}
              size="xl"
            />
            <div className="mt-4 sm:ml-6 sm:mt-0">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {user.name}
              </h1>
              <p className="text-muted-foreground">
                {formatBatch(user.batchType, user.batchYear)}
                {user.yearJoined && user.yearLeft && (
                  <span className="ml-2 text-sm">
                    ({user.yearJoined}–{user.yearLeft})
                  </span>
                )}
              </p>
              {user.bio && (
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground">
                  {user.bio}
                </p>
              )}
              {isOwnProfile && (
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit profile
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info grid */}
      {infoItems.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    {item.label === "LinkedIn" && item.value ? (
                      <a
                        href={
                          item.value.startsWith("http")
                            ? item.value
                            : `https://${item.value}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-leaf hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : item.label === "Instagram" && item.value ? (
                      <a
                        href={`https://instagram.com/${item.value.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-leaf hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm text-foreground">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin tools */}
      {isAdmin && !isOwnProfile && (
        <AdminProfileTools userId={user.id} isBlocked={user.isBlocked} adminNote={user.adminNote} />
      )}

      {/* User's posts */}
      <div>
        <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
          Posts by {user.name.split(" ")[0]}
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={{
                  id: p.id,
                  content: p.content,
                  tag: p.tag,
                  images: p.images,
                  createdAt: p.createdAt.toISOString(),
                  author: p.author,
                  commentCount: p._count.comments,
                  likeCount: p._count.likes,
                  liked: p.likes.length > 0,
                  isOwn: p.authorId === session.user.id,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
