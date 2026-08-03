"use client";

/* ------------------------------------------------------------------ *
 *  The profile, as a piece of the member's own stationery.
 *
 *  Shipped 2026-07-30 from the Letterhead II concept (still browsable at
 *  /lab/profiles), replacing the Dossier-derived header + folder-tab
 *  shell. The concept file is the design record; this is the same layout
 *  against real `User` data. Keep them in step, or retire the concept.
 *
 *  THE RULES THIS LAYOUT KEEPS, and why (the owner's review, 2026-07-30):
 *
 *  - The sheet's padding is EQUAL on all four sides, so the name's
 *    distance from the top is its distance from the left.
 *  - The colophon is the mark plus a bare admission number, and the name
 *    sits exactly 8px under it. The verified leaf sits on the name's
 *    BASELINE, not above its shoulder.
 *  - One action, in line with the name: Edit profile on your own page,
 *    Get in touch on anyone else's, both at the app's default 40px
 *    button height and vertically centred on the name's line box by
 *    calc rather than by eye.
 *  - Three facts, no sub-lines: batch, the valley years, and every city
 *    as one equal comma series. No primary/secondary city.
 *  - The bird perches on the sheet's top-right edge and does not move.
 *    Upload a photo and the perch is replaced by a circle on the sheet's
 *    LEFT edge whose diameter runs from the top of the mark to the
 *    bottom of the name, measured off the DOM so it holds when a long
 *    name wraps.
 *  - The one engraved rule gets equal air above and below and is drawn
 *    only when it has a body under it to separate. A sparse profile ends
 *    after the facts, so absence never reads as a gap someone forgot to
 *    fill.
 *  - The writing below is the feed's own PostCard standing free on the
 *    page. Nothing wraps it: a bordered card inside a bordered sheet is
 *    the box-in-a-box the design system rules out.
 *
 *  Vertical rhythm is four golden-ratio steps and nothing between them:
 *      8px   colophon -> name        (one lockup)
 *      6px   name -> occupation      (title/subtitle)
 *     10px   section label -> body   (label owns its body)
 *     26px   block -> block          (peer sections)
 *     42px   sheet -> the writing    (different objects)
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { Button } from "@/components/ui/button";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { HouseTrail } from "@/components/profile/houses-chain";
import { ProfileAuthorFeed } from "@/components/profile/profile-author-feed";
import { SavedPostsFeed } from "@/components/profile/saved-posts-feed";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SPRINGS, EASE_OUT_SMOOTH, FadeRise } from "@/components/common/motion";
import { SegmentedPills } from "@/components/common/segmented-pills";
import type { HouseSpan } from "@/lib/house-spans";

/* A faint grain so the sheet reads as paper, not a flat fill. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/**
 * The identity lockup's geometry, declared once and then derived from. The
 * photo circle and the action pill both have to agree with the name's type,
 * so both are calc()ed off these instead of carrying magic numbers.
 */
const IDENTITY_VARS = {
  "--lh-colophon": "1rem", // the colophon row's fixed height: 16px
  "--lh-gap": "0.5rem", // colophon -> name: 8px
  "--lh-name": "clamp(1.9rem, 7vw, 2.6rem)",
  "--lh-head": "calc(var(--lh-colophon) + var(--lh-gap) + var(--lh-name) * 1.05)",
  // Centre a 40px (h-10) pill on the name's first line.
  "--lh-cta-top":
    "calc(var(--lh-colophon) + var(--lh-gap) + (var(--lh-name) * 1.05 - 2.5rem) / 2)",
} as CSSProperties;

type TabKey = "all" | "posts" | "letters" | "photos" | "saved";

export interface LetterheadProfileUser {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  verifyState: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
}

