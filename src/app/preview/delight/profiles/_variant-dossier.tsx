"use client";

/* ------------------------------------------------------------------ *
 *  Concept: The House Dossier
 *
 *  A warm archival folder, not a form dump. Physical folder tabs
 *  (Posts / Letters / About / Saved) ARE the section switcher, and
 *  because every tab's content sits inside the same padded paper card,
 *  "About" and "Posts" start at the exact same left edge and the same
 *  Y position structurally - there is no separate rail to drift out of
 *  alignment with the main column. Same discipline applies to the
 *  header itself: the props column (photo mount + admission stamp) is
 *  ordered visually AFTER the identity text on sm+ (`sm:order-2`) so
 *  the name/meta always starts flush at that same left edge instead of
 *  being pushed right by the avatar's width. That is the fix for the
 *  "details vs posts alignment" complaint, not a CSS nudge.
 *
 *  Two signature moments, per the brief, kept deliberately restrained
 *  after a design pass flagged the first cut as skeuomorphic clutter:
 *   1. A paper-clipped "photograph" corner - the bird avatar mounted on
 *      a slightly rotated index card, a species caption underneath like
 *      a specimen label. The paperclip pinned across its edge is now a
 *      quiet ~60%-size, 70%-opacity accent, not a competing prop. It
 *      straightens on hover, as if you reached out and picked it up.
 *   2. The admission number as a stamped archival mark - a cinnamon
 *      double-ruled stamp that thumps into place on load. Never a
 *      hashtag; styled like a library accession number. The "ink
 *      soaked into paper" wash is its own mix-blend-multiply layer,
 *      kept separate from the stroke/numerals so the stamp always
 *      reads as true brand cinnamon (#C2622F), never a blend-shifted,
 *      redder hue.
 *
 *  One CTA, one primary: "Follow" is the Canopy-filled action (this is
 *  a profile, lead with connecting to the person); "Write them a
 *  letter" stays available as a demoted outline pill beside it.
 *
 *  Letters get the exact register the owner singled out as "dang" on
 *  the real Letters page: cinnamon "Letter" eyebrow + Feather icon +
 *  read time, serif body at 17px/1.8. Posts sit in the same ledger but
 *  quieter, so Letters keep reading like the flagship the owner loved.
 *
 *  Content rules honoured: no open-to tags anywhere; admission number
 *  is public but never rendered with "#"; no banner-photo-plus-white-
 *  card header (colour comes from the aged-paper gradient wash, the
 *  ruled ledger lines, and the two stamped/pinned details instead).
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Feather,
  Instagram,
  Linkedin,
  Paperclip,
  MessageCircle,
  Archive,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { Button } from "@/components/ui/button";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import {
  metaParts,
  readMinutes,
  type ProfileVariantProps,
  type MockProfile,
  type MockPost,
  type MockHouseYear,
  type MockLink,
} from "./_data";

/* ------------------------------------------------------------------ *
 *  Aged-paper backdrop: two low-opacity colour washes (cinnamon top
 *  left, canopy bottom right) plus a fine SVG-noise grain, so the page
 *  reads as paper under light rather than a flat token colour. Built
 *  once at module scope - it is a static texture, not per-render work.
 * ------------------------------------------------------------------ */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.05 0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)"/></svg>';

const PAPER_TEXTURE = [
  "radial-gradient(1100px 720px at 8% -14%, rgba(194,98,47,0.11), transparent 55%)",
  "radial-gradient(900px 680px at 106% 120%, rgba(35,92,73,0.09), transparent 58%)",
  `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`,
].join(", ");

