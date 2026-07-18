"use client";

/* ------------------------------------------------------------------ *
 *  ProfileHeaderCard - the contact card, Letterhead's "everything in
 *  one place" business card grown into Dossier's aesthetic (rebuilt
 *  2026-07 from the approved profile-v2 concept). Composition:
 *
 *    - name + leaf, then "Batch of '23 . occupation" (no at-RV clutter,
 *      no cities up top - those live quiet, below the About).
 *    - email + phone as the two prioritised contacts, tidy pills.
 *    - the cinnamon admission stamp COMPOSED into the card's right
 *      props column beside the avatar (not floating in a corner).
 *    - Get in touch + Save contact (Edit profile on your own page).
 *    - a tasteful treated valley band up top for colour; the avatar sits
 *      fully below it, never straddling.
 *    - the houses chain lives as a quiet strip at the bottom of the card
 *      (Dossier's coloured boxes + arrows, wraps for up to ~10 stints),
 *      with a gentle add-your-houses prompt on your own empty profile.
 *
 *  Identity text is DOM-first but ordered visually AFTER the props
 *  column on sm+ (sm:order-*), so the name always starts flush at the
 *  card's left padding edge - the same edge every zone below shares -
 *  rather than being pushed right by the avatar. That is Dossier's
 *  alignment fix, kept verbatim.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, Phone, Leaf, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { HousesChain } from "@/components/profile/houses-chain";
import { Button } from "@/components/ui/button";
import { HEADER_PAPER_TEXTURE } from "@/lib/header-image";
import { parseHouseSpans } from "@/lib/house-spans";

interface HeaderUser {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  verifyState: string;
  accountType: string;
}

/* A prominent contact pill: canopy icon, warm fill, transform-only motion. */
function ContactPill({
  href,
  icon: Icon,
  children,
  className,
}: {
  href: string;
  icon: typeof Mail;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex min-w-0 items-center gap-2.5 rounded-[var(--radius-input)] border border-border bg-mist/70 px-3.5 py-2.5 text-[13.5px] font-semibold text-foreground",
        "transition-transform duration-150 hover:-translate-y-0.5 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.985]",
        className
      )}
    >
      <Icon className="h-[16px] w-[16px] shrink-0 text-canopy" aria-hidden />
      <span className="truncate">{children}</span>
    </a>
  );
}

/* The avatar as a lightly-mounted photograph: a cream index card tilted a
   hair, straightening when you reach for it. Holds the interactive bird
   (ProfileAvatar keeps click-the-bird + the species reveal on hover/tap). */
function PhotoMount({ user }: { user: HeaderUser }) {
  return (
    <motion.div
      className="relative"
      initial={{ rotate: -2.2 }}
      whileHover={{ rotate: 0, scale: 1.03 }}
      transition={SPRINGS.snappy}
    >
      <div
        className="rounded-[var(--radius-md)] border border-border bg-[#FBF8EF] p-[var(--space-s)]"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.06), 0 16px 32px -24px rgba(35,36,30,0.5)" }}
      >
        <ProfileAvatar
          user={{
            id: user.id,
            name: user.name,
            photoUrl: user.photoUrl,
            avatarColor: null,
            birdOverride: user.birdOverride,
          }}
          size="lg"
          ring
          priority
        />
      </div>
    </motion.div>
  );
}

