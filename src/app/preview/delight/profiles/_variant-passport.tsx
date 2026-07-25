"use client";

/* ------------------------------------------------------------------ *
 *  Concept A: PASSPORT
 *
 *  Identity first. The page is a real two-column composition on a
 *  laptop: a sticky identity column on the left (portrait plate, name,
 *  the two contact actions, "Find them") and the folder tabs plus their
 *  panel on the right. On a phone it becomes one ordered stack:
 *  picture, who they are, how to reach them, then the record.
 *
 *  WHY THE PORTRAIT PLATE. The shipped page crops the uploaded picture
 *  into a ~6.4:1 band, which shows about a quarter of a 3:2 source at
 *  roughly 5x magnification. Here the plate is 4:5 on desktop and 3:2
 *  on mobile with an explicit `object-position: 50% 30%`, so the crop is
 *  art-directed and most of the frame survives. The plate ends at a hard
 *  bordered edge; nothing fades from the photo into the surface.
 *
 *  Rules this concept is built against (docs/planning/profile-concepts-
 *  brief.md sec 1), all deliberate:
 *   - no decorative watermark or glyph parked in dead space
 *   - solid hairlines only, never dashed or dotted
 *   - hover changes colour and nothing else; only :active presses
 *   - About is the first and default tab
 *   - email and phone live behind "Get in touch", never beside the name
 *   - valley years read "2014-2021", never "7 years"
 *   - nothing on the page owns a vertical scroller of its own
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Feather, Images, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { Button } from "@/components/ui/button";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import { HousesTrail } from "./_houses-trail";
import {
  metaParts,
  readMinutes,
  type MockLink,
  type MockPost,
  type MockProfile,
  type ProfileVariantProps,
} from "./_data";

/* ------------------------------------------------------------------ *
 *  The page field. Not decoration parked in a corner: it is the light
 *  the whole composition sits in, so the margins outside the 1240px
 *  content at 1920 read as a warm surface rather than empty paper.
 *  Static, so it is built once at module scope.
 * ------------------------------------------------------------------ */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.045 0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)"/></svg>';

const PAGE_FIELD = [
  "radial-gradient(940px 620px at 6% -10%, rgba(35,92,73,0.11), transparent 62%)",
  "radial-gradient(820px 560px at 98% 4%, rgba(194,98,47,0.10), transparent 58%)",
  "radial-gradient(1000px 720px at 62% 116%, rgba(63,124,166,0.08), transparent 60%)",
  `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`,
].join(", ");

/* The folder-tab silhouette, lifted from the shipped ProfileShell: the
   owner said the tabs are the one thing that already works. Same cut,
   same flush-against-the-body active state, minus any hover movement. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

type TabKey = "about" | "posts" | "letters" | "photos";

const TABS: { key: TabKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "posts", label: "Posts" },
  { key: "letters", label: "Letters" },
  { key: "photos", label: "Photos" },
];

/* ------------------------------------------------------------------ *
 *  Formatting
 * ------------------------------------------------------------------ */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Two years and a hyphen. Never a year count: people can subtract. */
