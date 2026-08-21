import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { batchLine, formatPhoneDisplay, parseJsonArray } from "@/lib/utils";
import { socialHref, socialDisplay, parseUserLinks } from "@/lib/social";
import { academicSpanLabel, parseHouseSpans, parseHouseYearEntries } from "@/lib/house-spans";
import { AdminProfileTools } from "@/components/profile/admin-profile-tools";
import { FlagPersonDialog } from "@/components/profile/flag-person-dialog";
import { StrayHair } from "@/components/profile/stray-hair";
import { STRAY_HAIR_USER_IDS } from "@/components/profile/stray-hair-ids";
import { LetterheadProfile } from "@/components/profile/letterhead-profile";
import type { ContactMethod } from "@/components/profile/get-in-touch";
import { PUBLISHED_ONLY } from "@/lib/posts";
import { viewerMaySeeContacts } from "@/lib/member-gate";
import { IS_DEMO } from "@/lib/demo";
import { recordView } from "@/lib/content-view";
import { vcardLines, vcardValue } from "@/lib/vcard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // The tab title holds the same Stage 1 line as the page: names are a
  // confirmed-email capability, and a <title> is serialized like anything
  // else. Own profile excepted, same as the page body.
  const session = await auth();
  if (session?.user && session.user.id !== id && !session.user.emailConfirmed && !IS_DEMO) {
    return { title: "Profile" };
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, isBlocked: true, deletionRequestedAt: true },
  });
  /* deletionRequestedAt as well as isBlocked, which the page body has always
     checked and this did not (audit Low 93): a <title> is serialized like any
     other content, so the tab was still carrying the name of an account that
     had asked to disappear, on a page that answers 404 for it. */
  if (!user || user.isBlocked || user.deletionRequestedAt) return { title: "Profile" };
  return { title: user.name };
}

/**
 * "2014-2023" / partial fragments; never "undefined".
 *
 * No year count. It used to read "2014-2023 · 9 years"; the owner cut the
 * count: "if we don't need nine years, everyone can freaking calculate a
 * number of years." The range already carries it.
 */
