import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine } from "@/lib/utils";
import { PostCard } from "@/components/posts/post-card";
import { AdminProfileTools } from "@/components/profile/admin-profile-tools";
import { FlagPersonDialog } from "@/components/profile/flag-person-dialog";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Hash,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isBlocked) notFound();

  const isOwnProfile = session.user.id === user.id;
  const isAdmin = session.user.role === "admin";

  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;
  const [posts, postCount] = await Promise.all([
    prisma.post.findMany({
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
            accountType: true,
            verifyState: true,
            batchType: true,
            batchYear: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: session.user.id }, select: { id: true } },
        pollOptions: {
          orderBy: { position: "asc" },
          include: { _count: { select: { votes: true } } },
        },
        pollVotes: { where: { userId: session.user.id }, select: { pollOptionId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.post.count({ where: { authorId: user.id, isHidden: false } }),
  ]);

  const profession =
    user.jobTitle && user.workplace
      ? `${user.jobTitle} at ${user.workplace}`
      : user.jobTitle || user.workplace || null;

  const details = [
    { icon: GraduationCap, label: batchLine(user) },
    profession ? { icon: Briefcase, label: profession } : null,
    user.currentCity ? { icon: MapPin, label: user.currentCity } : null,
    user.yearJoined && user.yearLeft
      ? { icon: CalendarDays, label: `In the valley ${user.yearJoined} to ${user.yearLeft}` }
      : null,
    (isOwnProfile || isAdmin) && user.admissionNumber
      ? { icon: Hash, label: `Admission no. ${user.admissionNumber}` }
      : null,
  ].filter(Boolean) as { icon: typeof MapPin; label: string }[];

  const contacts = [
    { icon: Mail, label: "Email", href: `mailto:${user.email}`, show: true },
    { icon: Phone, label: "Phone", href: user.phone ? `tel:${user.phone}` : null, show: !!user.phone },
    {
      icon: Instagram,
      label: "Instagram",
      href: user.instagram ? `https://instagram.com/${user.instagram.replace("@", "")}` : null,
      show: !!user.instagram,
    },
    {
      icon: Linkedin,
      label: "LinkedIn",
      href: user.linkedin
        ? user.linkedin.startsWith("http")
          ? user.linkedin
          : `https://${user.linkedin}`
        : null,
      show: !!user.linkedin,
    },
  ].filter((c) => c.show && c.href);

  return (
    <div className="space-y-6">
      {/* Cover + identity */}
      <section className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div
          className="relative h-40 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/landing.jpeg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/35" />
        </div>
        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="-mt-14">
              <BirdAvatar user={{ id: user.id, name: user.name }} size="lg" ring />
            </div>
            <div className="flex-1 pb-1">
              <h1 className="flex items-center gap-1.5 font-heading text-2xl font-bold tracking-tight text-foreground">
                {user.name}
                <VerifiedMark user={user} size={16} />
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em]">
                  {batchLine(user)}
                </span>
                {user.currentCity && (
                  <>
                    <span className="text-[15px] leading-none opacity-60">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {user.currentCity}
                    </span>
                  </>
                )}
                {profession && (
                  <>
                    <span className="text-[15px] leading-none opacity-60">·</span>
                    <span>{profession}</span>
                  </>
                )}
              </div>
            </div>
            {isOwnProfile ? (
              <Link href="/settings" className="pb-1">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit profile
                </Button>
              </Link>
            ) : (
              <div className="pb-1">
                <FlagPersonDialog userId={user.id} name={user.name} />
              </div>
            )}
          </div>

          {user.bio && (
            <p className="mt-4 max-w-prose text-[15px] leading-[1.7] text-foreground">
              {user.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-[13px] text-muted-foreground">
            <span>
              <b className="font-bold text-foreground">{postCount}</b>{" "}
              {postCount === 1 ? "post" : "posts"}
            </span>
            {user.yearJoined && user.yearLeft && (
              <span>
                In the valley{" "}
                <b className="font-bold text-foreground">
                  {user.yearJoined} to {user.yearLeft}
                </b>
              </span>
            )}
          </div>
        </div>
      </section>

      {isAdmin && !isOwnProfile && (
        <AdminProfileTools userId={user.id} isBlocked={user.isBlocked} adminNote={user.adminNote} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Posts */}
        <main className="min-w-0">
          <h2 className="mb-3 font-heading text-lg font-bold tracking-tight text-foreground">
            Posts
          </h2>
          {posts.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No posts yet.
            </div>
          ) : (
            <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  variant="sheet"
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
                    poll:
                      p.pollOptions.length > 0
                        ? {
                            options: p.pollOptions.map((o) => ({
                              id: o.id,
                              text: o.text,
                              voteCount: o._count.votes,
                            })),
                            totalVotes: p.pollOptions.reduce((s, o) => s + o._count.votes, 0),
                            userVotedOptionId: p.pollVotes[0]?.pollOptionId ?? null,
                          }
                        : null,
                  }}
                />
              ))}
            </div>
          )}
        </main>

        {/* Rail */}
        <aside className="space-y-4">
          <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
            <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Details
            </h3>
            <div className="space-y-1">
              {details.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1 text-[13.5px] text-foreground">
                  <d.icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                  {d.label}
                </div>
              ))}
            </div>
          </section>

          {contacts.length > 0 && (
            <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
              <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Contact
              </h3>
              <div className="space-y-1">
                {contacts.map((c) => (
                  <a
                    key={c.label}
                    href={c.href as string}
                    target={c.href!.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-1 text-[13.5px] text-foreground hover:text-leaf"
                  >
                    <c.icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                    {c.label}
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
