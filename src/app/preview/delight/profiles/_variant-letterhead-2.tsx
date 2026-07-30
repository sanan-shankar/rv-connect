"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Letterhead II
 *
 *  The letterhead rebuilt to the owner's 2026-07-30 notes. What changed
 *  from Letterhead I, point by point:
 *
 *  - The masthead colophon is the PeaksMark LOGO plus the admission
 *    number in small cinnamon capitals; the words "Rishi Valley" are
 *    gone. Pressing the number stamps the sheet: the cinnamon accession
 *    stamp thumps in, sits a moment, and fades away. There is no
 *    permanently-printed stamp anywhere.
 *  - The bird sits INSIDE the sheet, top right. No species name, no
 *    hovering over the border, no reserved air above the sheet. It does
 *    its slow idle bob and chirps (thump + cinnamon arcs) when pressed.
 *  - The occupation is the name's subtitle. The fact band below holds
 *    exactly three things: batch, cities, years in the valley, set a
 *    full step larger than before. Houses and admission number left the
 *    band (houses go under About as the shipped serpentine trail; the
 *    admission number moved up into the colophon).
 *  - One primary action: Get in touch, right-aligned in the masthead,
 *    opening the shared contact dialog. No Follow, no Write a letter,
 *    no socials row; contact details stay tucked away until asked for.
 *  - Entries under the tabs are the FEED's post UI (identity row with
 *    bird + name + batch/time, body, love/comment/bookmark/share rail),
 *    not a bespoke diary layout. The tabs sit flush on the sheet's one
 *    left edge and do not scroll.
 *  - Every slot degrades: no about, no houses, no admission number, no
 *    occupation, no cities, no posts - each section simply is not
 *    there, and the sheet still reads as finished stationery. The
 *    "Preview data" toggle above the sheet proves it.
 *
 *  Spacing contract: the sheet's padding is EQUAL on all four sides
 *  (24px, 40px from sm up), and every block inside shares the same
 *  single left edge. Section rhythm is --space-xl between the masthead
 *  rule and each major section, --space-s between a section label and
 *  its content. One engraved rule total.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { ChatCircle, Feather } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { ShareButton } from "@/components/common/share-button";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress, SPRINGS, EASE_SPRING, EASE_OUT_SMOOTH, FadeRise } from "@/components/common/motion";
import { formatTimeAgo, batchLine } from "@/lib/utils";
import { HousesTrail } from "./_houses-trail";
import { readMinutes, type MockPost, type MockProfile, type ProfileVariantProps } from "./_data";

/* A faint grain so the sheet reads as paper, not a flat fill. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/** Demo-only stand-in for real bookmark rows. */
const DEMO_SAVED_IDS = new Set(["letter1", "p2"]);

/** The concept assumes the viewer's own profile so the Saved tab can show. */
const IS_OWN_PROFILE = true;

type TabKey = "all" | "posts" | "letters" | "saved";