export function ProfileHeaderCard({
  user,
  headerImage,
  batchLabel,
  occupation,
  email,
  phone,
  admissionNumber,
  isOwnProfile,
  contactMethods,
  vcard,
  housesRaw,
}: {
  user: HeaderUser;
  headerImage: string | null;
  batchLabel: string;
  occupation: string | null;
  email: string;
  phone: string | null;
  admissionNumber: number | null;
  isOwnProfile: boolean;
  contactMethods: ContactMethod[];
  vcard: string;
  housesRaw: string | null;
}) {
  const metaLine = [batchLabel, occupation].filter(Boolean).join(" · ");
  const houseSpans = parseHouseSpans(housesRaw);

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card"
      style={{ boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)" }}
    >
      {/* Treated valley band: a warm, aged strip - colour + life without
          reading as a glossy cover photo. Desaturated toward sepia, washed with
          cinnamon, and faded into the card so the content below reads on clean
          paper. The avatar only kisses its lower edge, never straddles it. */}
      <div className="relative h-20 w-full overflow-hidden sm:h-24" aria-hidden>
        {headerImage ? (
          <Image
            src={headerImage}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 1120px"
            className="object-cover"
            style={{ filter: "saturate(0.72) sepia(0.16) brightness(0.99)" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--color-mist)", backgroundImage: HEADER_PAPER_TEXTURE }}
          />
        )}
        {/* warm sepia veil + cinnamon glow top-right, so it unifies with paper */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(120,86,50,0.20), rgba(35,45,30,0.12))" }}
        />
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{ background: "radial-gradient(130% 150% at 86% -30%, rgba(194,98,47,0.30), transparent 62%)" }}
        />
        {/* fade the band into the card at its lower edge */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, var(--card) 3%, color-mix(in srgb, var(--card) 45%, transparent) 42%, transparent 88%)" }}
        />
      </div>

      <div className="relative px-[var(--space-l)] pb-[var(--space-l)] pt-[var(--space-m)] sm:px-[var(--space-xl)] sm:pb-[var(--space-xl)]">
        <div className="flex flex-col gap-[var(--space-l)] sm:flex-row sm:gap-[var(--space-xl)]">
          {/* PROPS column: avatar mount + stamp. DOM-first (so mobile stacks it
              on top), visually pushed right on sm+. */}
          <div className="-mt-8 flex shrink-0 flex-col items-start gap-[var(--space-m)] sm:-mt-9 sm:order-2 sm:items-end">
            <PhotoMount user={user} />
            {admissionNumber != null && (
              <AdmissionStamp number={admissionNumber} className="hidden sm:block" />
            )}
          </div>

          {/* IDENTITY + contacts. Flush to the card's left padding edge. */}
          <div className="min-w-0 flex-1 sm:order-1 sm:pt-[var(--space-m)]">
            <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-heading text-[28px] font-bold leading-[1.03] tracking-[-0.02em] text-foreground sm:text-[34px]">
              <span className="min-w-0">{user.name}</span>
              {user.verifyState === "verified" ? (
                <VerifiedMark
                  user={{ verifyState: user.verifyState, accountType: user.accountType }}
                  size={19}
                />
              ) : (
                <Leaf className="h-[18px] w-[18px] shrink-0 text-leaf/55" aria-hidden />
              )}
            </h1>

            {metaLine && (
              <p className="mt-[var(--space-xs)] text-[14.5px] leading-snug text-muted-foreground">
                {metaLine}
              </p>
            )}

            {/* the two prioritised contacts */}
            <div className="mt-[var(--space-m)] flex flex-wrap gap-2.5">
              <ContactPill href={`mailto:${email}`} icon={Mail} className="max-w-full sm:max-w-[22rem]">
                {email}
              </ContactPill>
              {phone && (
                <ContactPill href={`tel:${phone}`} icon={Phone}>
                  {phone}
                </ContactPill>
              )}
            </div>

            {/* mobile stamp: inline under the identity, so it never fights the
                stacked header for width */}
            {admissionNumber != null && (
              <AdmissionStamp number={admissionNumber} className="mt-[var(--space-m)] inline-block sm:hidden" />
            )}

            {/* actions */}
            <div className="mt-[var(--space-l)]">
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
        </div>

        {/* HOUSES strip: the owner's favourite element, quiet under the card. */}
        {houseSpans.length > 0 ? (
          <div className="mt-[var(--space-l)] border-t border-dashed border-border pt-[var(--space-l)]">
            <p className="mb-[var(--space-s)] text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">
              Houses through the years
            </p>
            <HousesChain houses={housesRaw} />
          </div>
        ) : isOwnProfile ? (
          <div className="mt-[var(--space-l)] border-t border-dashed border-border pt-[var(--space-l)]">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Add the houses you were in over the years in{" "}
              <Link href="/settings" className="font-semibold text-leaf hover:underline">
                your settings
              </Link>{" "}
              to see your chain here.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