/* Folder-tab silhouette: a gentle diagonal bevel on the outer-top corner,
   the one shape every physical file tab shares. Applied via inline style
   so every tab (any width, any breakpoint) gets the identical cut. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

type TabKey = "posts" | "letters" | "about" | "saved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "letters", label: "Letters" },
  { key: "about", label: "About" },
  { key: "saved", label: "Saved" },
];

const CARD_PAD_X = "px-[var(--space-l)] sm:px-[var(--space-xl)]";

/* ------------------------------------------------------------------ *
 *  Small formatting helpers - guard the "undefined to undefined" and
 *  dangling-dot edge cases the real profile spec calls out, even though
 *  the mock data is always complete today.
 * ------------------------------------------------------------------ */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function atRVLine(profile: MockProfile): string | null {
  const { yearJoined, yearLeft, gradeJoined } = profile;
  let years: string | null = null;
  if (yearJoined && yearLeft) years = `${yearJoined}–${yearLeft}`;
  else if (yearJoined) years = `from ${yearJoined}`;
  else if (yearLeft) years = `until ${yearLeft}`;
  if (!years) return null;
  const grade = gradeJoined ? ` · entered in Grade ${gradeJoined}` : "";
  return `At Rishi Valley ${years}${grade}`;
}

function rvYearsValue(profile: MockProfile): string | null {
  const { yearJoined, yearLeft } = profile;
  if (yearJoined && yearLeft) return `${yearJoined}–${yearLeft} · ${yearLeft - yearJoined} years`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

function buildEntryNumbers(posts: MockPost[]): Record<string, number> {
  const byDate = [...posts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const map: Record<string, number> = {};
  byDate.forEach((p, i) => {
    map[p.id] = i + 1;
  });
  return map;
}

/* ------------------------------------------------------------------ *
 *  Section primitives
 * ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">
      {children}
    </p>
  );
}

function RecordRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-[var(--space-s)]">
      <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="mb-[3px] flex-1 border-b border-dotted border-border" />
      <span className="shrink-0 font-heading text-[14.5px] font-semibold tabular-nums leading-none text-foreground">
        {value}
      </span>
    </div>
  );
}

/* Alternating canopy/cinnamon tint so a run of houses reads as distinct
   chapters, without inventing real per-house brand colours. */
const HOUSE_TINTS = [
  "border-canopy/25 bg-canopy/[0.06] text-canopy",
  "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
];

function HousesTimeline({ houses }: { houses: MockHouseYear[] }) {
  if (houses.length === 0) return null;
  return (
    <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-x-2 gap-y-2.5">
      {houses.map((h, i) => (
        <span key={`${h.house}-${h.fromYear}`} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-baseline gap-1.5 rounded-full border px-3.5 py-1.5",
              HOUSE_TINTS[i % HOUSE_TINTS.length]
            )}
          >
            <span className="font-heading text-[13px] font-bold">{h.house}</span>
            <span className="text-[11px] font-semibold tabular-nums opacity-75">
              {h.fromYear}–{h.toYear}
            </span>
          </span>
          {i < houses.length - 1 && (
            <span aria-hidden className="text-[13px] text-muted-foreground/40">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function ContactRow({ link }: { link: MockLink }) {
  const Icon = link.kind === "instagram" ? Instagram : Linkedin;
  return (
    // motion.a directly (not the <SpringPress as="a"> wrapper): SpringPress's
    // prop type is MotionProps only, which doesn't declare href/target/rel,
    // while motion.a natively merges anchor attributes with motion props.
    <motion.a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRINGS.snappy}
      className="inline-flex items-center gap-2.5 rounded-full border border-border bg-mist/70 px-4 py-2 text-[13px] font-semibold text-foreground hover:border-cinnamon/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Icon className="h-[15px] w-[15px] text-cinnamon" aria-hidden />
      {link.label}
      <span className="font-normal text-muted-foreground">{link.handle}</span>
    </motion.a>
  );
}

/* ------------------------------------------------------------------ *
 *  The photo mount - signature moment #1. A small rotated index card
 *  holding the bird, a pinned paperclip, and a specimen-style caption.
 *  Straightens toward true vertical on hover, as if lifted to look at.
 * ------------------------------------------------------------------ */
function PhotoMount({ profile }: { profile: MockProfile }) {
  return (
    <motion.div
      className="relative shrink-0"
      initial={{ rotate: -3.5 }}
      whileHover={{ rotate: 0, scale: 1.035 }}
      whileFocus={{ rotate: 0, scale: 1.035 }}
      transition={SPRINGS.snappy}
      tabIndex={0}
      role="img"
      aria-label={`${profile.name}'s bird, a ${profile.speciesName}`}
    >
      <div
        className="rounded-[var(--radius-md)] border border-border bg-[#FBF8EF] p-[var(--space-s)] pb-[var(--space-xs)]"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.06), 0 16px 30px -22px rgba(35,36,30,0.45)" }}
      >
        <BirdAvatar
          user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
          size="lg"
          ring
        />
        <p className="mt-[var(--space-xs)] text-center font-heading text-[11px] italic tracking-[0.02em] text-muted-foreground">
          {profile.speciesName}
        </p>
      </div>
      {/* Reduced to ~60% of its original size at 70% opacity per design
          review - a hint of the prop, not a gimmick competing with the
          admission stamp for attention. */}
      <Paperclip
        aria-hidden
        className="pointer-events-none absolute -left-[7px] -top-2 h-[22px] w-[22px] text-[#9A9A87] opacity-70 drop-shadow-[0_2px_2px_rgba(35,36,30,0.2)]"
        style={{ transform: "rotate(-24deg)" }}
        strokeWidth={1.8}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 *  The admission stamp - signature moment #2. Styled like a library
 *  accession stamp, thumps into place on mount. Never a hashtag.
 *  Rendered twice: once for the desktop props column, once inline on
 *  mobile, so it never fights the stacked header for space.
 *
 *  The "ink soaked into paper" wash lives on its own absolute layer
 *  with mix-blend-multiply; the stroke and numerals sit on a separate,
 *  un-blended layer straight in `border-cinnamon` / `text-cinnamon`.
 *  Blending the actual ink colour against the card's warm cream tone
 *  was shifting the stamp toward a redder, muddier hue than true brand
 *  cinnamon (#C2622F) - splitting the wash from the stroke keeps the
 *  charm without touching the colour that renders.
 * ------------------------------------------------------------------ */
function AdmissionStamp({ number, className }: { number: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.5, rotate: -16 }}
      animate={{ opacity: 1, scale: 1, rotate: -7 }}
      transition={{ ...SPRINGS.snappy, delay: 0.3 }}
      className={cn("pointer-events-none relative select-none", className)}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[6px] bg-cinnamon/[0.08]"
        style={{ mixBlendMode: "multiply" }}
      />
      <div className="relative rounded-[6px] border-[1.5px] border-cinnamon px-4 py-2 text-center">
        <span aria-hidden className="absolute inset-[3px] rounded-[3px] border border-cinnamon/70" />
        <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-cinnamon">Admission No.</p>
        <p className="mt-0.5 font-heading text-[20px] font-bold leading-none tracking-[0.02em] text-cinnamon">
          {number}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 *  Folder tabs - the section switcher IS the alignment fix. Active tab
 *  matches the folder body's colour and sits flush against it; inactive
 *  tabs sit a few px lower and a shade darker, like a fanned stack of
 *  folders underneath. One motion element owns the whole transform
 *  (position + press), so a static Tailwind translate class never gets
 *  clobbered by framer's inline transform.
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
      whileHover={{ y: active ? 0 : 2 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.snappy}
      style={{ clipPath: TAB_CLIP }}
      className={cn(
        "relative min-w-[72px] shrink-0 px-4 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11.5px] font-bold uppercase tracking-[0.08em] outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-w-[92px] sm:px-5 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ *
 *  Ledger entries - one row shape shared by Posts, Letters and Saved,
 *  so the folder always reads as a single continuous record. Letters
 *  get the exact register from the real Letters page (cinnamon eyebrow,
 *  Feather icon, read time, serif body at 17px/1.8): that page is the
 *  "dang" bar, so the flagship content type here matches it verbatim.
 *  No avatar/name repeated per entry - it is this person's own record,
 *  repeating their identity on every row would be the redundant-facts
 *  clutter the owner is pushing back on, not a fix for it.
 * ------------------------------------------------------------------ */
function LedgerEntry({
  post,
  entryNo,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
  saved,
  onToggleSave,
}: {
  post: MockPost;
  entryNo: number;
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
        "py-[var(--space-l)]",
        !isFirst && "border-t border-dashed border-border"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.12em]",
          isLetter ? "text-cinnamon" : "text-muted-foreground"
        )}
      >
        {isLetter && <Feather className="h-3.5 w-3.5" />}
        {isLetter ? "Letter" : "Post"}
        <span className="opacity-60">&middot; Entry {String(entryNo).padStart(2, "0")}</span>
        <span className="opacity-60">&middot; {formatDate(post.createdAt)}</span>
        {isLetter && <span className="opacity-60">&middot; {readMinutes(post.content)} min read</span>}
      </div>

      {isLetter && post.title && (
        <h3 className="mt-[var(--space-xs)] font-heading text-[21px] font-bold leading-[1.15] tracking-[-0.015em] text-foreground sm:text-[23px]">
          {post.title}
        </h3>
      )}

      <div
        className={cn(
          "mt-[var(--space-s)] whitespace-pre-wrap text-foreground",
          isLetter
            ? "max-w-[70ch] font-heading text-[16.5px] leading-[1.8]"
            : "max-w-[64ch] font-sans text-[15px] leading-[1.7]"
        )}
      >
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
          id={`dossier-${post.id}`}
          className="ml-auto"
          label={saved ? "Remove from saved" : "File in Saved"}
        />
      </div>
    </article>
  );
}

function EmptyLedger({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border/80 bg-mist/40 px-6 py-[var(--space-xxl)] text-center">
      <Archive className="h-6 w-6 text-muted-foreground/45" aria-hidden />
      <p className="max-w-[38ch] text-[13.5px] leading-[1.6] text-muted-foreground">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Main
 * ------------------------------------------------------------------ */
export default function DossierVariant({ profile }: ProfileVariantProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState(false);
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  const entryNumbers = buildEntryNumbers(profile.posts);
  const postEntries = profile.posts.filter((p) => p.kind === "post");
  const letterEntries = profile.posts.filter((p) => p.kind === "letter");
  const savedEntries = profile.posts.filter((p) => savedIds.has(p.id));

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
        [id]: { liked: !current.liked, count: current.liked ? current.count - 1 : current.count + 1 },
      };
    });
  }

  function renderEntries(entries: MockPost[], emptyText: string) {
    if (entries.length === 0) return <EmptyLedger text={emptyText} />;
    return entries.map((post, i) => (
      <LedgerEntry
        key={post.id}
        post={post}
        entryNo={entryNumbers[post.id]}
        isFirst={i === 0}
        liked={likes[post.id].liked}
        likeCount={likes[post.id].count}
        onToggleLike={() => toggleLike(post.id)}
        saved={savedIds.has(post.id)}
        onToggleSave={() => toggleSave(post.id)}
      />
    ));
  }

  const meta = metaParts(profile);
  const rvLine = atRVLine(profile);
  const houses = profile.houses ?? [];
  const links = profile.links ?? [];

  return (
    <div
      className="w-full"
      style={{ backgroundColor: "var(--color-background)", backgroundImage: PAPER_TEXTURE }}
    >
      <div className="mx-auto w-full max-w-[820px] px-4 py-[var(--space-xl)] sm:px-6 sm:py-[var(--space-xxl)]">
        {/* Folder tabs */}
        <div role="tablist" aria-label="Profile sections" className="relative z-10 flex gap-1 pl-[var(--space-m)] sm:pl-[var(--space-l)]">
          {TABS.map((tab) => (
            <FolderTab
              key={tab.key}
              label={tab.label}
              active={activeTab === tab.key}
              onSelect={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        {/* Folder body - one continuous paper card, top squared off where
            the tabs attach, so switching tabs never changes the left edge
            or the top Y of the content beneath the header. */}
        <div
          className="relative rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
          style={{ boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.5)" }}
        >
          <div className={cn(CARD_PAD_X, "pt-[var(--space-l)] sm:pt-[var(--space-xl)]")}>
            {/* Header record. The props column (photo mount + desktop
                admission stamp) is ordered AFTER the identity column on
                sm+ via `sm:order-2` while staying first in the DOM (so
                mobile, which stacks it above the text, is untouched).
                That keeps the identity text's left edge flush against
                the card's padding edge on every breakpoint - the same X
                every ledger entry below starts at - instead of being
                pushed right by the avatar's width. */}
            <div className="flex flex-col items-start gap-[var(--space-l)] sm:flex-row sm:gap-[var(--space-l)]">
              <div className="order-1 flex shrink-0 flex-col items-start gap-[var(--space-s)] sm:order-2 sm:items-end">
                <PhotoMount profile={profile} />
                {profile.admissionNumber && (
                  <AdmissionStamp number={profile.admissionNumber} className="hidden sm:block" />
                )}
              </div>

              <div className="order-2 min-w-0 flex-1 sm:order-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[34px]">
                    {profile.name}
                  </h1>
                  <VerifiedMark
                    user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
                    size={18}
                  />
                </div>

                {meta.length > 0 && (
                  <p className="mt-[var(--space-xs)] text-[14px] text-muted-foreground">
                    {meta.join(" · ")}
                  </p>
                )}

                {rvLine && (
                  <p className="mt-[var(--space-xs)] text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
                    {rvLine}
                  </p>
                )}

                {profile.admissionNumber && (
                  <AdmissionStamp
                    number={profile.admissionNumber}
                    className="mt-[var(--space-m)] inline-block sm:hidden"
                  />
                )}

                {/* Follow is the profile's one real relationship action, so
                    it carries the Canopy fill; "Write them a letter" stays
                    available but demoted to an outline pill, since a
                    profile page should lead with connecting to the person,
                    not with composing content. */}
                <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="default"
                    aria-pressed={following}
                    onClick={() => setFollowing((v) => !v)}
                  >
                    {following ? <UserCheck /> : <UserPlus />}
                    {following ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline">
                    <Feather /> Write them a letter
                  </Button>
                </div>
              </div>
            </div>

            <div className="my-[var(--space-l)] border-t border-dashed border-border sm:my-[var(--space-xl)]" />

            {/* Active tab panel - shares the exact padding above, so About's
                facts and Posts' entries always start at the same X and Y. */}
            <FadeRise key={activeTab} y={10} className="pb-[var(--space-l)] sm:pb-[var(--space-xl)]">
              {activeTab === "posts" &&
                renderEntries(postEntries, `No posts filed here yet from ${profile.name.split(" ")[0]}.`)}

              {activeTab === "letters" &&
                renderEntries(letterEntries, `No letters filed here yet from ${profile.name.split(" ")[0]}.`)}

              {activeTab === "about" && (
                <div>
                  <section>
                    <SectionLabel>In their words</SectionLabel>
                    <p className="mt-[var(--space-s)] max-w-[62ch] font-heading text-[16.5px] leading-[1.78] text-foreground">
                      {profile.about}
                    </p>
                  </section>

                  <section className="mt-[var(--space-xl)]">
                    <SectionLabel>The record</SectionLabel>
                    <div className="mt-[var(--space-s)] divide-y divide-border/60">
                      {rvYearsValue(profile) && <RecordRow label="At Rishi Valley" value={rvYearsValue(profile)} />}
                      {profile.gradeJoined && <RecordRow label="Entered" value={`Grade ${profile.gradeJoined}`} />}
                      <RecordRow label="Based in" value={profile.currentCity} />
                      {profile.secondaryCity && <RecordRow label="Also in" value={profile.secondaryCity} />}
                      {profile.admissionNumber && (
                        <RecordRow label="Admission no." value={profile.admissionNumber} />
                      )}
                    </div>
                    <HousesTimeline houses={houses} />
                  </section>

                  {links.length > 0 && (
                    <section className="mt-[var(--space-xl)]">
                      <SectionLabel>Find them</SectionLabel>
                      <div className="mt-[var(--space-s)] flex flex-wrap gap-2.5">
                        {links.map((link) => (
                          <ContactRow key={link.kind} link={link} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeTab === "saved" && (
                <div>
                  <p className="mb-[var(--space-m)] text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
                    Visible only to {profile.name.split(" ")[0]}
                  </p>
                  {savedEntries.length === 0 ? (
                    <EmptyLedger text="Nothing filed here yet. Tap the ribbon on any post or letter to keep it in this folder." />
                  ) : (
                    renderEntries(savedEntries, "")
                  )}
                </div>
              )}
            </FadeRise>
          </div>
        </div>
      </div>
    </div>
  );
}