function plainText(content: string): string {
  return content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(content: string, max = 200): string {
  const plain = plainText(content);
  return plain.length > max ? plain.slice(0, max).trimEnd() + "..." : plain;
}

/** Placeholder reach-outs, derived only to exercise the Get in touch dialog
 *  (the mock payload has no email/phone columns; the real `User` does). */
function contactMethodsFor(profile: MockProfile): ContactMethod[] {
  if (profile.links.length === 0) return [];
  const slug = profile.name.toLowerCase().replace(/\s+/g, ".");
  const methods: ContactMethod[] = [
    {
      kind: "email",
      label: "Email",
      value: `${slug}@example.com`,
      href: `mailto:${slug}@example.com`,
    },
    { kind: "phone", label: "Phone", value: "+91 98450 33712", href: "tel:+919845033712" },
  ];
  for (const link of profile.links) {
    if (link.kind === "instagram" || link.kind === "linkedin") {
      methods.push({
        kind: link.kind,
        label: link.label,
        value: link.handle,
        href: link.href,
        external: true,
      });
    }
  }
  return methods;
}

function buildVcard(profile: MockProfile, methods: ContactMethod[]): string {
  const email = methods.find((m) => m.kind === "email")?.value;
  const phone = methods.find((m) => m.kind === "phone")?.value;
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    email ? `EMAIL:${email}` : null,
    phone ? `TEL:${phone}` : null,
    profile.jobTitle ? `TITLE:${profile.jobTitle}` : null,
    profile.workplace ? `ORG:${profile.workplace}` : null,
    profile.currentCity ? `ADR:;;;${profile.currentCity};;;` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/** A member who filled in almost nothing: the layout has to survive this. */
function sparseOf(p: MockProfile): MockProfile {
  return {
    ...p,
    jobTitle: null,
    workplace: null,
    secondaryCity: null,
    currentCity: "",
    yearJoined: null,
    yearLeft: null,
    gradeJoined: null,
    admissionNumber: null,
    batchType: null,
    about: "",
    houses: [],
    links: [],
    postCount: 2,
    letterCount: 0,
    posts: p.posts.filter((x) => x.kind === "post").slice(0, 2),
  };
}

export default function LetterheadTwoVariant({ profile }: ProfileVariantProps) {
  // ?sample=sparse deep-links the near-empty mock (for screenshot agents).
  const searchParams = useSearchParams();
  const [sample, setSample] = useState<"full" | "sparse">(
    searchParams.get("sample") === "sparse" ? "sparse" : "full"
  );
  const active = sample === "full" ? profile : sparseOf(profile);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Lab chrome, not part of the concept: flips the mock between a
          filled-in member and a near-empty one, because the layout has to
          hold up for both. */}
      <div className="mb-[var(--space-s)] flex items-center justify-end gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
          Preview data
        </span>
        {(["full", "sparse"] as const).map((key) => (
          <SpringPress
            key={key}
            as="button"
            onClick={() => setSample(key)}
            aria-pressed={sample === key}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              sample === key
                ? "border-transparent bg-canopy text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "full" ? "Full" : "Sparse"}
          </SpringPress>
        ))}
      </div>

      {/* Keyed so all sheet state (tabs, likes, stamp) resets with the mock. */}
      <LetterheadSheet key={sample} profile={active} />
    </div>
  );
}

