import Image from "next/image";
import Link from "next/link";
import { Leaf, Mail, Phone, Pencil } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { Button } from "@/components/ui/button";
import { HEADER_PAPER_TEXTURE } from "@/lib/header-image";

/**
 * The profile header - a business card, not a banner-plus-white-card. Identity
 * (name + leaf + verified), the contact-card facts (batch . occupation, cities),
 * the two key contacts (email + phone), the admission stamp, and the actions all
 * live in one block over a colour/image band so the page reads as alive.
 */

interface HeaderAvatarUser {
  id: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  avatarSpecies?: number | null;
  birdOverride?: string | null;
  verifyState: string;
  accountType: string;
}

export function ProfileHeaderCard({
  user,
  headerImage,
  batchLabel,
  occupation,
  cities,
  email,
  phone,
  admissionNumber,
  isOwnProfile,
  contactMethods,
  vcard,
}: {
  user: HeaderAvatarUser;
  headerImage: string | null;
  batchLabel: string;
  occupation: string | null;
  cities: string[];
  email: string;
  phone: string | null;
  admissionNumber: number | null;
  isOwnProfile: boolean;
  contactMethods: ContactMethod[];
  vcard: string;
}) {
  // Batch and occupation share one dot-joined line (no dangling separators);
  // cities get their own line so a long city list never crowds the batch.
  const factLine = [batchLabel, occupation].filter(Boolean).join(" · ");

  return (
    <section className="card-elevated relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">
      {/* Colour / image band */}
      <div className="relative h-32 w-full sm:h-40 md:h-44">
        {headerImage ? (
          <>
            <Image
              src={headerImage}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 1120px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--color-mist)", backgroundImage: HEADER_PAPER_TEXTURE }}
          />
        )}
      </div>

      {/* Content: business-card block */}
      <div className="relative px-5 pb-6 sm:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          {/* Avatar overlaps the band */}
          <div className="relative z-[2] -mt-12 shrink-0 sm:-mt-14">
            <ProfileAvatar
              user={{
                id: user.id,
                name: user.name,
                avatarColor: user.avatarColor,
                photoUrl: user.photoUrl,
                avatarSpecies: user.avatarSpecies ?? null,
                birdOverride: user.birdOverride ?? null,
              }}
              size="lg"
              ring
              priority
            />
          </div>

          {/* Identity + facts */}
          <div className="min-w-0 flex-1 md:pt-4">
            {/* Leaf sits right after the name (owner-liked, from Letterhead).
                The verified mark IS a leaf, so we render exactly one: the
                verified leaf when verified, else a quiet decorative brand leaf. */}
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-heading text-[26px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[30px]">
              <span className="min-w-0">{user.name}</span>
              {user.verifyState === "verified" ? (
                <VerifiedMark
                  user={{ verifyState: user.verifyState, accountType: user.accountType }}
                  size={17}
                />
              ) : (
                <Leaf className="h-[17px] w-[17px] shrink-0 text-leaf/60" aria-hidden />
              )}
            </h1>

            {factLine && (
              <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">{factLine}</p>
            )}
            {cities.length > 0 && (
              <p className="mt-0.5 text-[13.5px] leading-snug text-muted-foreground">
                {cities.join(" · ")}
              </p>
            )}

            {/* Mobile stamp: inline, smaller, under the identity block */}
            {admissionNumber != null && (
              <AdmissionStamp number={admissionNumber} className="mt-3.5 inline-block md:hidden" />
            )}

            {/* Key contacts */}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${email}`}
                className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-mist/60 px-3.5 py-2 text-[13px] font-semibold text-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.98]"
              >
                <Mail className="h-[15px] w-[15px] shrink-0 text-canopy" aria-hidden />
                <span className="truncate">{email}</span>
              </a>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-mist/60 px-3.5 py-2 text-[13px] font-semibold text-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.98]"
                >
                  <Phone className="h-[15px] w-[15px] shrink-0 text-canopy" aria-hidden />
                  <span>{phone}</span>
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4">
              {isOwnProfile ? (
                <Link href="/settings">
                  <Button size="sm" className="rounded-full">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                </Link>
              ) : (
                <GetInTouch name={user.name} methods={contactMethods} vcard={vcard} />
              )}
            </div>
          </div>

          {/* Desktop stamp: pinned top-right, uses the width */}
          {admissionNumber != null && (
            <div className="hidden shrink-0 md:block md:pt-4">
              <AdmissionStamp number={admissionNumber} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
