import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { batchLine, parseJsonArray } from "@/lib/utils";
import { socialHref, socialDisplay } from "@/lib/social";
import { headerImageFor } from "@/lib/header-image";
import { parseHouseSpans } from "@/lib/house-spans";
import { AdminProfileTools } from "@/components/profile/admin-profile-tools";
import { FlagPersonDialog } from "@/components/profile/flag-person-dialog";
import { ProfileHeaderCard } from "@/components/profile/profile-header-card";
import { HousesChain } from "@/components/profile/houses-chain";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileAbout } from "@/components/profile/profile-about";
import { ProfilePostsAndLetters } from "@/components/profile/profile-posts-and-letters";
import { ProfileRailCards, type ProfileRailData, type RailSocial } from "@/components/profile/profile-rail";
import { SavedPostsFeed } from "@/components/profile/saved-posts-feed";
import type { ContactMethod } from "@/components/profile/get-in-touch";

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

/** "In the valley YYYY to YYYY" / partial fragments; never "undefined". */
function valleyYears(yearJoined: number | null, yearLeft: number | null): string | null {
  if (yearJoined && yearLeft) return `In the valley ${yearJoined} to ${yearLeft}`;
  if (yearJoined) return `In the valley from ${yearJoined}`;
  if (yearLeft) return `In the valley until ${yearLeft}`;
  return null;
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
      places: { orderBy: { position: "asc" } },
      groupMemberships: {
        include: { group: { select: { id: true, name: true, _count: { select: { members: true } } } } },
        orderBy: { joinedAt: "desc" },
      },
    },
  });
  if (!user || user.isBlocked) notFound();

  const isOwnProfile = session.user.id === user.id;
  const isAdmin = session.user.role === "admin";
  const firstName = user.name.split(" ")[0];

  // Same visibility contract as loadPosts()'s authorId path (feed/actions.ts):
  // never surface another member's private-group posts on their public
  // profile, and respect city-scope audience targeting unless the viewer is
  // an admin. Applies to the tab counts and the Photos grid alike, since all
  // three read from the same underlying set of "visible posts by this author".
  const viewerCities = isAdmin ? [] : await getViewerCities(session.user.id);
  const visiblePostsWhere = {
    authorId: user.id,
    isHidden: false,
    groupId: null,
    ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
  };

  // Post / letter counts drive which groups render in the Posts & Letters tab.
  const [postCount, letterCount] = await Promise.all([
    prisma.post.count({ where: { ...visiblePostsWhere, kind: "post" } }),
    prisma.post.count({ where: { ...visiblePostsWhere, kind: "letter" } }),
  ]);

  // Photos: flatten image arrays from this author's visible posts.
  const photoPosts = await prisma.post.findMany({
    where: { ...visiblePostsWhere, NOT: { images: null } },
    select: { id: true, images: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const photos = photoPosts.flatMap((p) =>
    parseJsonArray(p.images).map((src) => ({ src, postId: p.id }))
  );

  // Cities: all UserPlace cities, equal, ordered. Fall back to the legacy
  // columns only while `places` is still empty (migration window).
  const cities =
    user.places.length > 0
      ? user.places.map((p) => p.city)
      : [user.currentCity, user.secondaryCity].filter(Boolean) as string[];
  const cityLabels =
    user.places.length > 0
      ? user.places.map((p) => p.label)
      : [user.currentCity, user.secondaryCity].filter(Boolean) as string[];

  const occupation =
    user.jobTitle && user.workplace
      ? `${user.jobTitle} at ${user.workplace}`
      : user.jobTitle || user.workplace || null;

  const contactEmail = user.displayEmail?.trim() || user.email;
  const headerImage = headerImageFor(user);

  // Socials (Find them) + the Get in touch method list.
  const socials: RailSocial[] = [
    user.instagram ? { kind: "instagram" as const, value: user.instagram } : null,
    user.linkedin ? { kind: "linkedin" as const, value: user.linkedin } : null,
  ].filter(Boolean) as RailSocial[];

  const methods: ContactMethod[] = [
    { kind: "email" as const, label: "Email", value: contactEmail, href: `mailto:${contactEmail}` },
    user.phone
      ? { kind: "phone" as const, label: "Phone", value: user.phone, href: `tel:${user.phone}` }
      : null,
    user.instagram
      ? {
          kind: "instagram" as const,
          label: "Instagram",
          value: socialDisplay("instagram", user.instagram),
          href: socialHref("instagram", user.instagram),
          external: true,
        }
      : null,
    user.linkedin
      ? {
          kind: "linkedin" as const,
          label: "LinkedIn",
          value: socialDisplay("linkedin", user.linkedin),
          href: socialHref("linkedin", user.linkedin),
          external: true,
        }
      : null,
  ].filter(Boolean) as ContactMethod[];

  // vCard: the shown email, all cities, houses summarised in the note.
  const houseSpans = parseHouseSpans(user.houses);
  const houseNote =
    houseSpans.length > 0
      ? "; Houses: " +
        houseSpans
          .map((h) => `${h.house} ${h.fromYear === h.toYear ? h.fromYear : `${h.fromYear}-${h.toYear}`}`)
          .join(", ")
      : "";
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${user.name}`,
    `EMAIL:${contactEmail}`,
    user.phone ? `TEL:${user.phone}` : null,
    occupation ? `TITLE:${occupation}` : null,
    ...cityLabels.map((c) => `ADR:;;${c};;;;`),
    user.instagram ? `URL:${socialHref("instagram", user.instagram)}` : null,
    user.linkedin ? `URL:${socialHref("linkedin", user.linkedin)}` : null,
    `NOTE:${batchLine(user)}, Rishi Valley community${houseNote}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const openToTags = user.openTo
    ? user.openTo.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const railData: ProfileRailData = {
    rvYears: valleyYears(user.yearJoined, user.yearLeft),
    enteredGrade: user.gradeJoined ?? null,
    cities,
    socials,
    groups: user.groupMemberships
      .filter((m) => m.group)
      .map((m) => ({ id: m.group!.id, name: m.group!.name, memberCount: m.group!._count.members })),
    isOwnProfile,
  };

  const railNode = <ProfileRailCards data={railData} />;

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
    <div className="mx-auto max-w-[1160px] space-y-6">
      <ProfileHeaderCard
        user={{
          id: user.id,
          name: user.name,
          photoUrl: user.photoUrl,
          avatarColor: user.avatarColor,
          birdOverride: user.birdOverride,
          verifyState: user.verifyState,
          accountType: user.accountType,
        }}
        headerImage={headerImage}
        batchLabel={batchLine(user)}
        occupation={occupation}
        cities={cities}
        email={contactEmail}
        phone={user.phone}
        admissionNumber={user.admissionNumber ?? null}
        isOwnProfile={isOwnProfile}
        contactMethods={methods}
        vcard={vcard}
      />

      {/* Houses chain: the owner's favourite element, or a gentle nudge on
          your own empty profile. */}
      {houseSpans.length > 0 ? (
        <div className="px-1">
          <HousesChain houses={user.houses} />
        </div>
      ) : isOwnProfile ? (
        <p className="px-1 text-[13px] text-muted-foreground">
          Add the houses you were in over the years in{" "}
          <Link href="/settings" className="font-semibold text-leaf hover:underline">
            your settings
          </Link>{" "}
          to see your chain here.
        </p>
      ) : null}

      {isAdmin && !isOwnProfile && (
        <AdminProfileTools
          userId={user.id}
          isBlocked={user.isBlocked}
          adminNote={user.adminNote}
          verifyState={user.verifyState}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ProfileTabs
          showPhotos={photos.length > 0}
          showSaved={isOwnProfile}
          about={
            <ProfileAbout
              about={user.about}
              openToTags={openToTags}
              firstName={firstName}
              isOwnProfile={isOwnProfile}
              mobileRail={railNode}
            />
          }
          postsAndLetters={
            <ProfilePostsAndLetters
              authorId={user.id}
              firstName={firstName}
              isOwnProfile={isOwnProfile}
              letterCount={letterCount}
              postCount={postCount}
            />
          }
          photos={photosNode}
          saved={isOwnProfile ? <SavedPostsFeed /> : null}
        />

        {/* Persistent desktop rail (always visible across tabs). */}
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          {railNode}
          {!isOwnProfile && (
            <div className="mt-4 px-1">
              <FlagPersonDialog userId={user.id} name={user.name} />
            </div>
          )}
        </aside>
      </div>

      {/* Flag control on mobile (desktop lives in the rail). */}
      {!isOwnProfile && (
        <div className="px-1 lg:hidden">
          <FlagPersonDialog userId={user.id} name={user.name} />
        </div>
      )}
    </div>
  );
}
