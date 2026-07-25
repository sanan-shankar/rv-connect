"use client";

/* ------------------------------------------------------------------ *
 *  Concept C: Terrace
 *
 *  The warm, alive one. The colour comes from the SURFACE, not from a
 *  blown-up photograph: the identity band is a layered field of
 *  low-opacity canopy / sky / cinnamon radials with a fine SVG grain
 *  over them. That field, the tilted square photo plate sitting on it,
 *  and the asymmetric body underneath are the whole concept.
 *
 *  The page sits INSIDE the real app frame (flush green sidebar, faint
 *  valley back-layer, a <main> capped at 1280 with its own gutters), so
 *  nothing here paints its own page background, sets its own max width,
 *  or bleeds past the shell's gutters. The band is a card in that
 *  column, not a full-bleed header.
 *
 *  Composition:
 *    - Desktop: plate on the left, name and facts to its right, the
 *      admission stamp anchored at the far right of the band. The plate
 *      hangs a little past the band's bottom edge like a photo left on a
 *      terrace table. Under it, an asymmetric [minmax(0,1fr)_320px]
 *      body: folder tabs on the left, a sticky rail on the right.
 *    - Mobile: one column, plate first, then name, facts, actions,
 *      tabs, rail. Nothing floats, nothing straddles.
 *
 *  Houses are a QUIET STRIP, not a headline. Owner, round 3: "house is
 *  just a fun thing, it's not that important, you're making it 50% of
 *  the profile." So the trail is one more entry in the About tab's facts
 *  grid, under the same small label every other fact gets: no heading,
 *  no subtitle, no band of its own. The pills themselves are the shipped
 *  <HouseTrail>, drawn in exactly one place.
 *
 *  Type ladder, one rung per job, nothing in between:
 *    name        font-heading 30 / 40 / 46
 *    letter title font-heading 20
 *    body + prose 15 / 1.7, sans (never the serif: a different typeface
 *                 a size up read as a mistake, not as emphasis)
 *    small        13.5
 *    secondary    12.5
 *    labels       10.5 uppercase
 *  font-heading is the person's name and letter titles. Nothing else.
 *
 *  The bird's species is never painted. It is one click away on the
 *  avatar (and in its aria-label), which is where the owner wants it.
 *
 *  Other owner rules honoured verbatim: About is the first and default
 *  tab; hover never moves anything (colour only, presses may sink);
 *  email and phone live behind "Get in touch" and are never printed by
 *  the name; the valley years read "2014-2021" with no year count; solid
 *  hairlines only; nothing on the page captures the page scroll.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Feather, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { HousesTrail } from "./_houses-trail";
import {
  metaParts,
  readMinutes,
  type MockPost,
  type MockProfile,
  type ProfileVariantProps,
} from "./_data";

/* ------------------------------------------------------------------ *
 *  The field. Built once at module scope: it is a static texture, not
 *  per-render work. Four brand radials plus a fine grain, so the band
 *  reads as warm afternoon light on a wall rather than a flat token
 *  colour. This is where the concept's colour lives, which is exactly
 *  why the photograph does not have to be huge.
 *
 *  It is scoped to the band. The page behind it belongs to the app
 *  shell (background + faint valley photo), and a concept that repaints
 *  that is fighting the frame it will actually ship inside.
 * ------------------------------------------------------------------ */
const GRAIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
  '<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0.13  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.055 0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#g)"/></svg>';

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

const TERRACE_FIELD = [
  "radial-gradient(920px 540px at 4% -16%, rgba(35,92,73,0.22), transparent 62%)",
  "radial-gradient(780px 500px at 84% -12%, rgba(63,124,166,0.18), transparent 60%)",
  "radial-gradient(960px 600px at 64% 122%, rgba(194,98,47,0.17), transparent 64%)",
  "radial-gradient(640px 440px at 22% 124%, rgba(31,138,76,0.13), transparent 60%)",
  GRAIN,
].join(", ");

/* The folder-tab silhouette from the shipped profile shell: the diagonal
   bevel every physical file tab shares. The owner named these tabs as the
   thing that works, so the look is reused as-is. The hover lift is not:
   hover here is a colour change and nothing else. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

const CARD_SHADOW = "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.45)";
const PLATE_SHADOW = "0 2px 4px rgba(30,28,22,0.08), 0 26px 46px -26px rgba(30,28,22,0.55)";

/* ------------------------------------------------------------------ *
 *  Contact details. `_data.ts` deliberately carries no email or phone
 *  (the real page reads them off `User.displayEmail` / `User.phone`), so
 *  they are stood up here purely so the "Get in touch" dialog has
 *  something to show. They are never printed on the surface: one click
 *  away is the whole point of the rule.
 * ------------------------------------------------------------------ */
