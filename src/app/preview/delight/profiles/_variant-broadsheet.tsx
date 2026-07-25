"use client";

/* ------------------------------------------------------------------ *
 *  Concept B: BROADSHEET
 *
 *  A newspaper front page. The person's name IS the nameplate: Libre
 *  Baskerville at up to 72px with -0.035em tracking, sitting across the
 *  top of the sheet with the lead photograph beside it. Under the
 *  nameplate runs a dateline strip (Batch / In the valley / Based in /
 *  Admission) divided by solid vertical hairlines, exactly where a paper
 *  prints "Vol. CXXIV, No. 42 | Monday | Fifty paise". Then the body: a
 *  wide article column carrying the folder tabs (About first and
 *  default), and a rail holding the contact actions and the record.
 *
 *  The sheet opens on the NAME. There is no "Rishi Valley" / "Profile"
 *  kicker above it any more (owner: "remove Rishi Valley and Profile
 *  from broadsheet, they know that"), and nothing took its place.
 *
 *  FOUR DECISIONS WORTH THE NOTE:
 *
 *  1. This concept owns no page chrome. The harness now renders it
 *     inside the real app frame: flush green sidebar, the faint valley
 *     back-layer, a <main> capped at 1280 with its own gutters. So there
 *     is no background of its own, no max-width wrapper, and no
 *     full-bleed margin fighting the shell. The outermost element is a
 *     plain block that fills whatever the shell gives it.
 *
 *  2. The photo is 21:9 EXACTLY, at every width, and is never full
 *     content width on desktop. A 1100px-wide frame capped at 300px tall
 *     is a 3.7:1 band, which is the "magnified sliver" the owner
 *     rejected. So the masthead splits at md into [name | photo], the
 *     photo taking 40% of the sheet: 286px wide on a tablet, 445px at
 *     1440, and therefore 122px to 190px tall. Always 21:9, always well
 *     under the ~300px the brief asks for, always art-directed at
 *     50% 35%, and it ends on a clean square edge with no rule, no
 *     gradient and no fade. Full width on a phone, where 21:9 is only
 *     153px tall and reads as a proper picture.
 *
 *  3. ONE TYPE LADDER, the app's: body 15px/1.7, small 13.5px,
 *     secondary 12.5-13px, labels 10.5-11px uppercase. Libre Baskerville
 *     is the NAME, the section headings and a letter's title, and
 *     nothing else: every paragraph here is sans at 15px, the same as a
 *     post body. About used to be serif at 17px, which read as a mistake
 *     rather than as emphasis (owner: "the font size of About seems
 *     obnoxiously big and not in fitting with everything else").
 *
 *  4. Houses are a footnote, not a section. The chain is the owner's
 *     favourite element but, in their words, "house is just a fun thing,
 *     it's not that important... don't give it so much space." So it is
 *     one quiet strip at the foot of About under a 10.5px label, drawn
 *     by the SHIPPED component, never a rail block or a band of its own.
 *
 *  Email and phone are not on this page. They live inside the shared
 *  GetInTouch dialog (the same control the real profile ships), one
 *  click from the rail, alongside Save contact (.vcf).
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
        "text-[10.5px] font-bold uppercase tracking-[0.16em]",
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
 *  (a newspaper does not round its pictures) and a hairline frame. The
 *  picture ENDS THERE: the cinnamon rule that used to run under it is
 *  gone (owner: "remove the cinnamon bar under the pic in broadsheet"),
 *  and there was never a gradient or a fade into the sheet.
 *  The upload slot is visibly designed: a Change photo control sits on
 *  the picture, since this is the owner's own profile view.
 * ------------------------------------------------------------------ */
