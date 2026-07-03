import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine, parseJsonArray } from "@/lib/utils";
import { AdminProfileTools } from "@/components/profile/admin-profile-tools";
import { FlagPersonDialog } from "@/components/profile/flag-person-dialog";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileAuthorFeed } from "@/components/profile/profile-author-feed";
import { SavedPostsFeed } from "@/components/profile/saved-posts-feed";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
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
  Globe,
  Pencil,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Default suggestions when a member has not picked any "Open to" tags yet.
// People rarely invent their own, so we offer a sensible set to choose from.
const DEFAULT_OPEN_TO = ["Open to mentoring", "Hosting visitors", "Career chats"];

// Prompted school-memories scaffold. Empty answers are invisible on others'
// profiles; the owner sees a soft prompt to fill them in.
const MEMORY_PROMPTS = [
  { key: "favorite_teacher", label: "A teacher I remember", placeholder: "Who shaped your years in the valley?" },
  { key: "favorite_memory", label: "A favorite memory", placeholder: "A morning, a person, a place you still think about." },
  { key: "committees", label: "Committees and roles", placeholder: "Nature club, choir, editorial, sports..." },
] as const;

function socialHref(kind: "instagram" | "linkedin" | "website", value: string): string {
  const v = value.trim();
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (v.startsWith("http")) return v;
  return `https://${v}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return { title: "Profile" };
  return { title: user.name };
}

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
    include: {
      groupMemberships: {
        include: { group: { select: { id: true, name: true, _count: { select: { members: true } } } } },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { posts: true } },
    },
  });
  if (!user || user.isBlocked) notFound();

  // An orphaned GroupMember row can point at a deleted Group (group === null).
  // Filter those out before touching any group field, or the page throws.
  const groups = user.groupMemberships.filter((m) => m.group);

  const isOwnProfile = session.user.id === user.id;
  const isAdmin = session.user.role === "admin";
  const firstName = user.name.split(" ")[0];

  const postCount = user._count.posts;

  // Photos: flatten image arrays from this author's visible posts.
  const photoPosts = await prisma.post.findMany({
    where: { authorId: user.id, isHidden: false, NOT: { images: null } },
    select: { id: true, images: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const photos = photoPosts.flatMap((p) =>
    parseJsonArray(p.images).map((src) => ({ src, postId: p.id }))
  );

  const profession =
    user.jobTitle && user.workplace
      ? `${user.jobTitle} at ${user.workplace}`
      : user.jobTitle || user.workplace || null;

  // Public header meta line: batch, location, profession (never house).
  const metaParts = [batchLine(user), user.currentCity, profession].filter(Boolean) as string[];

  const openToTags = (user.openTo
    ? user.openTo.split(",").map((t) => t.trim()).filter(Boolean)
    : isOwnProfile
      ? DEFAULT_OPEN_TO
      : []);

  // Right-rail Details: full, variable-length record (only present fields).
  const details = [
    user.yearJoined && user.yearLeft
      ? { icon: CalendarDays, label: `In the valley ${user.yearJoined} to ${user.yearLeft}` }
      : user.yearJoined
        ? { icon: CalendarDays, label: `In the valley from ${user.yearJoined}` }
        : null,
    user.batchType && user.batchYear
      ? { icon: GraduationCap, label: `${user.batchType} ${user.batchYear}` }
      : null,
    user.accountType !== "alumnus" && user.subjects
      ? { icon: BookOpen, label: `Taught ${user.subjects}` }
      : null,
    user.currentCity ? { icon: MapPin, label: `Based in ${user.currentCity}` } : null,
    profession ? { icon: Briefcase, label: profession } : null,
    (isOwnProfile || isAdmin) && user.admissionNumber
      ? { icon: Hash, label: `Admission no. ${user.admissionNumber}`, privateNote: true }
      : null,
  ].filter(Boolean) as { icon: typeof MapPin; label: string; privateNote?: boolean }[];

  // Contact methods (email always available to signed-in members; rest if shared).
  const methods: ContactMethod[] = [
    { kind: "email" as const, label: "Email", value: user.email, href: `mailto:${user.email}` },
    user.phone
      ? { kind: "phone" as const, label: "Phone", value: user.phone, href: `tel:${user.phone}` }
      : null,
    user.instagram
      ? {
          kind: "instagram" as const,
          label: "Instagram",
          value: user.instagram.startsWith("@") ? user.instagram : `@${user.instagram}`,
          href: socialHref("instagram", user.instagram),
          external: true,
        }
      : null,
    user.linkedin
      ? {
          kind: "linkedin" as const,
          label: "LinkedIn",
          value: user.linkedin.replace(/^https?:\/\//, ""),
          href: socialHref("linkedin", user.linkedin),
          external: true,
        }
      : null,
  ].filter(Boolean) as ContactMethod[];

  // vCard from the public fields.
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${user.name}`,
    `EMAIL:${user.email}`,
    user.phone ? `TEL:${user.phone}` : null,
    profession ? `TITLE:${profession}` : null,
    user.currentCity ? `ADR:;;${user.currentCity};;;;` : null,
    user.instagram ? `URL:${socialHref("instagram", user.instagram)}` : null,
    user.linkedin ? `URL:${socialHref("linkedin", user.linkedin)}` : null,
    `NOTE:${batchLine(user)}, Rishi Valley community`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const railContactIcons = { email: Mail, phone: Phone, instagram: Instagram, linkedin: Linkedin, website: Globe };

  // ---- About tab content (server-rendered) ----
  const aboutNode = (
    <div className="space-y-4">
      <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          In their words
        </h3>
        {user.about ? (
          <p className="max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
            {user.about}
          </p>
        ) : isOwnProfile ? (
          <p className="text-[14px] leading-[1.7] text-muted-foreground">
            You haven&rsquo;t written an about section yet.{" "}
            <Link href="/settings" className="font-semibold text-leaf hover:underline">
              Add a few lines
            </Link>{" "}
            so people know who you are now.
          </p>
        ) : (
          <p className="text-[14px] leading-[1.7] text-muted-foreground">
            {firstName}{" "}hasn&rsquo;t written an about section yet.
          </p>
        )}
      </section>

      <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          The valley years
        </h3>
        {isOwnProfile ? (
          <div className="space-y-3">
            {MEMORY_PROMPTS.map((p) => (
              <div key={p.key} className="rounded-xl border border-dashed border-border px-4 py-3">
                <div className="text-[13px] font-semibold text-foreground">{p.label}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{p.placeholder}</div>
              </div>
            ))}
            <p className="pt-1 text-[13px] text-muted-foreground">
              Memory prompts are coming to{" "}
              <Link href="/settings" className="font-semibold text-leaf hover:underline">
                your settings
              </Link>
              . Answer the ones you remember; the rest stay hidden.
            </p>
          </div>
        ) : (
          <p className="text-[14px] leading-[1.7] text-muted-foreground">
            {firstName}{" "}hasn&rsquo;t shared valley memories yet.
          </p>
        )}
      </section>
    </div>
  );

  // ---- Photos tab content ----
  const photosNode =
    photos.length > 0 ? (
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((ph, i) => (
          <Link
            key={`${ph.postId}-${i}`}
            href={`/feed#${ph.postId}`}
            className="group block overflow-hidden rounded-2xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ph.src}
              alt=""
              className="aspect-square h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Cover + identity */}
      <section className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div
          className="relative h-44 bg-cover bg-center"
          style={{ backgroundImage: `url(${user.coverPhoto || "/images/landing.jpeg"})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
        </div>
        <div className="px-6 pb-5 pt-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative z-[2] -mt-14">
              <ProfileAvatar
                user={{ id: user.id, name: user.name, avatarColor: user.avatarColor, photoUrl: user.photoUrl }}
                size="lg"
                ring
              />
            </div>
            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="flex items-center gap-1.5 font-heading text-[26px] font-bold leading-[1.05] tracking-tight text-foreground">
                {user.name}
                <VerifiedMark user={user} size={16} />
              </h1>
              <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
                {metaParts.map((part, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {i > 0 && <span className="dotsep">·</span>}
                    {i === 1 && <MapPin className="h-3.5 w-3.5" />}
                    {part}
                  </span>
                ))}
              </div>
            </div>
            <div className="sm:pb-1">
              {isOwnProfile ? (
                <Link href="/settings">
                  <Button size="sm" className="rounded-full">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <GetInTouch name={user.name} methods={methods} vcard={vcard} />
                </div>
              )}
            </div>
          </div>

          {user.bio && (
            <p className="mt-4 max-w-[64ch] text-[15px] leading-[1.7] text-foreground">{user.bio}</p>
          )}

          {openToTags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {openToTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-leaf/10 px-3 py-1.5 text-[12px] font-semibold text-leaf"
                >
                  {t}
                </span>
              ))}
            </div>
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Main column: tabs */}
        <ProfileTabs
          showPhotos={photos.length > 0}
          showSaved={isOwnProfile}
          posts={
            <ProfileAuthorFeed
              authorId={user.id}
              firstName={firstName}
              isOwnProfile={isOwnProfile}
            />
          }
          about={aboutNode}
          photos={photosNode}
          saved={isOwnProfile ? <SavedPostsFeed /> : null}
        />

        {/* Rail */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
            <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Details
            </h3>
            <div className="space-y-1">
              {details.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 py-1 text-[13.5px] text-foreground"
                >
                  <d.icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                  <span>{d.label}</span>
                  {d.privateNote && (
                    <span className="ml-auto text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                      Private to you
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {(methods.length > 0 || isOwnProfile) && (
            <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
              <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Contact
              </h3>
              {methods.length > 0 ? (
                <div className="space-y-0.5">
                  {methods.map((m) => {
                    const Icon = railContactIcons[m.kind];
                    return (
                      <a
                        key={m.kind + m.value}
                        href={m.href}
                        target={m.external ? "_blank" : undefined}
                        rel={m.external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-2.5 rounded-lg py-1.5 text-[13.5px] text-foreground transition-colors duration-150 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block font-medium leading-tight">{m.label}</span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {m.value}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  You haven&rsquo;t shared any contact details yet.{" "}
                  <Link href="/settings" className="font-semibold text-leaf hover:underline">
                    Add some
                  </Link>{" "}
                  so people can reach you.
                </p>
              )}
            </section>
          )}

          {groups.length > 0 && (
            <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Groups ({groups.length})
              </h3>
              <div>
                {groups.slice(0, 5).map((m) => (
                  <Link
                    key={m.group!.id}
                    href={`/groups/${m.group!.id}`}
                    className="flex items-center border-t border-border py-2 text-[13.5px] font-semibold text-foreground first:border-t-0 transition-colors duration-150 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0 truncate">{m.group!.name}</span>
                    <span className="ml-auto pl-2 text-[12px] font-semibold text-sky">
                      {m.group!._count.members}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isOwnProfile && (
            <div className="px-1">
              <FlagPersonDialog userId={user.id} name={user.name} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