function valleyYears(profile: MockProfile): string | null {
  const { yearJoined, yearLeft } = profile;
  if (yearJoined && yearLeft) return `${yearJoined}-${yearLeft}`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

function batchLine(profile: MockProfile): string | null {
  if (!profile.batchYear) return null;
  return profile.batchType ? `${profile.batchType} ${profile.batchYear}` : `${profile.batchYear}`;
}

/** The opening of a letter, two paragraphs at most. The full text lives on the letter's own page. */
function letterOpening(content: string): string {
  return content.split("\n\n").slice(0, 2).join("\n\n");
}

/**
 * Contact methods for the dialog. The mock payload carries no email or
 * phone column (the real `User` does: email / displayEmail / phone), so
 * the email below is a stand-in that shows the slot working. The point
 * of the rule is where these live, not what they say: nothing here is
 * ever printed on the surface next to the name.
 */
function contactMethods(profile: MockProfile): ContactMethod[] {
  const handle = profile.name.trim().toLowerCase().replace(/\s+/g, ".");
  const email = `${handle}@example.com`;
  const methods: ContactMethod[] = [
    { kind: "email", label: "Email", value: email, href: `mailto:${email}` },
  ];
  for (const link of profile.links) {
    methods.push({
      kind: link.kind,
      label: link.label,
      value: link.handle,
      href: link.href,
      external: true,
    });
  }
  return methods;
}

function vcardFor(profile: MockProfile): string {
  const handle = profile.name.trim().toLowerCase().replace(/\s+/g, ".");
  const org = [profile.jobTitle, profile.workplace].filter(Boolean).join(", ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    org ? `TITLE:${org}` : null,
    `EMAIL:${handle}@example.com`,
    profile.currentCity ? `ADR;TYPE=HOME:;;;${profile.currentCity};;;` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ *
 *  Small shared pieces
 * ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">{children}</p>
  );
}

/**
 * The admission stamp, the detail the owner singled out. Understated,
 * never with a "#". It sits on the plate's top-right corner on a solid
 * paper chip so it stays legible over any uploaded picture, and thumps
 * into place once on load.
 *
 * The entrance deliberately animates scale/rotate only, never opacity:
 * the server-rendered frame is the `initial` one, so starting from
 * opacity 0 would leave the stamp invisible until hydration lands.
 */
function AdmissionStamp({ number }: { number: number }) {
  return (
    <motion.div
      initial={{ scale: 1.18, rotate: -14 }}
      animate={{ scale: 1, rotate: -6 }}
      transition={{ ...SPRINGS.snappy, delay: 0.3 }}
      className="pointer-events-none absolute right-[var(--space-s)] top-[var(--space-s)] select-none rounded-[10px] border-[1.5px] border-cinnamon bg-paper px-3 py-1.5 text-center"
      style={{
        boxShadow: "0 1px 2px rgba(35,36,30,0.18), 0 12px 24px -18px rgba(35,36,30,0.75)",
      }}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-[7px] border border-cinnamon/60" />
      <p className="relative text-[8px] font-bold uppercase tracking-[0.22em] text-cinnamon">
        Admission
      </p>
      <p className="relative mt-0.5 font-heading text-[17px] font-bold leading-none tracking-[0.02em] tabular-nums text-cinnamon">
        {number}
      </p>
    </motion.div>
  );
}

/**
 * The upload slot, visibly designed rather than implied: this is the
 * member's own view of their profile. Colour change on hover, press
 * sink on click, no movement under an idle cursor.
 */
function ChangePhotoButton() {
  return (
    <button
      type="button"
      className="absolute bottom-[var(--space-s)] right-[var(--space-s)] inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foreground transition-[colors,transform] duration-150 hover:border-canopy hover:bg-canopy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
    >
      <Camera className="h-3.5 w-3.5" aria-hidden />
      Change photo
    </button>
  );
}

const LINK_ICON = { instagram: Instagram, linkedin: Linkedin } as const;
const LINK_TINT = { instagram: "text-cinnamon", linkedin: "text-sky" } as const;

function FindThemPill({ link }: { link: MockLink }) {
  const Icon = LINK_ICON[link.kind];
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-[colors,transform] duration-150 hover:border-canopy/45 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
    >
      <Icon className={cn("h-[15px] w-[15px] shrink-0", LINK_TINT[link.kind])} aria-hidden />
      <span className="shrink-0">{link.label}</span>
      <span className="min-w-0 truncate font-normal text-muted-foreground">{link.handle}</span>
    </a>
  );
}

