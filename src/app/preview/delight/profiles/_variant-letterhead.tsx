"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Letterhead
 *
 *  The profile as a piece of personal stationery — quality paper, an
 *  engraved rule, a small institutional colophon top-left — but the
 *  content on it reads as a PROFILE, not a letter: a scannable fact
 *  grid (batch / city / profession / house / years / admission no.)
 *  in place of prose, a plain bio, and Follow as the primary action
 *  with "Write a letter" demoted to secondary. Their bird perches on
 *  the sheet's own top edge — a wax-seal moment, not a banner photo.
 *  The admission number lives inside the fact grid now, set in cinnamon
 *  Libre Baskerville as "No. 1385" — an heirloom detail, findable, never
 *  a hashtag and never sideways in the margin. Posts and letters flow
 *  below as dated diary entries directly on faint ruled paper, not boxed
 *  cards — that part of the stationery metaphor earns its keep because
 *  it does not compete with "what is this profile for".
 *
 *  Alignment: everything (colophon, name, facts, About, entries) shares
 *  one left inset the whole way down the sheet, so "Details" never
 *  starts at a different edge than the posts underneath it - a single
 *  column sidesteps the rail-vs-feed misalignment entirely.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import {
  Feather,
  ChevronDown,
  Instagram,
  Linkedin,
  MessageCircle,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { Button } from "@/components/ui/button";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress, SPRINGS, EASE_SPRING, FadeRise } from "@/components/common/motion";
import { type ProfileVariantProps, type MockPost } from "./_data";

/* A faint grain so the sheet reads as paper, not a flat fill (design system:
   "SVG noise for texture where appropriate"). Pure decoration, data: URI so
   the concept stays self-contained. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/** Demo-only stand-in for real bookmark rows (no Bookmark data in this mock).
 *  Exists purely so the "Saved" tab - owner-required, own-profile-only - has
 *  something to show; a real profile reads this from the Bookmark table. */
const DEMO_SAVED_IDS = new Set(["letter1", "p2"]);

/** This concept assumes the viewer is looking at their own profile, so the
 *  Saved tab's slot can be demonstrated. On someone else's profile this flag
 *  (already threaded from the session in the real page) would be false and
 *  the tab would simply not be pushed into TABS below. */
const IS_OWN_PROFILE = true;

function plainText(content: string): string {
  return content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(content: string, max = 220): string {
  const plain = plainText(content);
  return plain.length > max ? plain.slice(0, max).trimEnd() + "..." : plain;
}

function entryDate(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "numeric" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
  };
}

type TabKey = "all" | "posts" | "letters" | "saved";

