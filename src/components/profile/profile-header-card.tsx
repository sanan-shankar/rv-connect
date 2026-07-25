"use client";

/* ------------------------------------------------------------------ *
 *  ProfileHeaderCard - the contact card, Letterhead's "everything in
 *  one place" business card grown into Dossier's aesthetic (rebuilt
 *  2026-07 from the approved profile-v2 concept). Composition:
 *
 *    - name + leaf, then the occupation and where they work. Batch and
 *      cities live below, in the About record, not up here.
 *    - email + phone are NOT printed here; they live behind Get in touch.
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
import { Leaf, Pencil } from "lucide-react";
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

/* A soft warm wash for the card body, so the ground between the identity block
   and the avatar carries the same aged-paper life as the band rather than
   reading as an empty gap. Two low-opacity brand radials, layered. */
const CARD_WASH = [
  "radial-gradient(720px 460px at 60% 2%, rgba(35,92,73,0.055), transparent 62%)",
  "radial-gradient(620px 420px at 98% 118%, rgba(194,98,47,0.05), transparent 60%)",
].join(", ");

/* The avatar as a lightly-mounted photograph: a cream index card tilted a
   hair, straightening when you reach for it. Holds the interactive bird
   (ProfileAvatar keeps click-the-bird + the species reveal on hover/tap). */
function PhotoMount({ user }: { user: HeaderUser }) {
  return (
    <motion.div
      className="relative"
      initial={{ rotate: -2.2 }}
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
  occupation,
  admissionNumber,
  isOwnProfile,
  contactMethods,
  vcard,
  housesRaw,
}: {
  user: HeaderUser;
  headerImage: string | null;
  occupation: string | null;
  admissionNumber: number | null;
  isOwnProfile: boolean;
  contactMethods: ContactMethod[];
  vcard: string;
  housesRaw: string | null;
}) {
  // The line under the name is the OCCUPATION, nothing else. Batch moved down
  // into the About record (owner: "let the subtitle to the name be the
  // occupation and organisation... batch doesn't have to be that close to the
  // name, it can be elsewhere"), and the city was never important enough to
  // sit here at all.
  const metaLine = occupation;
  const houseSpans = parseHouseSpans(housesRaw);

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card"
      style={{ boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)" }}
    >
      {/* Treated valley band: a warm, aged strip - colour + life without
          reading as a glossy cover photo. Desaturated toward sepia and washed
          with cinnamon, ending on a CLEAN EDGE (it used to dissolve into the
          card, which the owner rejected). The avatar only kisses its lower
          edge, never straddles it. */}
      <div className="relative h-52 w-full overflow-hidden sm:h-72" aria-hidden>
        {headerImage ? (
          <Image
            src={headerImage}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 1120px"
            // Taller band + an art-directed crop. At h-36/h-44 over a 1120px
            // card this was a ~6.4:1 letterbox, and the sources are 3:2
            // (1200x800) or 1:1 (900x900), so `object-cover` showed roughly a
            // fifth of the frame at about 5x: the "insanely zoomed in crop"
            // the owner reported. Taller brings it to ~3.9:1, and pinning the
            // crop to 50% 42% keeps the horizon rather than whatever happened
            // to sit dead centre.
            className="object-cover"
            style={{
              objectPosition: "50% 42%",
              filter: "saturate(0.72) sepia(0.16) brightness(0.99)",
            }}
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
        {/* NO fade into the card. The band used to dissolve into `--card` over
            its lower ~40%, which the owner rejected outright: "fading from the
            picture into white, that is just a definite no-go." The photo now
            ends on a clean edge and the card starts. */}
      </div>

      {/* A faint paper wash under the identity block. The large leaf watermark
          that used to fill this space is GONE (owner: "that random leaf that is
          there, we don't need that. Everyone hated that"). Do not park another
          decorative glyph here to fill the gap: if this region reads empty the
          fix is the layout, not a garnish. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-52 overflow-hidden sm:top-72"
      >
        <div className="absolute inset-0" style={{ backgroundImage: CARD_WASH }} />
      </div>

      <div className="relative z-10 px-[var(--space-l)] pb-[var(--space-l)] pt-[var(--space-m)] sm:px-[var(--space-xl)] sm:pb-[var(--space-xl)]">
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
            <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-heading text-[30px] font-bold leading-[1.02] tracking-[-0.025em] text-foreground sm:text-[40px]">
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
              <p className="mt-[var(--space-xs)] text-[14px] leading-snug text-muted-foreground">
                {metaLine}
              </p>
            )}

            {/* Email and phone are deliberately NOT printed here. They used to
                sit as two pills directly under the name; the owner cut them:
                "I don't want the email and phone number to be right there. It
                doesn't have to be the first thing you see with your name. If
                people want to reach out, it should be there." Both are still
                one click away, inside the Get in touch dialog below, and both
                still ride along in the Save contact vCard. Reachable, just not
                the headline. */}

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
          <div className="mt-[var(--space-l)] border-t border-border pt-[var(--space-l)]">
            <p className="mb-[var(--space-s)] text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">
              Houses through the years
            </p>
            <HousesChain houses={housesRaw} />
          </div>
        ) : isOwnProfile ? (
          <div className="mt-[var(--space-l)] border-t border-border pt-[var(--space-l)]">
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