function rvYearsLabel(yearJoined: number | null, yearLeft: number | null): string | null {
  if (yearJoined && yearLeft) return `${yearJoined}–${yearLeft}`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

/**
 * A teacher's years in the valley, from the tenure pair. The one difference
 * from the student label: a current teacher ("teacher", no until-year) reads
 * "2005–present", because for them a missing end is a fact, not a gap. A
 * former teacher missing an end year just gets "From 1990" like anyone else.
 */
function taughtYearsLabel(
  taughtFrom: number | null,
  taughtUntil: number | null,
  accountType: string | null
): string | null {
  if (taughtFrom && !taughtUntil && accountType === "teacher") return `${taughtFrom}–present`;
  return rvYearsLabel(taughtFrom, taughtUntil);
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  /* Someone else's profile is a Stage 1 capability (trust model, audit H21):
     an account that has not even confirmed its address may read the feed, not
     browse the people. Decided BEFORE the row is fetched, so nothing about
     the member -- not their job, not their cities -- is ever serialized for
     this viewer. Your own sheet always renders: withholding a person's own
     details from them protects nobody. The banner the layout already shows
     to every unconfirmed account carries the resend button, so this card
     does not need one. The demo's invented visitor is exempt, as with every
     gate (its Prisma allowlist is what keeps the demo safe). */
  if (session.user.id !== id && !session.user.emailConfirmed && !IS_DEMO) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[var(--radius-lg)] border border-border bg-card px-6 py-10 text-center">
        <h1 className="font-heading text-xl text-foreground">Confirm your email first</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Profiles open the moment you tap the link we sent you.
        </p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { places: { orderBy: { position: "asc" } } },
  });
  // deletionRequestedAt: an account inside its 60-day deletion grace window
  // (audit M35) leaves every people surface at once. The directory, people
  // search and batch roster all hold it out; this page did not, so a member
  // who had asked to disappear was still reachable by direct URL. notFound()
  // (not a 403) so the page never even hints the account exists.
  //
  // An ADMIN is exempt, because the block control lives on this very page: an
  // admin who blocked somebody from their profile could never open that
  // profile again, so the button was one-way and unblocking had to be done
  // from the People list instead (audit Low 98). Members and signed-out
  // visitors still get an unqualified 404.
  const isAdmin = session.user.role === "admin";
  if (!user || (!isAdmin && (user.isBlocked || user.deletionRequestedAt))) notFound();

  /* after(), not the old `void`: see src/app/(main)/collection/[id]/page.tsx
     for why (bug audit Lows 25/35/44/72/77/82/87) -- a bare fire-and-forget
     write races the response Vercel is about to freeze the instance behind.
     recordView drops self-views, so nobody tops their own most-viewed list. */
  after(() => recordView(session.user.id, "profile", user.id));

  const isOwnProfile = session.user.id === user.id;
  const firstName = user.name.split(" ")[0];
  const isTeacher = user.accountType === "teacher" || user.accountType === "ex_teacher";

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
    // A profile only ever shows published work, even to the profile's own
    // owner: an in-progress letter draft belongs on /letters ("Your drafts"),
    // never on the public Posts & Letters tab or the Photos grid.
    ...PUBLISHED_ONLY,
    ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
  };

  // Counts drive the segmented switcher's numbers. The Saved count is the
  // viewer's OWN bookmark total and is only ever read on their own profile,
  // so it is never a window into anyone else's saves.
  const [postCount, letterCount, savedCount] = await Promise.all([
    prisma.post.count({ where: { ...visiblePostsWhere, kind: "post" } }),
    prisma.post.count({ where: { ...visiblePostsWhere, kind: "letter" } }),
    isOwnProfile ? prisma.bookmark.count({ where: { userId: session.user.id } }) : 0,
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
      : ([user.currentCity, user.secondaryCity].filter(Boolean) as string[]);
  const cityLabels =
    user.places.length > 0
      ? user.places.map((p) => p.label)
      : ([user.currentCity, user.secondaryCity].filter(Boolean) as string[]);

  const occupation =
    user.jobTitle && user.workplace
      ? `${user.jobTitle} at ${user.workplace}`
      : user.jobTitle || user.workplace || null;

  /* The address this profile offers, or none.
   *
   * `showEmail` is what says "offer one at all"; `displayEmail` only says WHICH
   * one when the member has chosen a different one from their sign-in address.
   * Before the two were separated, clearing the email row wrote displayEmail =
   * NULL, which this line read as "fall back" and answered by serving the
   * member's PRIVATE LOGIN ADDRESS to every verified alumnus. The X on that row
   * was a privacy control that did the opposite of what it looked like (audit
   * B-050). Null here means the profile shows no email, which is now a thing a
   * member can actually ask for.
   */
  const contactEmail = user.showEmail ? user.displayEmail?.trim() || user.email : null;

  // Every phone on file: the multi-number list, or the legacy single column
  // while `phones` is still null (saves that predate the repeater). Ordered as
  // the member saved them, first number first.
  const parsedPhones = parseJsonArray(user.phones);
  const phoneNumbers = parsedPhones.length > 0 ? parsedPhones : user.phone ? [user.phone] : [];

  // Contact details are the one thing on this page that is a real person's
  // private information rather than their public presence, so they wait on
  // the top tier of the trust model: a VERIFIED viewer (Stage 2; the
  // harvesting half of audit M1). Raised from the email gate on 2026-08-20.
  //
  // Decided HERE, before the list is built, rather than by hiding the button.
  // Everything below is serialized into the page and shipped to the browser,
  // so a phone number withheld in CSS is a phone number sitting in view-source.
  // Your own sheet is always visible: withholding somebody's details from
  // themselves protects nobody and would make the edit form unusable.
  const maySeeContacts = isOwnProfile || (await viewerMaySeeContacts());
  // Which card the locked "Get in touch" pill opens. The Stage 0 return above
  // means a viewer who reaches here with contacts withheld is confirmed but
  // unverified, so the email case is belt and braces.
  const contactsLock = maySeeContacts ? null : session.user.emailConfirmed ? ("member" as const) : ("email" as const);

  // Every way of reaching someone, in ONE place: the Get in touch sheet.
  //
  // Instagram and LinkedIn used to ALSO sit on the surface in a "Find them"
  // block, so the same two links appeared twice on one page. The owner cut the
  // duplicate ("don't think the LinkedIn and IG need to be there outside and
  // inside the Get in touch") and liked the reveal-on-ask pattern enough to
  // want it everywhere, so the surface now shows no contact details at all and
  // this list carries the lot, custom links included.
  const methods: ContactMethod[] = !maySeeContacts ? [] : [
    ...(contactEmail
      ? [
          {
            kind: "email" as const,
            label: "Email",
            value: contactEmail,
            href: `mailto:${contactEmail}`,
          },
        ]
      : []),
    ...phoneNumbers.map((p, i) => ({
      kind: "phone" as const,
      // The first number stays plain "Phone"; later ones are numbered from 2
      // so no two rows in the Get in touch sheet share a label.
      label: i === 0 ? "Phone" : `Phone ${i + 1}`,
      // Display only: the country code gets a space after it so it reads as a
      // code rather than the first digits of the number. The href keeps the
      // raw value, which is what a dialer wants.
      value: formatPhoneDisplay(p),
      href: `tel:${p}`,
    })),
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
    user.facebook
      ? {
          kind: "website" as const,
          label: "Facebook",
          value: socialDisplay("facebook", user.facebook),
          href: socialHref("facebook", user.facebook),
          external: true,
        }
      : null,
    ...parseUserLinks(user.links).map((l) => ({
      kind: "website" as const,
      label: l.label,
      value: socialDisplay("website", l.url),
      href: socialHref("website", l.url),
      external: true,
    })),
  ].filter(Boolean) as ContactMethod[];

  // vCard: the shown email, all cities, houses summarised in the note. Years
  // are academic years (stored `year: 2014` reads as "2014-15"), same span
  // label as the profile's houses chain.
  const houseSpans = parseHouseSpans(user.houses);
  const houseNote =
    houseSpans.length > 0
      ? "; Houses: " +
        houseSpans.map((h) => `${h.house} ${academicSpanLabel(h.fromYear, h.toYear)}`).join(", ")
      : "";
  // The vCard carries the same details in a second format, so it is gated on
  // the same fact. An unconfirmed viewer gets a card with a name and a batch
  // on it and nothing to dial.
  /* Every text value goes through vcardValue, and the lines are joined with
     CRLF (audit Low 97). The NOTE below is the one that made this urgent: it
     is built with commas and a semicolon, which a vCard reads as FIELD
     SEPARATORS, so the house history arrived in an address book as several
     mangled fields rather than one sentence. */
  const vcard = vcardLines([
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardValue(user.name)}`,
    maySeeContacts && contactEmail ? `EMAIL:${vcardValue(contactEmail)}` : null,
    ...(maySeeContacts ? phoneNumbers.map((p) => `TEL:${vcardValue(p)}`) : []),
    occupation ? `TITLE:${vcardValue(occupation)}` : null,
    // The structured ADR field: its own semicolons are the structure, so only
    // the locality between them is escaped.
    ...cityLabels.map((c) => `ADR:;;${vcardValue(c)};;;;`),
    maySeeContacts && user.instagram
      ? `URL:${vcardValue(socialHref("instagram", user.instagram))}`
      : null,
    maySeeContacts && user.linkedin
      ? `URL:${vcardValue(socialHref("linkedin", user.linkedin))}`
      : null,
    `NOTE:${vcardValue(`${batchLine(user)}, Rishi Valley community${houseNote}`)}`,
    "END:VCARD",
  ]);

  // ---- Photos tab content ----
  const photosNode =
    photos.length > 0 ? (
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((ph, i) => (
          <Link
            key={`${ph.postId}-${i}`}
            href={`/feed#${ph.postId}`}
            className="group block overflow-hidden rounded-2xl border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
    <>
    <LetterheadProfile
      user={{
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl,
        birdOverride: user.birdOverride,
        verifyState: user.verifyState,
        accountType: user.accountType,
        batchType: user.batchType,
        batchYear: user.batchYear,
      }}
      firstName={firstName}
      isOwnProfile={isOwnProfile}
      occupation={occupation}
      admissionNumber={user.admissionNumber ?? null}
      about={user.about}
      cities={cities}
      rvYears={
        isTeacher
          ? taughtYearsLabel(user.taughtFrom, user.taughtUntil, user.accountType)
          : rvYearsLabel(user.yearJoined, user.yearLeft)
      }
      batchLabel={user.batchYear ? String(user.batchYear) : null}
      subjects={isTeacher ? user.subjects : null}
      houseSpans={houseSpans}
      contactMethods={methods}
      contactsLock={contactsLock}
      vcard={vcard}
      postCount={postCount}
      letterCount={letterCount}
      photoCount={photos.length}
      savedCount={savedCount}
      photosNode={photosNode}
      adminNode={
        isAdmin && !isOwnProfile ? (
          <AdminProfileTools
            userId={user.id}
            isBlocked={user.isBlocked}
            adminNote={user.adminNote}
            verifyState={user.verifyState}
          />
        ) : null
      }
      flagNode={!isOwnProfile ? <FlagPersonDialog userId={user.id} name={user.name} /> : null}
      /* Only your own sheet gets a pen. `?edit=1` is how /settings hands you
         one: that route redirects here rather than rendering a form of its
         own, so "Settings" in the nav lands on your profile and it opens
         already editable. */
      draft={
        isOwnProfile
          ? {
              startEditing: edit === "1",
              name: user.name,
              about: user.about ?? "",
              jobTitle: user.jobTitle ?? "",
              workplace: user.workplace ?? "",
              batchYear: user.batchYear?.toString() ?? "",
              yearJoined: user.yearJoined?.toString() ?? "",
              yearLeft: user.yearLeft?.toString() ?? "",
              taughtFrom: user.taughtFrom?.toString() ?? "",
              taughtUntil: user.taughtUntil?.toString() ?? "",
              subjects: user.subjects ?? "",
              admissionNumber: user.admissionNumber?.toString() ?? "",
              theme: user.theme ?? null,
              places: user.places.map((p) => ({
                placeId: p.placeId,
                label: p.label,
                city: p.city,
                lat: p.lat,
                lng: p.lng,
              })),
              houses: parseHouseYearEntries(user.houses),
              contacts: {
                displayEmail: user.displayEmail,
                showEmail: user.showEmail,
                email: user.email,
                phones: phoneNumbers,
                instagram: user.instagram,
                linkedin: user.linkedin,
                facebook: user.facebook,
                links: parseUserLinks(user.links),
              },
            }
          : undefined
      }
    />
      {/* A prank, not a feature. Renders only for the ids in
          stray-hair-ids.ts, and only on their own sheet. The gate is here on the
          server so nobody else's bundle ever loads it; the component file explains
          itself and the ids file holds the off switch. */}
      {isOwnProfile && STRAY_HAIR_USER_IDS.includes(user.id) ? <StrayHair /> : null}
    </>
  );
}
