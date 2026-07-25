"use client";

/* ------------------------------------------------------------------ *
 *  Concept B: BROADSHEET
 *
 *  A newspaper front page. The person's name IS the nameplate: Libre
 *  Baskerville at up to 72px with -0.035em tracking, sitting across the
 *  top of the sheet with a rule above it and the lead photograph beside
 *  it. Under the nameplate runs a dateline strip (Batch / In the valley
 *  / Based in / Admission) divided by solid vertical hairlines, exactly
 *  where a paper prints "Vol. CXXIV, No. 42 | Monday | Fifty paise".
 *  Then the body: a wide article column carrying the folder tabs (About
 *  first and default), and a rail holding the houses trail, the contact
 *  actions, and "Find them".
 *
 *  THREE LAYOUT DECISIONS WORTH THE NOTE:
 *
 *  1. The photo is 21:9 EXACTLY, at every width, and is never full
 *     content width on desktop. A 1400px-wide frame capped at 300px tall
 *     is a 4.7:1 band, which is the "magnified sliver" the owner
 *     rejected. So the masthead splits at md into [name | photo], the
 *     photo taking 40% of the sheet up to a 560px cap: 286px wide on a
 *     tablet, 542px at 1440, 560px at 1920, and therefore 122px to 240px
 *     tall. Always 21:9, always under the ~300px the brief asks for,
 *     always art-directed at 50% 35%. Full width on a phone, where 21:9
 *     is only 153px tall and reads as a proper picture.
 *
 *  2. The rail is 400px, not 300px, and the houses trail inside it is
 *     shrink-wrapped. The shared HousesTrail picks its column count from
 *     the VIEWPORT, so at any desktop width it lays four pills per row,
 *     measured at 349px of run. A 300px rail would have overflowed it,
 *     and a full-width band would have stranded its 180 U-turn a
 *     thousand pixels from the last pill, which is the exact defect the
 *     trail exists to fix. 400px holds a four-pill row with headroom.
 *
 *  3. Email and phone are not on this page. They live inside the shared
 *     GetInTouch dialog (the same control the real profile ships), one
 *     click from the rail, alongside Save contact (.vcf).
 *
 *  Hover never moves anything here: no translate, no scale, no
 *  whileHover. Hover is a colour change. The press sink on :active
 *  stays, because that is feedback for a click you made.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Feather, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { FadeRise, SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
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
 *  Newsprint ground: two low-opacity brand washes plus a fine grain, so
 *  the sheet reads as paper under light instead of a flat token fill.
 *  Built once at module scope; it is a static texture, not render work.
 *  Texture only. No watermark, no parked glyph, nothing decorative
 *  dropped into empty space.
 * ------------------------------------------------------------------ */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.045 0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)"/></svg>';

const NEWSPRINT = [
  "radial-gradient(1200px 620px at 6% -12%, rgba(194,98,47,0.09), transparent 56%)",
  "radial-gradient(1000px 700px at 104% 112%, rgba(35,92,73,0.07), transparent 58%)",
  `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`,
].join(", ");

/* Folder-tab silhouette, lifted from the shipped ProfileShell: the
   diagonal bevel every physical file tab shares. The owner named these
   as something that works, so the look is reused verbatim, minus the
   hover lift. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

const CARD_SHADOW = "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)";

const TABS = [
  { key: "about", label: "About" },
  { key: "posts", label: "Posts" },
  { key: "letters", label: "Letters" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ------------------------------------------------------------------ *
 *  Formatting helpers. Each guards the partial-data case the real
 *  profile spec calls out, even though this mock is always complete.
 * ------------------------------------------------------------------ */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortDate(iso: string): { day: string; year: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
    year: String(d.getUTCFullYear()),
  };
}

/**
 * The valley range. A plain hyphenated range and NOTHING else: the year
 * count the shipped page appends ("2014-2021 · 7 years") is exactly what
 * the owner struck out.
 */