export default function LetterheadVariant({ profile }: ProfileVariantProps) {
  const sortedPosts = [...profile.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const postsOnly = sortedPosts.filter((p) => p.kind === "post");
  const lettersOnly = sortedPosts.filter((p) => p.kind === "letter");
  const savedOnly = sortedPosts.filter((p) => DEMO_SAVED_IDS.has(p.id));

  const TABS: { key: TabKey; label: string; items: MockPost[] }[] = [
    { key: "all", label: "All", items: sortedPosts },
    { key: "posts", label: "Posts", items: postsOnly },
    { key: "letters", label: "Letters", items: lettersOnly },
  ];
  if (IS_OWN_PROFILE) TABS.push({ key: "saved", label: "Saved", items: savedOnly });

  const [tab, setTab] = useState<TabKey>("all");
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>(
    () => Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  function toggleLike(id: string) {
    setLikeState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: { liked: !cur.liked, count: cur.liked ? cur.count - 1 : cur.count + 1 },
      };
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="relative">
        {/* Signature moment 1: their bird, perched on the sheet's own top edge
            like a wax seal, breathing with a slow idle bob. Sits in this
            overflow-visible wrapper (not inside the clipped sheet below) so it
            can overlap the border without being cut off. */}
        <motion.div
          className="absolute -top-9 right-5 z-20 flex flex-col items-center sm:-top-14 sm:right-11"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: EASE_SPRING }}
        >
          <BirdAvatar
            user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
            size={80}
          />
          <span
            className="-mt-1 block h-2 w-11 rounded-full"
            style={{ background: "var(--color-ink)", opacity: 0.14, filter: "blur(3px)" }}
          />
          <span className="mt-1.5 whitespace-nowrap font-heading text-[11px] italic text-muted-foreground/75 sm:text-[11.5px]">
            {profile.speciesName}
          </span>
        </motion.div>

        {/* THE SHEET */}
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

          <div className="relative px-5 py-7 sm:px-9 sm:py-10">
            {/* MASTHEAD */}
            <FadeRise>
              <header>
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-cinnamon">
                  <PeaksMark size={13} />
                  Rishi Valley
                </div>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pr-16 sm:pr-24">
                  <h1 className="font-heading text-[clamp(1.9rem,7vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
                    {profile.name}
                  </h1>
                  <VerifiedMark user={profile} size={16} />
                </div>

                <div
                  aria-hidden
                  className="mt-5 h-[3px] w-full rounded-full"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.14), inset 0 -1px 0 rgba(255,255,255,0.55)",
                  }}
                />

                {/* Fact grid — replaces the old run-on subtitle sentence
                    (batch/city/profession prose) plus the separate years/
                    house meta row with one scannable set of label + value
                    pairs. The admission number moves in here too, as
                    "No. 1385" in cinnamon Libre Baskerville: the heirloom
                    detail the brief asks for, just findable now instead of
                    set sideways in the margin like a page number. */}
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 sm:gap-x-8">
                  {profile.batchYear && <FactCell label="Batch" value={String(profile.batchYear)} />}
                  <FactCell
                    label="City"
                    value={profile.currentCity}
                    sub={profile.secondaryCity ? `often in ${profile.secondaryCity}` : undefined}
                  />
                  {(profile.jobTitle || profile.workplace) && (
                    <FactCell
                      label="Profession"
                      value={profile.jobTitle ?? profile.workplace ?? ""}
                      sub={profile.jobTitle && profile.workplace ? profile.workplace : undefined}
                    />
                  )}
                  {profile.houses.length > 0 && (
                    <FactCell label="House" value={profile.houses.map((h) => h.house).join(" → ")} />
                  )}
                  {profile.yearJoined && profile.yearLeft && (
                    <FactCell
                      label="Years"
                      value={`${profile.yearJoined}–${profile.yearLeft}`}
                      sub={profile.gradeJoined ? `joined grade ${profile.gradeJoined}` : undefined}
                    />
                  )}
                  {profile.admissionNumber && (
                    <FactCell label="Admission" value={`No. ${profile.admissionNumber}`} tone="admission" />
                  )}
                </dl>

                {/* The primary CTA is now a profile action, not a letters
                    action — "Write a letter" is demoted alongside it. */}
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <Button
                    variant={isFollowing ? "outline" : "primary"}
                    size="sm"
                    onClick={() => setIsFollowing((f) => !f)}
                    aria-pressed={isFollowing}
                  >
                    {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Feather className="h-4 w-4" />
                    Write a letter
                  </Button>
                  {profile.links.map((link) => (
                    <SpringPress
                      key={link.kind}
                      as="a"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3.5 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      {...({ href: link.href, target: "_blank", rel: "noreferrer noopener" } as object)}
                    >
                      {link.kind === "instagram" ? (
                        <Instagram className="h-3.5 w-3.5" />
                      ) : (
                        <Linkedin className="h-3.5 w-3.5" />
                      )}
                      {link.handle}
                    </SpringPress>
                  ))}
                </div>
              </header>
            </FadeRise>

            {/* ABOUT — a plain profile bio, not a letter's opening paragraph:
                no drop cap, no "in their words" framing, just body copy at
                the same size/leading the rest of the app uses for prose. */}
            <FadeRise delay={0.06}>
              <section className="mt-9 border-t border-border/70 pt-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-canopy">About</p>
                <p className="mt-3 text-[17px] leading-[1.7] text-foreground">{profile.about}</p>
              </section>
            </FadeRise>

            {/* TABS + RULED ENTRIES */}
            <FadeRise delay={0.12}>
              <div className="mt-9">
                <nav
                  className="flex items-center gap-0.5 overflow-x-auto border-b border-border"
                  role="tablist"
                  aria-label="Profile sections"
                >
                  {TABS.map((t) => {
                    const isActive = t.key === tab;
                    return (
                      <SpringPress
                        key={t.key}
                        as="button"
                        onClick={() => setTab(t.key)}
                        className={`relative shrink-0 px-3 py-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-3.5 ${
                          isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                        }`}
                        {...({ role: "tab", "aria-selected": isActive } as object)}
                      >
                        <span className="relative z-10 whitespace-nowrap">
                          {t.label}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground/70">
                            ({t.items.length})
                          </span>
                        </span>
                        {isActive && (
                          <motion.span
                            layoutId="letterheadTabThumb"
                            className="absolute inset-x-2 -bottom-px z-0 h-[2.5px] rounded-full bg-canopy"
                            transition={SPRINGS.snappy}
                          />
                        )}
                      </SpringPress>
                    );
                  })}
                </nav>

                {active.items.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="font-heading text-[15px] text-muted-foreground">Nothing here yet.</p>
                  </div>
                ) : (
                  // Entries flow directly on the sheet as dated diary rows (the
                  // calendar marginalia + hairline dividers below carry the
                  // "ruled paper" feeling). An earlier pass drew literal ruled
                  // lines across the whole list, but at 43px they landed mid
                  // paragraph as often as they landed in the gaps between
                  // entries, reading as a stray extra divider - noise, not
                  // texture - so it was dropped in favour of the divider that
                  // is already legible.
                  <div>
                    {active.items.map((post) => (
                      <EntryRow
                        key={post.id}
                        post={post}
                        liked={likeState[post.id]?.liked ?? false}
                        likeCount={likeState[post.id]?.count ?? post.likeCount}
                        onToggleLike={() => toggleLike(post.id)}
                        expanded={expandedId === post.id}
                        onToggleExpand={() =>
                          setExpandedId((cur) => (cur === post.id ? null : post.id))
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </FadeRise>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One cell of the fact grid: a Canopy small-caps label over a value, with
 *  an optional muted subline for a second detail (e.g. "often in Bengaluru"
 *  under City). `tone="admission"` is the one heirloom exception — set in
 *  cinnamon Libre Baskerville per the brief, never with a hashtag. */
function FactCell({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "admission";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-canopy">{label}</dt>
      <dd
        className={
          tone === "admission"
            ? "mt-1 truncate font-heading text-[16px] font-bold tracking-[-0.01em] text-cinnamon"
            : "mt-1 truncate text-[14.5px] font-semibold text-foreground"
        }
      >
        {value}
      </dd>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function EntryRow({
  post,
  liked,
  likeCount,
  onToggleLike,
  expanded,
  onToggleExpand,
}: {
  post: MockPost;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { day, month } = entryDate(post.createdAt);
  const isLetter = post.kind === "letter";
  const words = post.content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  const isLong = !isLetter && post.content.length > 320;
  const [showFull, setShowFull] = useState(false);

  return (
    <article className="flex gap-3.5 border-b border-border/70 py-6 first:pt-1 last:border-0 sm:gap-6">
      {/* dated marginalia, like a torn calendar page */}
      <div className="flex w-9 shrink-0 flex-col items-center pt-0.5 sm:w-12">
        <span className="font-heading text-[18px] font-bold leading-none text-foreground sm:text-[19px]">
          {day}
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 sm:text-[9.5px]">
          {month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        {isLetter ? (
          <div>
            <SpringPress
              as="button"
              onClick={onToggleExpand}
              className="group block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              {...({ "aria-expanded": expanded } as object)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
                    <Feather className="h-3.5 w-3.5" />
                    Letter
                    <span className="text-muted-foreground/70">&middot; {mins} min read</span>
                  </div>
                  <h3 className="mt-1.5 font-heading text-[19px] font-bold leading-snug tracking-[-0.01em] text-foreground group-hover:text-canopy sm:text-xl">
                    {post.title}
                  </h3>
                  {!expanded && (
                    <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
                      {excerpt(post.content)}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </SpringPress>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRINGS.gentle}
                  className="overflow-hidden"
                >
                  <div className="mt-3 whitespace-pre-wrap font-heading text-[17px] leading-[1.8] text-foreground">
                    {post.content}
                  </div>
                  <p className="mt-3 text-[13px] italic text-muted-foreground/70">End of letter.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div>
            <p className="text-[15px] leading-[1.7] text-foreground">
              {isLong && !showFull ? post.content.slice(0, 320).trimEnd() + "..." : post.content}
            </p>
            {isLong && !showFull && (
              <SpringPress
                as="button"
                onClick={() => setShowFull(true)}
                className="mt-1 inline-block rounded-sm text-sm font-medium text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Read more
              </SpringPress>
            )}
          </div>
        )}

        <div className="mt-3 -ml-2.5 flex items-center gap-1 text-muted-foreground">
          <LoveButton
            liked={liked}
            count={likeCount}
            onToggle={onToggleLike}
            size="sm"
            label={liked ? "Unlike" : "Like"}
          />
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px]">
            <MessageCircle className="h-[15px] w-[15px]" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}