function LeadPhoto({ profile }: { profile: MockProfile }) {
  return (
    // max-w is a guard, not the usual case: the shell caps the sheet at 1280,
    // so the 40% column lands ~445px at 1440 and the frame stays ~190px tall.
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
          <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {fact.label}
          </dt>
          {/* A fact is data, not a heading: sans at the body size, the same
              15px every other value on the sheet is set in. It used to be
              serif at 17/18px, a size that exists nowhere else in the app. */}
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
        <span className="block truncate text-[12.5px] leading-tight text-muted-foreground">
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
            what a post body and the About prose use. A letter used to be
            serif at 16.5px and a post sans at 15.5px, three near-duplicate
            settings for the same job. The letter still reads as a letter,
            from its cinnamon eyebrow, its feather and its serif title. */}
        <div className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7]">
          <div className="whitespace-pre-wrap text-foreground">{post.content}</div>

          <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 text-muted-foreground">
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
      <dt className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[13.5px] font-semibold leading-snug text-foreground">
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
      {/* ---------------- MASTHEAD ---------------- */}
      <header>
        <FadeRise y={12}>
          <div className="grid gap-[var(--space-m)] md:grid-cols-[minmax(0,1fr)_minmax(0,40%)] md:items-end md:gap-[var(--space-l)]">
            <div className="min-w-0 md:col-start-1 md:row-start-1">
              {/* The verified leaf rides with the NAME, the way the shipped
                  header does it. Parked at the end of the deck line it kept
                  wrapping onto a line of its own on a phone, a lone leaf
                  floating under the sentence. */}
              {/* The sheet is ~328px narrower than the window now (sidebar plus
                  the shell's gutters), so the nameplate is sized off the SHEET,
                  not the viewport: 6.5cqw is 56px once the sheet passes 860px
                  (a 1190 window) and hits the 72px cap at 1110px of sheet (a
                  1440 window). vw would have set 72px while the sheet was still
                  700px wide. */}
              <h1 className="flex flex-wrap items-center gap-x-3 font-heading text-[clamp(2.25rem,6.5cqw,4.5rem)] font-bold leading-[0.95] tracking-[-0.035em] text-foreground">
                <span className="min-w-0">{profile.name}</span>
                <VerifiedMark
                  user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                  size={20}
                />
              </h1>

              {/* The species name is NOT printed. Owner: "don't write the bird
                  species anywhere, it's not that important, they can see it by
                  clicking the bird." It survives only in the button's
                  aria-label, for someone who cannot see the glyph at all. */}
              <div className="mt-[var(--space-m)] flex items-center gap-[var(--space-s)] md:mt-[var(--space-l)]">
                <ChirpBird profile={profile} />
                <p className="min-w-0 text-[15px] leading-[1.7] text-foreground">{deck}</p>
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
          One grid. Below xl the rail is DOM-first, so its contents read above
          the tabs; from xl it is placed into column two and the article column
          takes column one. The rail sticks, and never scrolls inside itself.

          xl, not lg: inside the shell a 1024 window is only 696px of sheet, and
          splitting that would leave an article column too narrow to set a
          paragraph in. The masthead still splits at md, so a tablet is never
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
                Email, phone, and socials, all in one place.
              </p>
            </RailSection>

            <RailSection title="The record">
              <dl className="divide-y divide-border/70">
                {profile.gradeJoined && profile.yearJoined && (
                  <RecordRow
                    label="Entered"
                    value={`Grade ${profile.gradeJoined}, ${profile.yearJoined}`}
                  />
                )}
                {profile.secondaryCity && <RecordRow label="Also in" value={profile.secondaryCity} />}
                {written && <RecordRow label="Written" value={written} />}
              </dl>
            </RailSection>
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
                    <div className="grid gap-[var(--space-l)] min-[1400px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                      <section className="min-w-0">
                        {/* "About", the name the app standardised on this round.
                            Sans at 15px/1.7, the same setting as a post body:
                            this was serif at 17px, a typeface and a size and a
                            half above every other paragraph, which read as a
                            mistake rather than as emphasis. */}
                        <Eyebrow>About</Eyebrow>
                        <p className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7] text-foreground">
                          {profile.about}
                        </p>
                      </section>

                      {links.length > 0 && (
                        <section className="min-w-0">
                          <Eyebrow>Find them</Eyebrow>
                          {/* Capped: below 1400 this section is full panel width,
                              and a two-line row stretched to 570px is mostly
                              empty rule. */}
                          <div className="mt-[var(--space-s)] flex max-w-[340px] flex-col gap-[var(--space-xs)]">
                            {links.map((link) => (
                              <LinkRow key={link.kind} link={link} />
                            ))}
                          </div>
                        </section>
                      )}
                    </div>

                    {/* HOUSES: a footnote, not a feature. One quiet label at the
                        same 10.5px as every other minor label, no heading, no
                        subtitle, no band of its own, and the shipped pills drawn
                        by the shipped component. Owner: "house is just a fun
                        thing, it's not that important, you're making it 50% of
                        the profile. Don't give it so much space."

                        It lives at the foot of the panel because the shared
                        trail picks four pills per row on any desktop viewport,
                        which needs ~530px of run: in the 300px rail those rows
                        would have burst straight out of the card. */}
                    {houses.length > 0 && (
                      <div className="mt-[var(--space-l)] border-t border-border pt-[var(--space-m)]">
                        <Eyebrow tone="muted">Houses</Eyebrow>
                        {/* w-fit only ever makes the chain NARROWER: the shared
                            trail stretches a full row edge to edge so its U-turn
                            lands on the container's edge, so in a container
                            wider than the pills need the arrows stretch out. On
                            a phone this pulls the two-pill rows back together. */}
                        <div className="mt-[var(--space-s)] w-fit">
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