function valleyYears(profile: MockProfile): string | null {
  const { yearJoined, yearLeft } = profile;
  if (yearJoined && yearLeft) return `${yearJoined}-${yearLeft}`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

/** The deck under the nameplate: what they do now, in one line. */
function deckLine(profile: MockProfile): string {
  const { jobTitle, workplace } = profile;
  if (jobTitle && workplace) return `${jobTitle} at ${workplace}`;
  return jobTitle || workplace || metaParts(profile).join(" · ");
}

function batchLabel(profile: MockProfile): string | null {
  const parts = [profile.batchType, profile.batchYear].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Placeholder reach-outs. The mock payload has no email/phone columns
 * (the real `User` does), so they are derived here purely to exercise
 * the Get in touch dialog. They are never printed on the page.
 */
function contactFor(profile: MockProfile): { email: string; phone: string } {
  const slug = profile.name.toLowerCase().replace(/\s+/g, ".");
  return { email: `${slug}@example.com`, phone: "+91 98450 33712" };
}

function buildVcard(profile: MockProfile, email: string, phone: string): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `EMAIL:${email}`,
    `TEL:${phone}`,
    profile.jobTitle ? `TITLE:${profile.jobTitle}` : null,
    profile.workplace ? `ORG:${profile.workplace}` : null,
    profile.currentCity ? `ADR:;;;${profile.currentCity};;;` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ *
 *  Small type primitives
 * ------------------------------------------------------------------ */
function Eyebrow({ children, tone = "cinnamon" }: { children: string; tone?: "cinnamon" | "muted" }) {
  return (
    <p
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.18em]",
        tone === "cinnamon" ? "text-cinnamon" : "text-muted-foreground"
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 *  The bird. Clicking it chirps: the glyph thumps once and three
 *  cinnamon arcs open out from its beak. Hover is a warm disc appearing
 *  behind it, a colour change and nothing more.
 * ------------------------------------------------------------------ */
function ChirpBird({ profile }: { profile: MockProfile }) {
  const [chirp, setChirp] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setChirp((c) => c + 1)}
      aria-label={`${profile.name}'s bird, a ${profile.speciesName}. Tap for a chirp.`}
      className="relative shrink-0 rounded-full p-1 outline-none transition-[background-color,transform] duration-150 hover:bg-mist focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.95]"
    >
      <motion.span
        key={chirp}
        initial={chirp > 0 ? { scale: 1.12, rotate: -7 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRINGS.snappy}
        className="block"
      >
        <BirdAvatar
          user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
          size="md"
        />
      </motion.span>

      {chirp > 0 && (
        <span key={chirp} aria-hidden className="pointer-events-none absolute right-[-6px] top-[14px]">
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
  );
}

/* ------------------------------------------------------------------ *
 *  The lead photograph. Exactly 21:9 at every width, hard square edges
 *  (a newspaper does not round its pictures), a hairline frame, and a
 *  solid cinnamon rule under it. No gradient, no fade into the sheet.
 *  The upload slot is visibly designed: a Change photo control sits on
 *  the picture, since this is the owner's own profile view.
 * ------------------------------------------------------------------ */
function LeadPhoto({ profile }: { profile: MockProfile }) {
  return (
    // max-w caps the picture's HEIGHT without ever touching its 21:9 ratio:
    // the column is a percentage, so on a 1920 sheet an uncapped frame would
    // grow past the ~300px the brief asks for.
    <figure className="min-w-0 md:col-start-2 md:row-start-1 md:ml-auto md:w-full md:max-w-[560px] md:self-end">
      <div className="relative aspect-[21/9] w-full overflow-hidden border border-border bg-mist">
        {profile.coverPhoto ? (
          <Image
            src={profile.coverPhoto}
            alt={`The picture ${profile.name.split(" ")[0]} chose for their profile`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            style={{ objectPosition: "50% 35%" }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Camera className="h-7 w-7 text-muted-foreground/50" aria-hidden />
          </div>
        )}

        <button
          type="button"
          className="glass absolute right-[var(--space-s)] top-[var(--space-s)] inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground outline-none transition-[background-color,color,transform] duration-150 hover:bg-card hover:text-cinnamon focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
        >
          <Camera className="h-3.5 w-3.5 text-cinnamon" aria-hidden />
          Change photo
        </button>
      </div>
      <div aria-hidden className="h-[3px] w-full bg-cinnamon" />
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 *  Dateline. Four facts in a row divided by SOLID vertical hairlines on
 *  desktop; a 2x2 grid with one horizontal hairline on a phone. The
 *  admission number is set here as an heirloom detail, never with a "#".
 * ------------------------------------------------------------------ */
function Dateline({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-border py-[var(--space-s)] sm:grid-cols-4">
      {facts.map((fact, i) => (
        <div
          key={fact.label}
          className={cn(
            "min-w-0 border-border py-[var(--space-s)] pr-[var(--space-m)]",
            i % 2 === 1 && "border-l pl-[var(--space-m)]",
            i % 2 === 0 && "pl-0",
            i >= 2 && "border-t sm:border-t-0",
            i === 0 ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:pl-[var(--space-m)]"
          )}
        >
          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="mt-[var(--space-xxs)] truncate font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[18px]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 *  Folder tabs. The shipped clip-path silhouette, the inactive tabs
 *  sitting 6px lower like a fanned stack. The y offset is bound to
 *  SELECTED state, not hover: hovering an inactive tab only warms its
 *  text colour.
 * ------------------------------------------------------------------ */
function FolderTab({
  label,
  active,
  onSelect,
}: {
  label: string;
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
        // The focus ring is an INSET shadow, not `ring-*`: an outset ring would
        // be cut away entirely by the tab's clip-path, leaving a keyboard user
        // with no focus indicator at all.
        "relative shrink-0 px-5 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11.5px] font-bold uppercase tracking-[0.09em] outline-none transition-colors duration-150 focus-visible:shadow-[inset_0_0_0_2px_var(--color-leaf)] sm:px-7 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:bg-mist hover:text-cinnamon"
      )}
    >
      {label}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ *
 *  Rail blocks
 * ------------------------------------------------------------------ */
function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="p-[var(--space-m)]">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-[var(--space-s)]">{children}</div>
    </section>
  );
}

function LinkRow({ link }: { link: MockLink }) {
  const Icon = link.kind === "instagram" ? Instagram : Linkedin;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-mist/60 px-3 py-2 outline-none transition-colors duration-150 hover:border-cinnamon/45 hover:bg-mist focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.985]"
    >
      <Icon className="h-4 w-4 shrink-0 text-cinnamon" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-foreground">
          {link.label}
        </span>
        <span className="block truncate text-[12px] leading-tight text-muted-foreground">
          {link.handle}
        </span>
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ *
 *  Article entries. Posts and letters share one shape, with a date
 *  gutter on the left the way a paper stamps its filed pieces, and the
 *  letter given the exact register of the real Letters page: cinnamon
 *  eyebrow, feather, read time, serif body at 1.8.
 * ------------------------------------------------------------------ */
function ArticleEntry({
  post,
  first,
  liked,
  likeCount,
  onToggleLike,
  saved,
  onToggleSave,
}: {
  post: MockPost;
  first: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const isLetter = post.kind === "letter";
  const { day, year } = shortDate(post.createdAt);

  return (
    <article
      className={cn(
        "grid gap-[var(--space-s)] sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-[var(--space-l)]",
        first ? "pt-0" : "mt-[var(--space-l)] border-t border-border pt-[var(--space-l)]"
      )}
    >
      <div className="flex items-baseline gap-2 sm:flex-col sm:items-start sm:gap-0.5">
        <span className="font-heading text-[15px] font-bold leading-none tracking-[-0.01em] text-foreground">
          {day}
        </span>
        <span className="font-heading text-[13px] leading-none tabular-nums text-muted-foreground">
          {year}
        </span>
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em]",
            isLetter ? "text-cinnamon" : "text-muted-foreground"
          )}
        >
          {isLetter && <Feather className="h-3.5 w-3.5" aria-hidden />}
          <span>{isLetter ? "Letter" : "Post"}</span>
          <span className="opacity-65">{formatDate(post.createdAt)}</span>
          {isLetter && <span className="opacity-65">{readMinutes(post.content)} min read</span>}
        </div>

        {isLetter && post.title && (
          <h3 className="mt-[var(--space-xs)] max-w-[24ch] font-heading text-[26px] font-bold leading-[1.12] tracking-[-0.025em] text-foreground sm:text-[30px]">
            {post.title}
          </h3>
        )}

        {/* The measure lives on this wrapper, so the actions row ends at
            exactly the same right edge the text does. Setting it on the copy
            alone left the bookmark stranded 200px past the last word. */}
        <div
          className={cn(
            "mt-[var(--space-s)]",
            isLetter
              ? "max-w-[68ch] font-heading text-[16.5px] leading-[1.8]"
              : "max-w-[66ch] text-[15.5px] leading-[1.7]"
          )}
        >
          <div className="whitespace-pre-wrap text-foreground">{post.content}</div>

          <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 font-sans text-muted-foreground">
            <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} size="sm" label="Like" />
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px]">
              <MessageCircle className="h-4 w-4" aria-hidden />
              {post.commentCount}
            </span>
            <BookmarkButton
              saved={saved}
              onToggle={onToggleSave}
              id={`broadsheet-${post.id}`}
              className="ml-auto"
              label={saved ? "Remove from saved" : "Save this"}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-m)] py-[var(--space-s)]">
      <dt className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-heading text-[14.5px] font-bold leading-tight tracking-[-0.01em] text-foreground">
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Main
 * ------------------------------------------------------------------ */
export default function BroadsheetVariant({ profile }: ProfileVariantProps) {
  const [tab, setTab] = useState<TabKey>("about");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLike(id: string) {
    setLikes((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1,
        },
      };
    });
  }

  const firstName = profile.name.split(" ")[0];
  const deck = deckLine(profile);
  const houses = profile.houses ?? [];
  const links = profile.links ?? [];
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");

  const { email, phone } = contactFor(profile);
  const contactMethods: ContactMethod[] = [
    { kind: "email", label: "Email", value: email, href: `mailto:${email}` },
    { kind: "phone", label: "Phone", value: phone, href: `tel:${phone.replace(/\s+/g, "")}` },
    ...links.map(
      (l): ContactMethod => ({
        kind: l.kind,
        label: l.label,
        value: l.handle,
        href: l.href,
        external: true,
      })
    ),
  ];

  const facts = [
    { label: "Batch", value: batchLabel(profile) },
    { label: "In the valley", value: valleyYears(profile) },
    { label: "Based in", value: profile.currentCity },
    { label: "Admission", value: profile.admissionNumber ? String(profile.admissionNumber) : null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const written = [
    profile.postCount > 0 ? `${profile.postCount} posts` : null,
    profile.letterCount > 0 ? `${profile.letterCount} letter${profile.letterCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  function renderEntries(entries: MockPost[], empty: string) {
    if (entries.length === 0) {
      return (
        <p className="max-w-[46ch] text-[15px] leading-[1.7] text-muted-foreground">{empty}</p>
      );
    }
    return entries.map((post, i) => (
      <ArticleEntry
        key={post.id}
        post={post}
        first={i === 0}
        liked={likes[post.id].liked}
        likeCount={likes[post.id].count}
        onToggleLike={() => toggleLike(post.id)}
        saved={savedIds.has(post.id)}
        onToggleSave={() => toggleSave(post.id)}
      />
    ));
  }

  return (
    // overflow-x-clip, not hidden: VerifiedMark keeps its hover label in the DOM
    // at opacity 0 and only measures which side to flip to when it opens, so the
    // hidden label sat 60px past the right edge of a 390 phone and gave the whole
    // page a sideways scroll. `clip` is not a scroll container, so the rail's
    // lg:sticky still resolves against the viewport; `hidden` would have killed it.
    <div
      className="w-full overflow-x-clip"
      style={{ backgroundColor: "var(--color-background)", backgroundImage: NEWSPRINT }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-[var(--space-m)] py-[var(--space-l)] sm:px-[var(--space-l)] xl:px-[var(--space-xl)] xl:py-[var(--space-xl)]">
        {/* ---------------- MASTHEAD ---------------- */}
        <header>
          <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-1 border-b border-border pb-[var(--space-xs)]">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.26em] text-canopy">
              Rishi Valley
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Profile
            </span>
          </div>

          <FadeRise y={12}>
            <div className="mt-[var(--space-m)] grid gap-[var(--space-m)] sm:mt-[var(--space-l)] md:grid-cols-[minmax(0,1fr)_minmax(0,40%)] md:items-end md:gap-[var(--space-l)]">
              <div className="min-w-0 md:col-start-1 md:row-start-1">
                {/* The verified leaf rides with the NAME, the way the shipped
                    header does it. Parked at the end of the deck line it kept
                    wrapping onto a line of its own on a phone, a lone leaf
                    floating under the sentence. */}
                {/* 5.6vw, not 5.2: the brief sets the nameplate at 56-72px, and
                    5.2vw only reached 53px at the 1024 desktop breakpoint. 5.6vw
                    lands 57px at 1024 and hits the 72px cap by 1286. */}
                <h1 className="flex flex-wrap items-center gap-x-3 font-heading text-[clamp(2.25rem,5.6vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.035em] text-foreground">
                  <span className="min-w-0">{profile.name}</span>
                  <VerifiedMark
                    user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                    size={20}
                  />
                </h1>

                <div className="mt-[var(--space-m)] flex items-center gap-[var(--space-s)] md:mt-[var(--space-l)]">
                  <ChirpBird profile={profile} />
                  <div className="min-w-0">
                    <p className="text-[16px] leading-[1.5] text-foreground sm:text-[17px]">
                      {deck}
                    </p>
                    <p className="mt-[var(--space-xxs)] text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {profile.speciesName}
                    </p>
                  </div>
                </div>
              </div>

              <LeadPhoto profile={profile} />
            </div>
          </FadeRise>

          {/* ---------------- DATELINE ---------------- */}
          <div className="mt-[var(--space-m)] sm:mt-[var(--space-l)]">
            <Dateline facts={facts} />
          </div>
        </header>

        {/* ---------------- BODY ----------------
            One grid. On a phone the rail is DOM-first, so its contents read
            above the tabs; from lg it is placed into column two and the
            article column takes column one. The rail sticks, and never
            scrolls inside itself. */}
        <div className="mt-[var(--space-l)] grid gap-[var(--space-l)] sm:mt-[var(--space-xl)] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-[var(--space-xl)] xl:grid-cols-[minmax(0,1fr)_440px]">
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[var(--space-xl)] lg:self-start">
            <div
              className="divide-y divide-border rounded-[var(--radius-xl)] border border-border bg-card"
              style={{ boxShadow: CARD_SHADOW }}
            >
              {houses.length > 0 && (
                <RailSection title="Houses through the years">
                  {/* w-fit is load bearing. The shared trail parks its 180
                      U-turn at its container's right edge, so in a container
                      wider than a row of pills the turn strands itself in
                      empty space, which is the exact complaint the trail was
                      built to fix. Shrink-wrapping the block puts the turn
                      hard against the last pill of the row. The 400px rail is
                      then sized to hold a full four-pill row (measured at
                      349px for this mock) without a squeeze. */}
                  <div className="w-fit">
                    <HousesTrail houses={houses} />
                  </div>
                </RailSection>
              )}

              <RailSection title={`Reach ${firstName}`}>
                <GetInTouch
                  name={profile.name}
                  methods={contactMethods}
                  vcard={buildVcard(profile, email, phone)}
                />
                <p className="mt-[var(--space-s)] text-[12.5px] leading-[1.6] text-muted-foreground">
                  Email, phone, and socials, all in one place.
                </p>
              </RailSection>

              {links.length > 0 && (
                <RailSection title="Find them">
                  <div className="flex flex-col gap-[var(--space-xs)]">
                    {links.map((link) => (
                      <LinkRow key={link.kind} link={link} />
                    ))}
                  </div>
                </RailSection>
              )}
            </div>
          </aside>

          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div role="tablist" aria-label="Profile sections" className="relative z-10 flex gap-1 pl-[var(--space-m)] sm:pl-[var(--space-l)]">
              {TABS.map((t) => (
                <FolderTab
                  key={t.key}
                  label={t.label}
                  active={tab === t.key}
                  onSelect={() => setTab(t.key)}
                />
              ))}
            </div>

            <div
              className="rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="px-[var(--space-l)] py-[var(--space-l)] xl:px-[var(--space-xl)] xl:py-[var(--space-xl)]">
                <FadeRise key={tab} y={10}>
                  {tab === "about" && (
                    <div className="grid gap-[var(--space-l)] xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:gap-[var(--space-xl)]">
                      <section className="min-w-0">
                        <Eyebrow>In their words</Eyebrow>
                        <p className="mt-[var(--space-s)] max-w-[62ch] font-heading text-[17px] leading-[1.7] text-foreground xl:text-[18.5px]">
                          {profile.about}
                        </p>
                      </section>

                      <section className="min-w-0">
                        <Eyebrow tone="muted">The record</Eyebrow>
                        <dl className="mt-[var(--space-s)] divide-y divide-border/70 border-t border-border">
                          {profile.gradeJoined && profile.yearJoined && (
                            <RecordRow
                              label="Entered"
                              value={`Grade ${profile.gradeJoined}, ${profile.yearJoined}`}
                            />
                          )}
                          {profile.secondaryCity && (
                            <RecordRow label="Also in" value={profile.secondaryCity} />
                          )}
                          <RecordRow label="Their bird" value={profile.speciesName} />
                          {written && <RecordRow label="Written" value={written} />}
                        </dl>
                      </section>
                    </div>
                  )}

                  {tab === "posts" && (
                    <div>{renderEntries(posts, `${firstName} has not posted anything yet.`)}</div>
                  )}

                  {tab === "letters" && (
                    <div>
                      {renderEntries(letters, `${firstName} has not written a letter yet.`)}
                    </div>
                  )}
                </FadeRise>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
