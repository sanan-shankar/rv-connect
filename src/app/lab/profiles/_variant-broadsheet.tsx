"use client";

/* ------------------------------------------------------------------ *
 *  Concept B: BROADSHEET
 *
 *  A newspaper front page. The masthead is the person: their name set in
 *  Libre Baskerville across the sheet, the deck under it saying what
 *  they do and where, the lead photograph beside it, and the admission
 *  stamp pressed into the bottom-left corner the way an archive stamps a
 *  filed edition. A dateline strip runs under all of it (Batch / In the
 *  valley / Cities) exactly where a paper prints "Vol. CXXIV, No. 42 |
 *  Monday | Fifty paise". Then the body: a wide article column carrying
 *  the folder tabs (About first and default), and a rail holding the one
 *  way to reach them.
 *
 *  THE DECISIONS WORTH THE NOTE:
 *
 *  1. This concept owns no page chrome. The harness renders it inside
 *     the real app frame: flush green sidebar, the faint valley
 *     back-layer, a <main> capped at 1280 with its own gutters. So there
 *     is no background of its own, no max-width wrapper, and no
 *     full-bleed margin fighting the shell.
 *
 *  2. THE NAME IS NO LONGER SHOUTING. It ran to 72px, which the owner
 *     read as overboard. It is now clamp(2rem, 4.4cqw, 3.25rem): 32px on
 *     a phone, ~49px at a 1440 window, 52px at the cap. Still comfortably
 *     the largest thing on the sheet (a letter's title is 30px), but a
 *     headline rather than a hoarding.
 *
 *  3. THE PHOTOGRAPH BELONGS TO THE MASTHEAD, it is not parked in the
 *     corner. Three ties, no chrome added to make them:
 *       - It is a grid item in the masthead row, so its TOP edge starts
 *         at the name's cap line.
 *       - The masthead row has no bottom gap on desktop, so the picture's
 *         BOTTOM edge lands on the dateline's top rule; the frame drops
 *         its own bottom border there (`lg:border-b-0`) and the dateline
 *         rule runs out from under the type to finish the picture. One
 *         continuous hairline, shared between the two.
 *       - Its LEFT edge sits at exactly two thirds of the sheet, which is
 *         where the dateline's third divider falls, so the hairline down
 *         the side of the picture and the hairline between the last two
 *         facts are one line. See the note on the masthead grid.
 *       - The admission stamp takes `mt-auto` to the foot of the left
 *         column, so the corner the type ends on and the corner the
 *         picture ends on are the same corner, on the same rule.
 *     No border was added, no frame, no coloured bar (the cinnamon bar
 *     under the picture was struck last round for exactly that reason).
 *     The frame is 3:2, the most of a portrait source any landscape crop
 *     here can honestly show, art-directed at 50% 35%.
 *
 *  4. NOTHING CONTACTABLE IS PRINTED. There is no social row on the
 *     sheet at all. Email, phone, Instagram and LinkedIn all live inside
 *     the shared Get in touch dialog, one click from the rail, next to
 *     Save contact (.vcf). Owner: "only when you say contact them does
 *     their email and number and stuff come out. That's how it should be
 *     everywhere", and "the LinkedIn and IG don't need to be there
 *     outside AND inside".
 *
 *  5. THE ADMISSION NUMBER IS AN ARTEFACT, not a column in a strip. It
 *     used to be the fourth plain fact in the dateline. It is now the
 *     shipped cinnamon double-ruled stamp, tilted, sitting in the
 *     masthead where a paper carries its edition mark.
 *
 *  6. ONE TYPE LADDER, the app's: body 15px/1.7, small 13.5px, secondary
 *     12.5-13px, labels 10.5-11px uppercase. Libre Baskerville is the
 *     NAME, the section headings and a letter's title, nothing else.
 *
 *  7. Houses are a footnote, not a section. The chain is the owner's
 *     favourite element but, in their words, "house is just a fun thing,
 *     it's not that important... don't give it so much space." So it is
 *     one quiet strip at the foot of About under a 10.5px label, drawn
 *     bare by the SHIPPED component with no wrapper of its own.
 *
 *  Hover never moves anything here: no translate, no scale, no
 *  whileHover. Hover is a colour change. The press sink on :active stays,
 *  because that is feedback for a click you made.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Feather, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { FadeRise, SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { HousesTrail } from "./_houses-trail";
import {
  readMinutes,
  type MockPost,
  type MockProfile,
  type ProfileVariantProps,
} from "./_data";

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

/* The dateline holds at most three facts, so its desktop column count is
   a small lookup of literal classes rather than an arbitrary value. */