const MOCK_EMAIL = "sanan.shankar@example.com";
const MOCK_PHONE = "+91 98400 21385";

type TabKey = "about" | "posts" | "letters";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "2014-2021". Never a year count: people can do the subtraction. */
function valleyYears(profile: MockProfile): string | null {
  const { yearJoined, yearLeft } = profile;
  if (yearJoined && yearLeft) return `${yearJoined}-${yearLeft}`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

function batchLabel(profile: MockProfile): string | null {
  const parts = [profile.batchType, profile.batchYear].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function buildContact(profile: MockProfile): { methods: ContactMethod[]; vcard: string } {
  const methods: ContactMethod[] = [
    { kind: "email", label: "Email", value: MOCK_EMAIL, href: `mailto:${MOCK_EMAIL}` },
    { kind: "phone", label: "Phone", value: MOCK_PHONE, href: `tel:${MOCK_PHONE.replace(/\s+/g, "")}` },
    ...profile.links.map((l) => ({
      kind: l.kind,
      label: l.label,
      value: l.handle,
      href: l.href,
      external: true,
    })),
  ];

  const occupation =
    profile.jobTitle && profile.workplace
      ? `${profile.jobTitle} at ${profile.workplace}`
      : profile.jobTitle || profile.workplace || null;

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `EMAIL:${MOCK_EMAIL}`,
    `TEL:${MOCK_PHONE}`,
    occupation ? `TITLE:${occupation}` : null,
    `ADR:;;${profile.currentCity};;;;`,
    profile.secondaryCity ? `ADR:;;${profile.secondaryCity};;;;` : null,
    ...profile.links.map((l) => `URL:${l.href}`),
    `NOTE:${batchLabel(profile) ?? "Rishi Valley"}, Rishi Valley community`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  return { methods, vcard };
}

/* ------------------------------------------------------------------ *
 *  Small shared pieces
 * ------------------------------------------------------------------ */

/** The ONE label style on this page: 10.5px, uppercase, cinnamon by
    default, recoloured by the caller (facts use canopy). Every small
    label goes through here so no two of them drift apart. */
function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon",
        className
      )}
    >
      {children}
    </p>
  );
}

/** One label + value pair. Value is body size in the body face: a fact is
    not a heading, and the serif at a bigger size was the exact mismatch
    the owner flagged on About. */
function Fact({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Eyebrow className="text-canopy/80">{label}</Eyebrow>
      <p className="mt-[var(--space-xxs)] text-[15px] font-semibold leading-snug text-foreground">
        {value}
      </p>
    </div>
  );
}

function RailCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-card p-[var(--space-l)]",
        className
      )}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-[var(--space-m)]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  The plate. A square frame (the source is a 900x1300 portrait, so a
 *  square crop keeps roughly two thirds of the real frame rather than a
 *  magnified strip of it), tipped a couple of degrees, with a cream
 *  mount and a solid border. It ends at that border: no gradient bleeds
 *  it into the card below.
 *
 *  The rotation is animated ON, so the picture reads as being set down
 *  on the terrace. The wrapper stays unrotated so the bird badge and the
 *  layout underneath do not inherit the tilt.
 * ------------------------------------------------------------------ */