export function LetterheadProfile({
  user,
  firstName,
  isOwnProfile,
  occupation,
  admissionNumber,
  about,
  cities,
  rvYears,
  batchLabel,
  houseSpans,
  contactMethods,
  vcard,
  postCount,
  letterCount,
  photoCount,
  savedCount,
  photosNode,
  adminNode,
  flagNode,
}: {
  user: LetterheadProfileUser;
  firstName: string;
  isOwnProfile: boolean;
  occupation: string | null;
  admissionNumber: number | null;
  about: string | null;
  cities: string[];
  rvYears: string | null;
  batchLabel: string | null;
  houseSpans: HouseSpan[];
  contactMethods: ContactMethod[];
  vcard: string;
  postCount: number;
  letterCount: number;
  photoCount: number;
  savedCount: number;
  photosNode: ReactNode;
  adminNode: ReactNode;
  flagNode: ReactNode;
}) {
  const hasPhoto = Boolean(user.photoUrl);
  const aboutText = about?.trim() ?? "";

  /* Three facts, no sub-lines, in the owner's order. */
  const facts: { label: string; value: string; wide?: boolean }[] = [];
  if (batchLabel) facts.push({ label: "Batch", value: batchLabel });
  if (rvYears) facts.push({ label: "In the valley", value: rvYears });
  if (cities.length > 0) {
    facts.push({
      label: cities.length > 1 ? "Cities" : "City",
      // Wide on the 2-column phone grid: a comma series is the one fact that
      // can run long, and truncating someone's third city to fit a column is
      // the ranking this design exists to remove.
      wide: true,
      value: cities.join(", "),
    });
  }

  /* About shows for a stranger only when there is something to read. On your
     own profile the empty state is a prompt, which is worth the space. */
  const showAbout = Boolean(aboutText) || isOwnProfile;
  const hasBody = showAbout || houseSpans.length > 0;

  /* The stamp: pressed on demand, held a moment, faded away. */
  const [stamp, setStamp] = useState(0);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function fireStamp() {
    setStamp((k) => k + 1);
    if (stampTimer.current) clearTimeout(stampTimer.current);
    stampTimer.current = setTimeout(() => setStamp(0), 1700);
  }
  useEffect(
    () => () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    },
    []
  );

  /* The photo circle's diameter is "the top of the mark to the bottom of the
     name", taken from the DOM rather than assumed. The calc above is the
     first-paint value and is exact for a one-line name; this keeps the promise
     when a long name wraps. The loop settles because a wider circle can only
     push the name to MORE lines, never back to fewer. */
  const lockupRef = useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState<number | null>(null);
  useEffect(() => {
    const el = lockupRef.current;
    if (!hasPhoto || !el) return;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      setDiameter((prev) => (prev !== null && Math.abs(prev - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);
  const circle = diameter ? `${diameter}px` : "var(--lh-head)";

  /* The page's one action. On your own profile that is Edit profile, at the
     same 40px height and canopy fill as every other primary CTA in the app
     (the old header set it at "sm", which read as a secondary control on the
     page it belongs to). Matches the app's Button-inside-Link pattern. */
  const action = isOwnProfile ? (
    <Link href="/settings" className="inline-flex rounded-full focus-visible:outline-none">
      <Button className="rounded-full">
        <Pencil className="h-4 w-4" />
        Edit profile
      </Button>
    </Link>
  ) : contactMethods.length > 0 ? (
    <GetInTouch name={user.name} methods={contactMethods} vcard={vcard} showSave={false} size="default" />
  ) : null;

  return (
    /* Perch clearance. The bird hangs 48px above the sheet's top edge, and the
       shell's own gutter is 40px (desktop) / 20px (mobile), so without this the
       bird's head is cut off by the top of the scroll area and, on a phone,
       painted over the sticky header. Measured, not guessed: 8px short on
       desktop and 10px on mobile before this. */
    <div className="pt-4">
      {/* Not clipped, so the perched bird can overlap the sheet's own edge. */}
      <div className="relative" style={IDENTITY_VARS}>
        {!hasPhoto && <PerchedBird user={user} />}

        <div
          className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
          style={{
            boxShadow:
              "0 1px 2px rgba(35,36,30,0.05), 0 24px 48px -32px rgba(35,36,30,0.55), 0 46px 96px -55px color-mix(in srgb, var(--color-cinnamon) 26%, transparent)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{ backgroundImage: `url("${PAPER_GRAIN}")` }}
          />
          <div
            className="pointer-events-none absolute -top-16 right-14 h-56 w-56 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-canopy) 14%, transparent), transparent 70%)",
            }}
          />

          <AnimatePresence>
            {stamp > 0 && admissionNumber && (
              <motion.div
                key={stamp}
                exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeOut" } }}
                className="pointer-events-none absolute left-1/2 top-[44px] z-20 -translate-x-1/2"
              >
                <AdmissionStamp number={admissionNumber} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative p-6 sm:p-10">
            <FadeRise>
              <header>
                <div className="flex items-start gap-[var(--space-m)]">
                  {hasPhoto && (
                    <span
                      className="relative block shrink-0 overflow-hidden rounded-full border border-border/60 bg-mist"
                      style={{ width: circle, height: circle }}
                      role="img"
                      aria-label={user.name}
                    >
                      {/* The one photograph the page is about, so it is the one
                          image here allowed to be `priority`: it is the LCP
                          candidate on a profile and it must not arrive after
                          the name beside it (owner, 2026-08-03). It was a raw
                          <img> pointed at the R2 original, which is stored at
                          up to 1920px.
                          `fill` rather than width/height because `circle` is a
                          CSS length, not a number: it is either a measured px
                          string or `var(--lh-head)` before the ResizeObserver
                          reports (see the lockup comment above), and neither
                          form is something next/image can size from. The
                          parent already carries the exact box, so filling it is
                          the honest fit; it gains `relative` for that.
                          sizes 128px covers the real range, roughly 68px for a
                          one-line name up to ~115px when a long one wraps, and
                          still lets Next serve the 256 bucket to a 2x screen
                          rather than the full original. */}
                      <Image
                        src={user.photoUrl ?? ""}
                        alt=""
                        fill
                        sizes="128px"
                        priority
                        className="object-cover"
                      />
                    </span>
                  )}

                  {/* The lockup, and only the lockup: mark, number, name. The
                      occupation is deliberately outside it, so the measured
                      circle answers "top of the mark to the bottom of the
                      name" and not a line more. */}
                  <div ref={lockupRef} className="min-w-0 flex-1">
                    {/* A block-level row, not inline-flex: an inline box would
                        add its line's leading under the mark and quietly turn
                        the 8px step into 14.5px. */}
                    {admissionNumber ? (
                      <button
                        type="button"
                        onClick={fireStamp}
                        aria-label={`Admission number ${admissionNumber}. Press to stamp the sheet.`}
                        className="flex h-[var(--lh-colophon)] w-fit items-center gap-1.5 rounded-sm text-cinnamon transition-opacity duration-150 hover:opacity-75 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <PeaksMark size={15} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                          {admissionNumber}
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-[var(--lh-colophon)] w-fit items-center text-cinnamon"
                      >
                        <PeaksMark size={15} />
                      </span>
                    )}

                    {/* The leaf rides inline after the last word so a wrapping
                        name never strands it on a line of its own, and sits on
                        the baseline. */}
                    <h1
                      className="mt-[var(--lh-gap)] font-heading font-bold tracking-[-0.03em] text-foreground"
                      style={{ fontSize: "var(--lh-name)", lineHeight: 1.05 }}
                    >
                      {user.name}
                      <span className="ml-2.5 inline-flex align-baseline">
                        <VerifiedMark user={user} size={16} />
                      </span>
                    </h1>
                  </div>

                  {/* Held back on phones, where a 40px pill beside a 30px
                      display name would squeeze the name's own column. */}
                  {action && (
                    <div className="hidden shrink-0 sm:block" style={{ marginTop: "var(--lh-cta-top)" }}>
                      {action}
                    </div>
                  )}
                </div>

                {occupation && (
                  <p className="mt-[var(--space-xs)] text-[15px] leading-[1.6] text-muted-foreground">
                    {occupation}
                  </p>
                )}

                {action && <div className="mt-[var(--space-m)] sm:hidden">{action}</div>}
              </header>

              {facts.length > 0 && (
                <dl className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] sm:grid-cols-3">
                  {facts.map((f) => (
                    <div key={f.label} className={f.wide ? "col-span-2 sm:col-span-1" : "min-w-0"}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                        {f.label}
                      </dt>
                      <dd className="mt-[var(--space-xs)] text-[17px] font-semibold leading-[1.35] text-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Equal air above and below, and only when it has two things to
                  sit between. A divider that divides nothing is just a line. */}
              {hasBody && (
                <div
                  aria-hidden
                  className="mt-[var(--space-l)] h-[3px] w-full rounded-full"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.14), inset 0 -1px 0 rgba(255,255,255,0.55)",
                  }}
                />
              )}
            </FadeRise>

            {showAbout && (
              <FadeRise delay={0.06}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>About</SectionLabel>
                  {aboutText ? (
                    <p className="mt-[var(--space-s)] whitespace-pre-wrap text-[17px] leading-[1.7] text-foreground">
                      {aboutText}
                    </p>
                  ) : (
                    <p className="mt-[var(--space-s)] text-[15px] leading-[1.7] text-muted-foreground">
                      You haven&rsquo;t written an About yet.{" "}
                      <Link href="/settings" className="rounded-sm font-semibold text-leaf hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        Add a few lines
                      </Link>{" "}
                      so people know who you are now.
                    </p>
                  )}
                </section>
              </FadeRise>
            )}

            {houseSpans.length > 0 && (
              <FadeRise delay={0.09}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>Houses</SectionLabel>
                  <div className="mt-[var(--space-s)]">
                    <HouseTrail spans={houseSpans} />
                  </div>
                </section>
              </FadeRise>
            )}
          </div>
        </div>
      </div>

      <Writing
        authorId={user.id}
        firstName={firstName}
        isOwnProfile={isOwnProfile}
        postCount={postCount}
        letterCount={letterCount}
        photoCount={photoCount}
        savedCount={savedCount}
        photosNode={photosNode}
      />

      {(adminNode || flagNode) && (
        <div className="mt-[var(--space-xl)] space-y-[var(--space-m)]">
          {adminNode}
          {flagNode}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">{children}</p>;
}

/* ------------------------------------------------------------------ *
 *  The bird, perched on the sheet's own top edge so it costs the
 *  masthead no vertical space. It does not bob (owner: "don't keep
 *  moving the bird") and carries no species label. Pressing it chirps,
 *  because that only happens when someone asks for it.
 * ------------------------------------------------------------------ */
function PerchedBird({ user }: { user: LetterheadProfileUser }) {
  const [chirp, setChirp] = useState(0);

  return (
    /* Scaled from its FEET on phones, so the perch line stays put at both
       sizes and only one offset has to be right. */
    <div className="absolute -top-12 right-6 z-20 origin-bottom scale-[0.8] sm:right-10 sm:scale-100">
      <button
        type="button"
        onClick={() => setChirp((c) => c + 1)}
        aria-label={`${user.name}'s bird. Tap for a chirp.`}
        className="relative block rounded-full outline-none transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <motion.span
          key={chirp}
          initial={chirp > 0 ? { scale: 1.1, rotate: -6 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={SPRINGS.snappy}
          className="block"
        >
          <BirdAvatar user={user} size={80} />
        </motion.span>

        {chirp > 0 && (
          <span
            key={`arcs-${chirp}`}
            aria-hidden
            className="pointer-events-none absolute right-[-2px] top-[22px]"
          >
            {[0, 1, 2].map((n) => {
              const s = 13 + n * 9;
              return (
                <motion.span
                  key={n}
                  initial={{ opacity: 0.9, scale: 0.35, rotate: -45 }}
                  animate={{ opacity: 0, scale: 1.2, rotate: -45 }}
                  transition={{ duration: 0.55, delay: n * 0.07, ease: EASE_OUT_SMOOTH }}
                  className="absolute block rounded-full border-r-2 border-cinnamon"
                  style={{ width: s, height: s, left: 0, top: -s / 2 }}
                />
              );
            })}
          </span>
        )}
      </button>

      {/* A soft contact shadow on the paper: what makes it read as perched on
          the edge rather than pasted over it. */}
      <span
        aria-hidden
        className="mx-auto -mt-1 block h-2 w-11 rounded-full"
        style={{ background: "var(--color-ink)", opacity: 0.14, filter: "blur(3px)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  What they have written.
 *
 *  The switcher is the app's own segmented pill (the same control as the
 *  Catch-ups cadence switcher) with one canopy fill gliding between
 *  segments on a shared layoutId. Underline tabs read as a hint rather
 *  than a control, and folder tabs need a folder, which would put the
 *  post tiles back in a box.
 *
 *  Four segments either way: Photos is other-people-only (a stranger's
 *  pictures are worth browsing as a set), Saved is yours-only (nobody
 *  else's business), so the control never grows past what fits a 390px
 *  phone and never needs to become a scroll container. That matters
 *  beyond tidiness: a horizontally scrollable strip swallows the wheel,
 *  and parking the pointer on it stops the page dead.
 * ------------------------------------------------------------------ */
function Writing({
  authorId,
  firstName,
  isOwnProfile,
  postCount,
  letterCount,
  photoCount,
  savedCount,
  photosNode,
}: {
  authorId: string;
  firstName: string;
  isOwnProfile: boolean;
  postCount: number;
  letterCount: number;
  photoCount: number;
  savedCount: number;
  photosNode: ReactNode;
}) {
  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: postCount + letterCount },
    { key: "posts", label: "Posts", count: postCount },
    { key: "letters", label: "Letters", count: letterCount },
    isOwnProfile
      ? { key: "saved" as const, label: "Saved", count: savedCount }
      : { key: "photos" as const, label: "Photos", count: photoCount },
  ];

  const [tab, setTab] = useState<TabKey>("all");

  return (
    <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
      <SegmentedPills
        ariaLabel="Profile sections"
        layoutId="profileWriting"
        segments={TABS}
        value={tab}
        onChange={setTab}
        className="bg-card"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)" }}
      />

      {/* Nothing wraps the tiles. */}
      <div className="mt-[var(--space-m)]">
        {(tab === "all" || tab === "posts" || tab === "letters") && (
          <ProfileAuthorFeed
            key={tab}
            authorId={authorId}
            firstName={firstName}
            isOwnProfile={isOwnProfile}
            kind={tab === "all" ? undefined : tab === "posts" ? "post" : "letter"}
            layout="cards"
            emptyTitle={
              tab === "letters"
                ? isOwnProfile
                  ? "You haven't written a letter yet."
                  : `No letters yet from ${firstName}.`
                : undefined
            }
          />
        )}

        {tab === "photos" &&
          (photosNode ?? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
              <p className="font-heading text-lg tracking-tight text-foreground">
                No photos yet from {firstName}.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pictures they post to the feed collect here.
              </p>
            </div>
          ))}

        {tab === "saved" && <SavedPostsFeed />}
      </div>
    </div>
  );
}