const DATELINE_COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

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
        "text-[10.5px] font-bold uppercase tracking-[0.16em]",
        tone === "cinnamon" ? "text-cinnamon" : "text-muted-foreground"
      )}
    >
      {children}
    </p>
  );
}

/**
 * The deck: what they do and who they do it for, sitting with the name
 * the way a newspaper's deck sits under its headline. Owner: "let the
 * subtitle to the name be the occupation and organisation." The job
 * carries the weight, the workplace follows it quietly; the city is NOT
 * here (owner: "don't have the city under the name, it's not that
 * important") and neither is the batch, which moved to the dateline.
 */
function Deck({ profile }: { profile: MockProfile }) {
  const { jobTitle, workplace } = profile;
  if (!jobTitle && !workplace) return null;

  return (
    <p className="min-w-0 text-[15px] leading-[1.6] text-muted-foreground">
      {jobTitle && <span className="font-semibold text-foreground">{jobTitle}</span>}
      {jobTitle && workplace ? " at " : null}
      {workplace}
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
 *  The lead photograph. A grid item in the masthead row, not a picture
 *  pasted into the corner: its top edge starts at the name's cap line
 *  and its bottom edge lands on the dateline rule, which runs out from
 *  under the type and finishes the frame (hence `lg:border-b-0`: the two
 *  share one hairline instead of stacking two).
 *
 *  3:2 and hard square edges: a newspaper does not round its pictures,
 *  and the source is a 900x1300 portrait, so 3:2 is the most of the
 *  frame any landscape crop can honestly show. No gradient, no fade.
 *  The upload slot is visibly designed: a Change photo control sits on
 *  the picture, since this is the owner's own profile view.
 * ------------------------------------------------------------------ */
function LeadPhoto({ profile }: { profile: MockProfile }) {
  return (
    <figure className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-end">
      <div className="relative aspect-[3/2] w-full overflow-hidden border border-border bg-mist lg:border-b-0">
        {profile.coverPhoto ? (
          <Image
            src={profile.coverPhoto}
            alt={`The picture ${profile.name.split(" ")[0]} chose for their profile`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 400px"
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
          className="glass absolute right-[var(--space-s)] top-[var(--space-s)] inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] font-semibold text-foreground outline-none transition-[background-color,color,transform] duration-150 hover:bg-card hover:text-cinnamon focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
        >
          <Camera className="h-3.5 w-3.5 text-cinnamon" aria-hidden />
          Change photo
        </button>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 *  Dateline. The facts a paper prints beside its date, divided by SOLID
 *  vertical hairlines; on a phone it folds to two columns with a
 *  horizontal hairline between the rows.
 *
 *  Batch lives HERE, not next to the name (owner: "batch doesn't have to
 *  be that close to the name, it can be elsewhere"). The city column is
 *  labelled by how many cities there actually are, never "Based in",
 *  which promises one place to people who have two. Admission is not in
 *  this strip at all any more: it is the stamp up in the masthead.
 * ------------------------------------------------------------------ */
function Dateline({ facts }: { facts: { label: string; value: string }[] }) {
  const last = facts.length - 1;

  return (
    <dl className={cn("grid grid-cols-2 border-y border-border", DATELINE_COLUMNS[facts.length])}>
      {facts.map((fact, i) => (
        <div
          key={fact.label}
          className={cn(
            "min-w-0 border-border py-[var(--space-m)] pr-[var(--space-m)]",
            // Phone: a divider left of every second cell, a rule above row two,
            // and an odd last fact spanning the full width rather than
            // stranding half a column of nothing beside it.
            i % 2 === 1 ? "border-l pl-[var(--space-m)]" : "pl-0",
            i >= 2 && "border-t",
            i === last && facts.length % 2 === 1 && i > 0 && "col-span-2",
            // Desktop: one row, a divider before every cell but the first.
            "sm:col-span-1 sm:border-t-0",
            i === 0 ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:pl-[var(--space-m)]"
          )}
        >
          <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {fact.label}
          </dt>
          {/* A fact is data, not a heading: sans at the body size, the same
              15px every other value on the sheet is set in. */}
          <dd className="mt-[var(--space-xxs)] truncate text-[15px] font-semibold leading-snug text-foreground">
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
        // Sizes match the shipped ProfileShell tab exactly (11px, 13px from sm).
        "relative shrink-0 px-5 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11px] font-bold uppercase tracking-[0.09em] outline-none transition-colors duration-150 focus-visible:shadow-[inset_0_0_0_2px_var(--color-leaf)] sm:px-7 sm:text-[13px]",
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
 *  A labelled rail section.
 * ------------------------------------------------------------------ */
function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="p-[var(--space-m)]">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-[var(--space-s)]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Article entries. Posts and letters share one shape, with a date
 *  gutter on the left the way a paper stamps its filed pieces, and the
 *  letter given the exact register of the real Letters page: cinnamon
 *  eyebrow, feather, read time, serif title.
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
        "grid gap-[var(--space-s)] sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-[var(--space-l)]",
        first ? "pt-0" : "mt-[var(--space-l)] border-t border-border pt-[var(--space-l)]"
      )}
    >
      <div className="flex items-baseline gap-2 sm:flex-col sm:items-start sm:gap-1">
        <span className="text-[13.5px] font-bold leading-none text-foreground">{day}</span>
        <span className="text-[12.5px] leading-none tabular-nums text-muted-foreground">{year}</span>
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.16em]",
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
            alone left the bookmark stranded 200px past the last word.

            One body setting for both kinds: sans, 15px/1.7, 64ch, exactly
            what a post body and the About prose use. The letter still reads
            as a letter, from its cinnamon eyebrow, its feather and its serif
            title. */}
        <div className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7]">
          <div className="whitespace-pre-wrap text-foreground">{post.content}</div>

          <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 text-muted-foreground">
            <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} label="Like" />
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
  const houses = profile.houses ?? [];
  const links = profile.links ?? [];
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");

  const { email, phone } = contactFor(profile);
  // Every reachable thing, in ONE place, behind ONE button. Nothing in this
  // list is printed on the sheet: not the email, not the phone, and since
  // this round not Instagram or LinkedIn either.
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

  // Two cities is the common case, so the label counts them rather than
  // promising one. Never "Based in".
  const cities = [profile.currentCity, profile.secondaryCity].filter((c): c is string =>
    Boolean(c)
  );

  const facts = [
    { label: "Batch", value: batchLabel(profile) },
    { label: "In the valley", value: valleyYears(profile) },
    { label: cities.length > 1 ? "Cities" : "City", value: cities.join(", ") || null },
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
    // No background, no max-width, no gutters of its own: the harness already
    // renders this inside the app frame (sidebar, valley back-layer, a <main>
    // capped at 1280 with px-5/7/10). A wrapper here would fight the shell.
    //
    // overflow-x-clip, not hidden: VerifiedMark keeps its hover label in the DOM
    // at opacity 0 and only measures which side to flip to when it opens, so the
    // hidden label sat 60px past the right edge of a 390 phone and gave the whole
    // page a sideways scroll. `clip` is not a scroll container, so the rail's
    // sticky still resolves against the viewport; `hidden` would have killed it.
    // @container: the nameplate is sized off THIS sheet, not the window.
    <div className="@container w-full overflow-x-clip">
      {/* ---------------- MASTHEAD ----------------
          One row, two columns, ruled top and bottom by the same two lines:
          the name's cap line and the dateline. See note 3 at the top of the
          file for why the picture is a grid item here rather than a floated
          image with a gap around it. */}
      <header>
        <FadeRise y={12}>
          {/* A third of the sheet for the picture, and the third is not
              arbitrary: whatever the column gap is, a `[1fr, 33.333%]` track
              puts the picture's left edge at exactly 2/3 of the sheet, which
              is where the dateline's third divider falls. The hairline down
              the left of the photograph and the hairline between the last two
              facts are the same line, continued. That plus the shared bottom
              rule is what stops the picture reading as pasted into a corner. */}
          <div className="grid gap-[var(--space-l)] lg:grid-cols-[minmax(0,1fr)_minmax(0,33.333%)] lg:items-stretch lg:gap-[var(--space-xl)]">
            <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:pb-[var(--space-m)]">
              {/* The verified leaf rides with the NAME, the way the shipped
                  header does it. Parked at the end of the deck line it kept
                  wrapping onto a line of its own on a phone, a lone leaf
                  floating under the sentence.

                  Sized off the SHEET, not the window (the sheet is ~328px
                  narrower than the viewport once the sidebar and gutters are
                  paid for): 4.4cqw is ~49px at a 1440 window and reaches the
                  52px cap at the shell's 1200px maximum. It was 72px, which
                  the owner called overboard. */}
              <h1 className="flex flex-wrap items-center gap-x-3 font-heading text-[clamp(2rem,4.4cqw,3.25rem)] font-bold leading-[1.0] tracking-[-0.035em] text-foreground">
                <span className="min-w-0">{profile.name}</span>
                <VerifiedMark
                  user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                  size={20}
                />
              </h1>

              {/* The deck stays WITH the name, one step under it, because
                  that is what the owner asked the line to be: "let the
                  subtitle to the name be the occupation and organisation...
                  let those be positioned somewhere near".

                  The species name is NOT printed. Owner: "don't write the bird
                  species anywhere, it's not that important, they can see it by
                  clicking the bird." It survives only in the button's
                  aria-label, for someone who cannot see the glyph at all. */}
              <div className="mt-[var(--space-m)] flex items-center gap-[var(--space-s)]">
                <ChirpBird profile={profile} />
                <Deck profile={profile} />
              </div>

              {/* The admission number, given the one treatment the owner asked
                  for: not a labelled fact in a row but the shipped cinnamon
                  double-ruled stamp, tilted, pressed into the bottom-left
                  corner of the sheet where a paper carries its edition mark.
                  `mt-auto` sends it to the foot of the column, so the corner
                  the type ends on and the corner the picture ends on are the
                  same corner, on the same rule. */}
              {profile.admissionNumber !== null && (
                // The spacing lives on this wrapper, never on the stamp: the
                // stamp's ink wash is an `absolute inset-0` layer, so padding
                // passed to it would print a pale rectangle above the rule.
                <div className="mt-[var(--space-l)] lg:mt-auto lg:pt-[var(--space-l)]">
                  <AdmissionStamp number={profile.admissionNumber} className="ml-1 w-fit" />
                </div>
              )}
            </div>

            <LeadPhoto profile={profile} />
          </div>
        </FadeRise>

        {/* ---------------- DATELINE ----------------
            No top margin from lg: the strip's top rule IS the picture's
            bottom edge. On a phone the picture keeps its own full border and
            the strip sits below it with normal air. */}
        <div className="mt-[var(--space-m)] lg:mt-0">
          <Dateline facts={facts} />
        </div>
      </header>

      {/* ---------------- BODY ----------------
          One grid. Below xl the rail is DOM-first, so its contents read above
          the tabs; from xl it is placed into column two and the article column
          takes column one. The rail sticks, and never scrolls inside itself.

          xl, not lg: inside the shell a 1024 window is only 696px of sheet, and
          splitting that would leave an article column too narrow to set a
          paragraph in. The masthead still splits at lg, so a laptop is never
          just the phone layout stretched. */}
      <div className="mt-[var(--space-l)] grid gap-[var(--space-l)] sm:mt-[var(--space-xl)] xl:grid-cols-[minmax(0,1fr)_300px]">
        <aside className="min-w-0 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-[var(--space-l)] xl:self-start">
          <div
            className="divide-y divide-border rounded-[var(--radius-xl)] border border-border bg-card"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <RailSection title={`Reach ${firstName}`}>
              <GetInTouch
                name={profile.name}
                methods={contactMethods}
                vcard={buildVcard(profile, email, phone)}
              />
              <p className="mt-[var(--space-s)] text-[12.5px] leading-[1.6] text-muted-foreground">
                {links.length > 0
                  ? "Email, phone and socials, all in one place."
                  : "Email and phone, shown when you ask."}
              </p>
            </RailSection>

            {written && (
              <RailSection title="Written">
                <p className="text-[13.5px] font-semibold leading-snug text-foreground">{written}</p>
              </RailSection>
            )}
          </div>
        </aside>

        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
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
            <div className="p-[var(--space-l)] min-[1400px]:p-[var(--space-xl)]">
              <FadeRise key={tab} y={10}>
                {tab === "about" && (
                  <div>
                    {/* "About", the name the app standardised on this round.
                        Sans at 15px/1.7, the same setting as a post body. The
                        social row that used to sit beside this is gone: nothing
                        contactable is printed on the sheet any more. */}
                    <section className="min-w-0">
                      <Eyebrow>About</Eyebrow>
                      <p className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7] text-foreground">
                        {profile.about}
                      </p>
                    </section>

                    {/* HOUSES: a footnote, not a feature. One quiet label at the
                        same 10.5px as every other minor label, no heading, no
                        subtitle, no band of its own, and the shipped component
                        rendered bare (it sets its own width and spacing; a
                        wrapper here would only fight it). Owner: "house is just
                        a fun thing, it's not that important, you're making it
                        50% of the profile. Don't give it so much space."

                        It lives at the foot of the panel because the shared
                        trail picks four pills per row on any desktop viewport,
                        which needs ~530px of run: in the 300px rail those rows
                        would have burst straight out of the card. */}
                    {houses.length > 0 && (
                      <div className="mt-[var(--space-l)] border-t border-border pt-[var(--space-m)]">
                        <Eyebrow tone="muted">Houses</Eyebrow>
                        <div className="mt-[var(--space-s)]">
                          <HousesTrail houses={houses} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "posts" && (
                  <div>{renderEntries(posts, `${firstName} has not posted anything yet.`)}</div>
                )}

                {tab === "letters" && (
                  <div>{renderEntries(letters, `${firstName} has not written a letter yet.`)}</div>
                )}
              </FadeRise>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