function LetterheadSheet({ profile }: { profile: MockProfile }) {
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
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>(
    () => Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

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

  /* The stamp: pressed in on demand, held a moment, faded away. Re-pressing
     restarts the whole performance. */
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

  const methods = contactMethodsFor(profile);
  const about = profile.about.trim();

  /* Exactly three possible facts. Anything missing simply is not there. */
  const facts: { label: string; value: string; sub?: string }[] = [];
  if (profile.batchYear) {
    facts.push({
      label: "Batch",
      value: String(profile.batchYear),
      sub: profile.batchType ?? undefined,
    });
  }
  if (profile.currentCity) {
    facts.push({
      label: profile.secondaryCity ? "Cities" : "City",
      value: profile.currentCity,
      sub: profile.secondaryCity ? `often in ${profile.secondaryCity}` : undefined,
    });
  }
  if (profile.yearJoined && profile.yearLeft) {
    facts.push({
      label: "In the valley",
      value: `${profile.yearJoined}-${profile.yearLeft}`,
      sub: profile.gradeJoined ? `joined grade ${profile.gradeJoined}` : undefined,
    });
  }

  return (
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

      {/* The stamp lands over the masthead, like a mark pressed onto the
          letter itself. AnimatePresence handles the fade-away; the stamp's
          own mount spring is the thump. */}
      <AnimatePresence>
        {stamp > 0 && profile.admissionNumber && (
          <motion.div
            key={stamp}
            exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeOut" } }}
            className="pointer-events-none absolute left-1/2 top-[44px] z-20 -translate-x-1/2"
          >
            <AdmissionStamp number={profile.admissionNumber} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* EQUAL padding on all four sides: the title's distance from the left
          edge is exactly its distance from the top. */}
      <div className="relative p-6 sm:p-10">
        <FadeRise>
          <header className="flex items-start justify-between gap-5 sm:gap-8">
            <div className="min-w-0 flex-1">
              {/* Colophon: the mark, plus the admission number in cinnamon
                  capitals. Pressing the number stamps the sheet. */}
              {profile.admissionNumber ? (
                <button
                  type="button"
                  onClick={fireStamp}
                  aria-label={`Admission number ${profile.admissionNumber}. Press to stamp the sheet.`}
                  className="inline-flex items-center gap-2 rounded-sm text-cinnamon transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-60"
                >
                  <PeaksMark size={15} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                    No. {profile.admissionNumber}
                  </span>
                </button>
              ) : (
                <span aria-hidden className="inline-flex text-cinnamon">
                  <PeaksMark size={15} />
                </span>
              )}

              {/* The mark rides inline after the LAST word, so a wrapping name
                  never strands the leaf alone on its own line. */}
              <h1 className="mt-[var(--space-m)] font-heading text-[clamp(1.9rem,7vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
                {profile.name}
                <span className="ml-2.5 inline-flex -translate-y-1 align-middle">
                  <VerifiedMark user={profile} size={16} />
                </span>
              </h1>

              {(profile.jobTitle || profile.workplace) && (
                <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">
                  {profile.jobTitle && (
                    <span className="font-semibold text-foreground">{profile.jobTitle}</span>
                  )}
                  {profile.jobTitle && profile.workplace ? " at " : null}
                  {profile.workplace}
                </p>
              )}

              {/* On a phone the CTA lives here, under the identity, leaving
                  the narrow right rail to the bird alone so the name keeps
                  its column. From sm it moves up beside the bird. */}
              {methods.length > 0 && (
                <div className="mt-[var(--space-m)] sm:hidden">
                  <GetInTouch
                    name={profile.name}
                    methods={methods}
                    vcard={buildVcard(profile, methods)}
                    showSave={false}
                  />
                </div>
              )}
            </div>

            {/* The bird and the one action, on the sheet's right edge. When
                the person shared no contact details there is no button at
                all: an always-disabled CTA reads as something broken, and
                absence keeps the masthead honest. */}
            <div className="flex shrink-0 flex-col items-end gap-2.5">
              <ChirpBird profile={profile} />
              {methods.length > 0 && (
                <div className="hidden sm:block">
                  <GetInTouch
                    name={profile.name}
                    methods={methods}
                    vcard={buildVcard(profile, methods)}
                    showSave={false}
                  />
                </div>
              )}
            </div>
          </header>

          {facts.length > 0 && (
            <dl className="mt-[var(--space-l)] grid grid-cols-2 gap-x-6 gap-y-[var(--space-m)] sm:grid-cols-3 sm:gap-x-8">
              {facts.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 text-[17px] font-semibold leading-tight text-foreground">
                    {f.value}
                  </dd>
                  {f.sub && (
                    <p className="mt-1 text-[13px] leading-tight text-muted-foreground">{f.sub}</p>
                  )}
                </div>
              ))}
            </dl>
          )}

          {/* The letterhead's one engraved rule. */}
          <div
            aria-hidden
            className="mt-[var(--space-l)] h-[3px] w-full rounded-full"
            style={{
              boxShadow: "inset 0 1px 0 rgba(0,0,0,0.14), inset 0 -1px 0 rgba(255,255,255,0.55)",
            }}
          />
        </FadeRise>

        {about && (
          <FadeRise delay={0.06}>
            <section className="mt-[var(--space-xl)]">
              <SectionLabel>About</SectionLabel>
              <p className="mt-[var(--space-s)] text-[17px] leading-[1.7] text-foreground">
                {about}
              </p>
            </section>
          </FadeRise>
        )}

        {profile.houses.length > 0 && (
          <FadeRise delay={0.09}>
            <section className="mt-[var(--space-l)]">
              <SectionLabel>Houses</SectionLabel>
              <div className="mt-[var(--space-s)]">
                <HousesTrail houses={profile.houses} />
              </div>
            </section>
          </FadeRise>
        )}

        <FadeRise delay={0.12}>
          <div className="mt-[var(--space-xl)]">
            {/* Tabs, flush on the sheet's left edge: the first label starts at
                the same x as the name, the facts, and every entry below. */}
            <nav className="flex gap-6 border-b border-border" role="tablist" aria-label="Profile sections">
              {TABS.map((t) => {
                const isActive = t.key === tab;
                return (
                  <SpringPress
                    key={t.key}
                    as="button"
                    onClick={() => setTab(t.key)}
                    className={`relative py-2.5 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                    }`}
                    {...({ role: "tab", "aria-selected": isActive } as object)}
                  >
                    <span className="whitespace-nowrap">
                      {t.label}
                      <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground/70">
                        {t.items.length}
                      </span>
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="lh2TabThumb"
                        className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-canopy"
                        transition={SPRINGS.snappy}
                      />
                    )}
                  </SpringPress>
                );
              })}
            </nav>

            {activeTab.items.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-heading text-[15px] text-muted-foreground">Nothing here yet.</p>
              </div>
            ) : (
              <div>
                {activeTab.items.map((post) => (
                  <EntryRow
                    key={post.id}
                    post={post}
                    author={profile}
                    liked={likeState[post.id]?.liked ?? false}
                    likeCount={likeState[post.id]?.count ?? post.likeCount}
                    onToggleLike={() => toggleLike(post.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </FadeRise>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">{children}</p>
  );
}

/* ------------------------------------------------------------------ *
 *  The bird. Inside the sheet, idle bob always on; pressing it chirps:
 *  a spring thump and three cinnamon arcs. No species name anywhere.
 * ------------------------------------------------------------------ */
function ChirpBird({ profile }: { profile: MockProfile }) {
  const [chirp, setChirp] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setChirp((c) => c + 1)}
      aria-label={`${profile.name}'s bird. Tap for a chirp.`}
      className="relative shrink-0 rounded-full p-1.5 outline-none transition-[background-color,transform] duration-150 hover:bg-mist focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.95]"
    >
      <motion.span
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: EASE_SPRING }}
        className="block"
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
            size={72}
          />
        </motion.span>
      </motion.span>

      {chirp > 0 && (
        <span key={chirp} aria-hidden className="pointer-events-none absolute right-[-4px] top-[20px]">
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
 *  One entry, drawn as the FEED draws a post: identity row up top with
 *  the bird, the name, batch and time; the body; then the love /
 *  comment / bookmark / share rail. Letters keep the feed's nested
 *  letter card, except "Read this letter" opens it inline here (the
 *  real feed navigates to the letter page, which a mock cannot).
 * ------------------------------------------------------------------ */
function EntryRow({
  post,
  author,
  liked,
  likeCount,
  onToggleLike,
}: {
  post: MockPost;
  author: MockProfile;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  const isLetter = post.kind === "letter";
  const isLong = !isLetter && post.content.length > 300;
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [saved, setSaved] = useState(DEMO_SAVED_IDS.has(post.id));

  const avatarUser = { id: author.id, name: author.name, avatarSpecies: author.avatarSpecies };

  return (
    <article className="border-b border-border/70 py-5 last:border-0">
      <header className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BirdAvatar user={avatarUser} size="sm" />
          <div className="flex min-w-0 flex-col justify-center" style={{ gap: 5 }}>
            <div className="flex min-w-0 items-center gap-1 leading-none">
              <span className="text-sm font-semibold leading-none text-foreground">
                {author.name}
              </span>
              <VerifiedMark user={author} />
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] leading-none text-muted-foreground">
              <span>{batchLine(author)}</span>
              <span className="dotsep">·</span>
              <span>{formatTimeAgo(new Date(post.createdAt))}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Post menu (inactive in this preview)"
          className="-mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </header>

      {isLetter ? (
        <div className="mt-3 rounded-xl border border-border bg-paper/60 p-4">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
            <Feather size={13} weight="fill" />
            Letter
            <span className="text-muted-foreground/70">· {readMinutes(post.content)} min read</span>
          </div>
          <h3 className="mt-2 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-foreground">
            {post.title}
          </h3>
          {!expanded && (
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
              {excerpt(post.content)}
            </p>
          )}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRINGS.gentle}
                className="overflow-hidden"
              >
                <div className="mt-3 whitespace-pre-wrap font-heading text-[16px] leading-[1.8] text-foreground">
                  {post.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <SpringPress
            as="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            {...({ "aria-expanded": expanded } as object)}
          >
            {expanded ? "Close letter" : "Read this letter"}
            <ChevronDown
              className={`h-[15px] w-[15px] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </SpringPress>
        </div>
      ) : (
        <div className="mt-2.5">
          <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
            {isLong && !showFull ? post.content.slice(0, 300).trimEnd() + "..." : post.content}
          </p>
          {isLong && !showFull && (
            <button
              onClick={() => setShowFull(true)}
              className="mt-1 rounded-sm text-sm font-medium text-leaf hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Read more
            </button>
          )}
        </div>
      )}

      <div className="mt-2 -mx-2.5 flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} label="Like this post" />
        <button
          type="button"
          aria-label="Comments (inactive in this preview)"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChatCircle size={18} weight="regular" />
          <span>{post.commentCount}</span>
        </button>
        <BookmarkButton
          saved={saved}
          onToggle={() => setSaved((s) => !s)}
          id={post.id}
          className="ml-auto"
          label={saved ? "Remove bookmark" : "Save post"}
        />
        <ShareButton href={`/preview/delight/profiles?v=letterhead-2#${post.id}`} label="Copy link to post" />
      </div>
    </article>
  );
}