function PhotoPlate({ profile }: { profile: MockProfile }) {
  return (
    // The negative bottom margin is what lets the plate hang past the band's
    // edge on desktop: it holds back part of the plate's height from the row,
    // so the picture pokes into the gap below. It is also self-limiting -- a
    // short identity column can never make the overhang grow, because the
    // plate's own reduced height then sets the row height. Mobile keeps the
    // plate in normal flow, because there it is simply the first thing in the
    // column and nothing should sit under it.
    <div className="relative z-[var(--z-elevated)] w-[200px] shrink-0 sm:w-[224px] lg:-mb-[58px] lg:w-[240px]">
      <motion.div
        initial={{ opacity: 0, y: 14, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: -2.5 }}
        transition={SPRINGS.gentle}
        className="rounded-[var(--radius-lg)] border border-border bg-card p-[6px]"
        style={{ boxShadow: PLATE_SHADOW }}
      >
        {/* Nested box, so a smaller radius than its mount. */}
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-mist">
          {profile.coverPhoto && (
            <Image
              src={profile.coverPhoto}
              alt={`A photo ${profile.name.split(" ")[0]} added to their profile`}
              fill
              priority
              sizes="240px"
              className="object-cover"
              style={{ objectPosition: "50% 42%" }}
            />
          )}

          {/* The upload slot, visibly designed rather than implied. Hover is a
              colour change only. */}
          <button
            type="button"
            className="absolute bottom-[var(--space-s)] left-[var(--space-s)] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-[rgba(35,36,30,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.96]"
            style={{ backgroundColor: "rgba(35,36,30,0.7)" }}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Change photo
          </button>
        </div>
      </motion.div>

      {/* The bird, mounted on the plate's corner and clickable: the tap names
          its species. That naming lives here and nowhere else on the page. */}
      <div className="absolute -bottom-3 -right-3 rounded-full border border-border bg-card p-1.5 shadow-[0_2px_4px_rgba(30,28,22,0.08),0_14px_24px_-18px_rgba(30,28,22,0.6)]">
        <ProfileAvatar
          user={{
            id: profile.id,
            name: profile.name,
            photoUrl: profile.photoUrl,
            birdOverride: null,
          }}
          size={56}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Folder tab. The shipped shell's shape, sizes and colours, with the
 *  hover lift removed: inactive tabs rest a few pixels lower like a
 *  fanned stack, hover only warms the colour, and the press sinks.
 * ------------------------------------------------------------------ */
function FolderTab({
  label,
  count,
  active,
  onSelect,
}: {
  label: string;
  count?: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      initial={false}
      animate={{ y: active ? 0 : 6 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.snappy}
      style={{ clipPath: TAB_CLIP }}
      className={cn(
        // The ring is inset because the tab is clipped to the folder silhouette:
        // an outset ring would be cut off by the clip path and the focus state
        // would half disappear.
        "relative shrink-0 px-4 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11px] font-bold uppercase tracking-[0.09em] outline-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset sm:px-6 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:bg-paper hover:text-foreground"
      )}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1.5 text-[10.5px] font-bold tabular-nums opacity-55">{count}</span>
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ *
 *  One entry in Posts or Letters. Solid hairline between entries, never
 *  a dashed one. A letter is marked by its cinnamon eyebrow, feather,
 *  read time and serif title -- not by a second body typeface: the body
 *  of a post and the body of a letter are the same 15px/1.7 as every
 *  other block of text in the app.
 * ------------------------------------------------------------------ */
function Entry({
  post,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
  saved,
  onToggleSave,
}: {
  post: MockPost;
  isFirst: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const isLetter = post.kind === "letter";

  return (
    <article
      className={cn(
        "pb-[var(--space-l)]",
        isFirst ? "pt-0" : "border-t border-border pt-[var(--space-l)]"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.12em]",
          isLetter ? "text-cinnamon" : "text-muted-foreground"
        )}
      >
        {isLetter && <Feather className="h-3.5 w-3.5" aria-hidden />}
        <span>{isLetter ? "Letter" : "Post"}</span>
        <span aria-hidden className="opacity-40">
          &middot;
        </span>
        <span className="opacity-60">{formatDate(post.createdAt)}</span>
        {isLetter && (
          <>
            <span aria-hidden className="opacity-40">
              &middot;
            </span>
            <span className="opacity-60">{readMinutes(post.content)} min read</span>
          </>
        )}
      </div>

      {isLetter && post.title && (
        <h3 className="mt-[var(--space-xs)] font-heading text-[20px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {post.title}
        </h3>
      )}

      <div className="mt-[var(--space-s)] max-w-[66ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
        {post.content}
      </div>

      <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} label="Like" />
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm">
          <MessageCircle className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
        <BookmarkButton
          saved={saved}
          onToggle={onToggleSave}
          id={`terrace-${post.id}`}
          className="ml-auto"
          label={saved ? "Remove from saved" : "Save this"}
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 *  Main
 * ------------------------------------------------------------------ */
export default function TerraceVariant({ profile }: ProfileVariantProps) {
  // About is first in the list and first in state. It is the tab a
  // profile should open on, and reading it must never cost a click.
  const [tab, setTab] = useState<TabKey>("about");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  const meta = metaParts(profile);
  const years = valleyYears(profile);
  const batch = batchLabel(profile);
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");
  const { methods, vcard } = buildContact(profile);
  const firstName = profile.name.split(" ")[0];

  function toggleLike(id: string) {
    setLikes((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: { liked: !current.liked, count: current.liked ? current.count - 1 : current.count + 1 },
      };
    });
  }

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderEntries(entries: MockPost[]) {
    return entries.map((post, i) => (
      <Entry
        key={post.id}
        post={post}
        isFirst={i === 0}
        liked={likes[post.id].liked}
        likeCount={likes[post.id].count}
        onToggleLike={() => toggleLike(post.id)}
        saved={savedIds.has(post.id)}
        onToggleSave={() => toggleSave(post.id)}
      />
    ));
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "about", label: "About" },
    { key: "posts", label: "Posts", count: posts.length },
    { key: "letters", label: "Letters", count: letters.length },
  ];

  return (
    // `overflow-x-clip` (clip, never hidden) is the guard against a stray
    // absolutely-positioned child widening the document: the verified mark
    // parks its hover label to the right of the leaf, and at 390 that resting
    // label pushed the document wider than the viewport. `clip` does not
    // create a scroll container, so the rail below still sticks.
    //
    // No background of its own: the page behind this belongs to the app shell
    // (warm background plus the faint valley photo), and the concept must be
    // judged on that, not on a surface it painted for itself.
    <div className="w-full overflow-x-clip">
      {/* ---------------------------------------------------------- *
       *  THE TERRACE BAND. A card in the shell's column, ending on a
       *  solid hairline. The plate crosses that line on desktop.
       * ---------------------------------------------------------- */}
      <header
        className="rounded-[var(--radius-xl)] border border-border p-[var(--space-l)] sm:p-[var(--space-xl)] lg:pb-[var(--space-l)]"
        style={{
          backgroundColor: "var(--color-mist)",
          backgroundImage: TERRACE_FIELD,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div className="flex flex-col items-start gap-[var(--space-l)] lg:flex-row lg:gap-[var(--space-xl)]">
          <PhotoPlate profile={profile} />

          {/* Identity: to the RIGHT of the plate on desktop, under it on
              mobile. */}
          <FadeRise delay={0.06} className="min-w-0 flex-1 lg:pt-[var(--space-s)]">
            <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-[30px] font-bold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[40px] lg:text-[46px]">
              <span className="min-w-0">{profile.name}</span>
              <VerifiedMark
                user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                size={20}
              />
            </h1>

            {meta.length > 0 && (
              <p className="mt-[var(--space-s)] max-w-[62ch] text-[15px] leading-snug text-muted-foreground">
                {meta.join(" · ")}
              </p>
            )}

            {/* Years read as a span, never as a count. The stamp rides along
                here at narrow widths; on desktop it anchors the band's far
                right instead. */}
            <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-m)]">
              {years && (
                <div className="inline-flex items-baseline gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5">
                  <Eyebrow className="text-canopy/80">In the valley</Eyebrow>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">{years}</span>
                </div>
              )}
              {profile.admissionNumber && (
                <AdmissionStamp number={profile.admissionNumber} className="lg:hidden" />
              )}
            </div>

            {/* Email and phone are NOT on this surface. They live one click
                inside "Get in touch", beside Save contact. */}
            <div className="mt-[var(--space-l)]">
              <GetInTouch name={profile.name} methods={methods} vcard={vcard} />
            </div>
          </FadeRise>

          {/* The far-right anchor on wide screens, so the band's right side
              closes on something rather than trailing off. */}
          {profile.admissionNumber && (
            <FadeRise delay={0.12} className="hidden shrink-0 lg:block lg:pt-[var(--space-s)]">
              <AdmissionStamp number={profile.admissionNumber} />
            </FadeRise>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------- *
       *  BODY. Asymmetric two columns on desktop, tabs on the left.
       *  On mobile the rail simply falls under the panel, in order,
       *  because it is next in the DOM. The desktop top margin clears
       *  the plate's overhang (see PhotoPlate).
       * ---------------------------------------------------------- */}
      <div className="mt-[var(--space-l)] grid grid-cols-1 items-start gap-[var(--space-l)] sm:mt-[var(--space-xl)] lg:mt-[var(--space-xxl)] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-[var(--space-xl)]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Profile sections"
            className="flex gap-1 pl-[var(--space-m)] sm:pl-[var(--space-l)]"
          >
            {TABS.map((t) => (
              <FolderTab
                key={t.key}
                label={t.label}
                count={t.count}
                active={tab === t.key}
                onSelect={() => setTab(t.key)}
              />
            ))}
          </div>

          <div
            className="relative rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="px-[var(--space-l)] py-[var(--space-l)] sm:px-[var(--space-xl)] sm:py-[var(--space-xl)]">
              <FadeRise key={tab} y={10}>
                {tab === "about" && (
                  <div>
                    {/* Body face, body size. The serif at 16.5px read as a
                        different, louder page than the rest of the app. */}
                    <p className="max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
                      {profile.about}
                    </p>

                    <div className="my-[var(--space-l)] border-t border-border sm:my-[var(--space-xl)]" />

                    {/* The facts live here, in the default tab, and nowhere
                        else: the band already carries the years and the
                        admission number, so nothing on this page is printed
                        twice. */}
                    <div className="grid grid-cols-2 gap-[var(--space-l)] sm:grid-cols-3">
                      <Fact label="Lives in" value={profile.currentCity} />
                      {profile.secondaryCity && (
                        <Fact label="Also in" value={profile.secondaryCity} />
                      )}
                      {/* The longest value gets the full row on a phone, so
                          the two-column grid never leaves one cell four
                          lines tall beside a one-line neighbour. */}
                      {profile.jobTitle && (
                        <Fact
                          className="col-span-2 sm:col-span-1"
                          label="Work"
                          value={
                            profile.workplace
                              ? `${profile.jobTitle} at ${profile.workplace}`
                              : profile.jobTitle
                          }
                        />
                      )}
                      {profile.gradeJoined && (
                        <Fact label="Started in" value={`Grade ${profile.gradeJoined}`} />
                      )}
                      {batch && <Fact label="Batch" value={batch} />}

                      {/* Houses: one more fact, under the same small label as
                          the rest, using the shipped pills. Deliberately not a
                          heading, not a subtitle, not a section. */}
                      {profile.houses.length > 0 && (
                        <div className="col-span-2 min-w-0 sm:col-span-3">
                          <Eyebrow className="text-canopy/80">Houses</Eyebrow>
                          <div className="mt-[var(--space-s)]">
                            <HousesTrail houses={profile.houses} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === "posts" && <div>{renderEntries(posts)}</div>}

                {tab === "letters" && <div>{renderEntries(letters)}</div>}
              </FadeRise>
            </div>
          </div>
        </div>

        {/* Rail. Sticky, never an internal scroller: it stays put while the
            page scrolls past it and it never eats the wheel. */}
        <aside className="flex flex-col gap-[var(--space-l)] lg:sticky lg:top-[var(--space-l)] lg:self-start">
          <RailCard title="Find them">
            <div className="flex flex-col gap-2">
              {profile.links.map((link) => {
                const Icon = link.kind === "instagram" ? Instagram : Linkedin;
                return (
                  <a
                    key={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-border bg-mist/60 px-3.5 py-2.5 transition-colors duration-150 hover:border-cinnamon/45 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0 text-cinnamon" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-foreground">
                        {link.label}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {link.handle}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </RailCard>

          <RailCard title="Posts and letters">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTab("posts")}
                className="flex items-baseline justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-mist/60 px-3.5 py-2.5 text-left transition-colors duration-150 hover:border-canopy/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
              >
                <span className="text-[13.5px] font-semibold text-foreground">Posts</span>
                <span className="text-[15px] font-bold tabular-nums text-canopy">{posts.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("letters")}
                className="flex items-baseline justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-mist/60 px-3.5 py-2.5 text-left transition-colors duration-150 hover:border-cinnamon/45 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
              >
                <span className="text-[13.5px] font-semibold text-foreground">Letters</span>
                <span className="text-[15px] font-bold tabular-nums text-cinnamon">
                  {letters.length}
                </span>
              </button>
              <p className="mt-[var(--space-xxs)] text-[12.5px] leading-[1.6] text-muted-foreground">
                Everything {firstName} has written here, newest first.
              </p>
            </div>
          </RailCard>
        </aside>
      </div>
    </div>
  );
}