function FolderTab({
  label,
  active,
  onSelect,
  id,
  panelId,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  id: string;
  panelId: string;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      onClick={onSelect}
      initial={false}
      animate={{ y: active ? 0 : 6 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.snappy}
      style={{ clipPath: TAB_CLIP }}
      className={cn(
        // The focus indicator is an INSET outline, not a ring. A ring is
        // drawn outside the border box, and the folder bevel is a
        // clip-path, so a ring on this button would be clipped away
        // entirely and the tab would have no visible focus state.
        "relative shrink-0 px-3 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11.5px] font-bold uppercase tracking-[0.09em] outline-none transition-colors duration-150 focus-visible:[outline:2px_solid_var(--color-canopy)] focus-visible:[outline-offset:-3px] sm:px-6 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </motion.button>
  );
}

/**
 * One cell of the record strip that runs along the bottom of the About
 * panel, the way a passport carries its facts on one printed line.
 * Cells are divided by solid vertical hairlines: four across on a
 * laptop, two across on a phone, and the rules are placed by index so a
 * cell that starts a row never wears one.
 */
function RecordCell({ label, value, index }: { label: string; value: ReactNode; index: number }) {
  return (
    <div
      className={cn(
        "min-w-0",
        index % 2 === 1 && "border-l border-border pl-[var(--space-m)]",
        index % 2 === 0 && index > 0 && "sm:border-l sm:border-border sm:pl-[var(--space-m)]"
      )}
    >
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-[var(--space-xxs)] font-heading text-[16px] font-semibold leading-tight tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Panel content
 * ------------------------------------------------------------------ */
function PostEntry({
  post,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
}: {
  post: MockPost;
  isFirst: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  return (
    <article
      className={cn(
        "pb-[var(--space-l)]",
        isFirst ? "pt-0" : "border-t border-border pt-[var(--space-l)]"
      )}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {formatDate(post.createdAt)}
      </p>
      <p className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7] text-foreground">
        {post.content}
      </p>
      <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} size="sm" label="Like" />
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm tabular-nums">
          <MessageCircle className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
      </div>
    </article>
  );
}

function LetterEntry({
  post,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
}: {
  post: MockPost;
  isFirst: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  return (
    <article
      className={cn(
        "pb-[var(--space-l)]",
        isFirst ? "pt-0" : "border-t border-border pt-[var(--space-l)]"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" aria-hidden />
        Letter
        <span className="opacity-65">· {formatDate(post.createdAt)}</span>
        <span className="opacity-65">· {readMinutes(post.content)} min read</span>
      </div>
      {post.title && (
        <h3 className="mt-[var(--space-xs)] font-heading text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-foreground">
          {post.title}
        </h3>
      )}
      <p className="mt-[var(--space-s)] max-w-[68ch] whitespace-pre-wrap font-heading text-[16.5px] leading-[1.8] text-foreground">
        {letterOpening(post.content)}
      </p>
      <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-s)]">
        <Button variant="outline" size="sm">
          Read the letter
        </Button>
        <div className="-ml-1 flex items-center gap-1 text-muted-foreground">
          <LoveButton
            liked={liked}
            count={likeCount}
            onToggle={onToggleLike}
            size="sm"
            label="Like"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm tabular-nums">
            <MessageCircle className="h-4 w-4" aria-hidden />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * The panel's tab-change transition.
 *
 * `FadeRise` starts at opacity 0, and the server-rendered frame IS the
 * initial frame, so wrapping the panel in it unconditionally means the
 * whole record is invisible until hydration lands. That is fine at 100ms
 * and awful on a cold dev server. So the first paint is plain, fully
 * visible markup, and the fade only takes over once somebody has
 * actually changed tab, which is the moment the motion is for.
 */
function PanelTransition({
  switched,
  tabKey,
  children,
}: {
  switched: boolean;
  tabKey: string;
  children: ReactNode;
}) {
  const className = "flex flex-1 flex-col";
  if (!switched) return <div className={className}>{children}</div>;
  return (
    <FadeRise key={tabKey} y={10} className={className}>
      {children}
    </FadeRise>
  );
}

function EmptyPanel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    // my-auto: on a laptop the folder card stretches to the identity
    // column's height, so an empty state sits in the middle of the panel
    // rather than clinging to the top of a tall blank card.
    <div className="my-auto flex flex-col items-center gap-[var(--space-s)] rounded-[var(--radius-md)] border border-border bg-mist/60 px-[var(--space-l)] py-[var(--space-xl)] text-center">
      {icon}
      <p className="max-w-[42ch] text-[13.5px] leading-[1.6] text-muted-foreground">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Main
 * ------------------------------------------------------------------ */
export default function PassportVariant({ profile }: ProfileVariantProps) {
  // About is first in the list and first in state: the owner should never
  // have to click to read who somebody is.
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  // Flips the first time a tab is chosen; see PanelTransition.
  const [switched, setSwitched] = useState(false);
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  function selectTab(key: TabKey) {
    setActiveTab(key);
    setSwitched(true);
  }

  function toggleLike(id: string) {
    setLikes((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1,
        },
      };
    });
  }

  const meta = metaParts(profile);
  const years = valleyYears(profile);
  const batch = batchLine(profile);
  const record: { label: string; value: string }[] = [
    years ? { label: "In the valley", value: years } : null,
    profile.gradeJoined ? { label: "Entered", value: `Grade ${profile.gradeJoined}` } : null,
    batch ? { label: "Batch", value: batch } : null,
    profile.secondaryCity ? { label: "Also in", value: profile.secondaryCity } : null,
  ].filter((c): c is { label: string; value: string } => c !== null);
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");
  const firstName = profile.name.split(" ")[0];
  const panelId = "passport-panel";

  return (
    <div
      // min-h-screen so the warm field always reaches the bottom of the
      // window. Without it a short tab leaves a visible seam where the
      // gradients stop and the flat page colour takes over.
      //
      // overflow-x-clip: VerifiedMark keeps its "Verified member" label in
      // the DOM at opacity 0 and parks it `left-full`, so at 390 the label
      // hangs 10px past the viewport and the page rubber-bands sideways.
      // `clip` rather than `hidden` on purpose: `hidden` would make this
      // element the scrollport and kill the identity column's sticky.
      className="min-h-screen w-full overflow-x-clip"
      style={{ backgroundColor: "var(--color-background)", backgroundImage: PAGE_FIELD }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[var(--space-m)] py-[var(--space-l)] sm:px-[var(--space-l)] sm:py-[var(--space-xl)]">
        {/* The grid stretches by default so the folder card always runs
            to the same bottom edge as the identity column, even on the
            short About tab. Only the identity column opts out with
            `self-start`, which is also what gives its sticky position
            room to move. */}
        <div className="grid grid-cols-1 gap-[var(--space-xl)] lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* ---------------------------------------------------------- *
              IDENTITY COLUMN. Sticky on a laptop, first in the stack on a
              phone. Sticky only: it never gets a scroller of its own.
           * ---------------------------------------------------------- */}
          <div className="lg:sticky lg:top-[var(--space-l)] lg:self-start">
            <div className="relative">
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-xl)] border border-border bg-mist lg:aspect-[4/5]">
                {profile.coverPhoto ? (
                  <Image
                    src={profile.coverPhoto}
                    alt={`${profile.name}'s picture`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 340px, 100vw"
                    className="object-cover"
                    style={{ objectPosition: "50% 30%" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera className="h-7 w-7 text-muted-foreground/45" aria-hidden />
                  </div>
                )}
                {profile.admissionNumber && <AdmissionStamp number={profile.admissionNumber} />}
                <ChangePhotoButton />
              </div>

              {/* The bird sits over the plate's bottom-left corner and
                  chirps when you tap it. It rides a solid paper disc so
                  it reads against any picture instead of sinking into
                  it, and lives in its own positioned span so
                  ProfileAvatar's own `relative` root is left alone. */}
              <span
                className="absolute -bottom-6 left-[var(--space-m)] z-[var(--z-elevated)] inline-flex rounded-full border border-border bg-paper p-[5px]"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(35,36,30,0.10), 0 14px 28px -20px rgba(35,36,30,0.65)",
                }}
              >
                <ProfileAvatar
                  user={{ id: profile.id, name: profile.name, photoUrl: profile.photoUrl }}
                  size={92}
                />
              </span>
            </div>

            <div className="mt-[var(--space-xl)]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="font-heading text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-foreground">
                  {profile.name}
                </h1>
                <VerifiedMark
                  user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                  size={17}
                />
              </div>
              {meta.length > 0 && (
                <p className="mt-[var(--space-xs)] text-[13.5px] leading-[1.55] text-muted-foreground">
                  {meta.join(" · ")}
                </p>
              )}
            </div>

            {/* Contact actions. Email and phone are behind this dialog,
                one click away and never printed beside the name. */}
            <div className="mt-[var(--space-l)]">
              <GetInTouch
                name={profile.name}
                methods={contactMethods(profile)}
                vcard={vcardFor(profile)}
              />
            </div>

            {profile.links.length > 0 && (
              <div className="mt-[var(--space-l)]">
                <SectionLabel>Find them</SectionLabel>
                <div className="mt-[var(--space-s)] flex flex-col gap-[var(--space-xs)]">
                  {profile.links.map((link) => (
                    <FindThemPill key={link.kind} link={link} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------- *
              RECORD COLUMN: folder tabs plus one padded panel. Every
              panel shares the panel's padding edge, so switching tabs
              never shifts the left edge of the content.
           * ---------------------------------------------------------- */}
          <div className="flex min-w-0 flex-col">
            <div
              role="tablist"
              aria-label="Profile sections"
              className="relative z-10 flex gap-1 pl-[var(--space-m)] sm:pl-[var(--space-l)]"
            >
              {TABS.map((tab) => (
                <FolderTab
                  key={tab.key}
                  id={`passport-tab-${tab.key}`}
                  panelId={panelId}
                  label={tab.label}
                  active={activeTab === tab.key}
                  onSelect={() => selectTab(tab.key)}
                />
              ))}
            </div>

            <div
              className="relative flex flex-1 flex-col rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
              style={{
                boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)",
              }}
            >
              <div
                role="tabpanel"
                id={panelId}
                aria-labelledby={`passport-tab-${activeTab}`}
                className="flex flex-1 flex-col px-[var(--space-l)] py-[var(--space-l)] sm:px-[var(--space-xl)] sm:py-[var(--space-xl)]"
              >
                <PanelTransition switched={switched} tabKey={activeTab}>
                  {activeTab === "about" && (
                    <div className="flex flex-1 flex-col">
                      <section>
                        <SectionLabel>In their words</SectionLabel>
                        <p className="mt-[var(--space-s)] max-w-[62ch] font-heading text-[16.5px] leading-[1.78] text-foreground">
                          {profile.about}
                        </p>
                      </section>

                      {/* No `mt-auto` here. Two auto top-margins in the same
                          flex column do not stack: CSS splits the free space
                          EQUALLY between them, which on a laptop opened two
                          ~245px voids (bio | void | houses | void | record).
                          Exactly the dead space the owner complained about.
                          Only the record, the strip that is meant to sit on
                          the bottom edge, gets the auto margin. */}
                      {profile.houses.length > 0 && (
                        <section className="pt-[var(--space-xl)]">
                          <SectionLabel>Houses</SectionLabel>
                          {/* `w-fit` matters: the trail draws its U-turn
                              against the RIGHT edge of its container, so
                              in a full-width box the turn floats away
                              from the chain it belongs to. Shrinking the
                              box to the widest row keeps the turn on the
                              chain. */}
                          <div className="mt-[var(--space-m)] w-fit max-w-full">
                            <HousesTrail houses={profile.houses} />
                          </div>
                        </section>
                      )}

                      {/* The record runs along the bottom edge of the
                          panel, so on a laptop the card and the identity
                          column finish on the same line instead of the
                          card trailing off into empty surface. `mt-auto`
                          only bites when there is slack: on a phone the
                          strip simply follows the trail. */}
                      {record.length > 0 && (
                        <section className="mt-auto border-t border-border pt-[var(--space-xl)]">
                          <SectionLabel>The record</SectionLabel>
                          <dl className="mt-[var(--space-m)] grid grid-cols-2 gap-y-[var(--space-m)] sm:grid-cols-4">
                            {record.map((cell, i) => (
                              <RecordCell
                                key={cell.label}
                                label={cell.label}
                                value={cell.value}
                                index={i}
                              />
                            ))}
                          </dl>
                        </section>
                      )}
                    </div>
                  )}

                  {activeTab === "posts" &&
                    (posts.length === 0 ? (
                      <EmptyPanel
                        icon={
                          <MessageCircle className="h-6 w-6 text-muted-foreground/45" aria-hidden />
                        }
                        text={`Nothing from ${firstName} yet.`}
                      />
                    ) : (
                      <div>
                        {posts.map((post, i) => (
                          <PostEntry
                            key={post.id}
                            post={post}
                            isFirst={i === 0}
                            liked={likes[post.id]?.liked ?? false}
                            likeCount={likes[post.id]?.count ?? post.likeCount}
                            onToggleLike={() => toggleLike(post.id)}
                          />
                        ))}
                      </div>
                    ))}

                  {activeTab === "letters" &&
                    (letters.length === 0 ? (
                      <EmptyPanel
                        icon={<Feather className="h-6 w-6 text-muted-foreground/45" aria-hidden />}
                        text={`${firstName} has not written a letter yet.`}
                      />
                    ) : (
                      <div>
                        {letters.map((post, i) => (
                          <LetterEntry
                            key={post.id}
                            post={post}
                            isFirst={i === 0}
                            liked={likes[post.id]?.liked ?? false}
                            likeCount={likes[post.id]?.count ?? post.likeCount}
                            onToggleLike={() => toggleLike(post.id)}
                          />
                        ))}
                      </div>
                    ))}

                  {activeTab === "photos" && (
                    <EmptyPanel
                      icon={<Images className="h-6 w-6 text-muted-foreground/45" aria-hidden />}
                      text={`Nothing from ${firstName} in the Valley Collection yet. Pictures added there show up here.`}
                    />
                  )}
                </PanelTransition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
