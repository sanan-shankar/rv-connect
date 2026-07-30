"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Field guide
 *
 *  The profile as a naturalist's plate: the person and their bird billed
 *  with equal seriousness, the way a field guide bills a species. A
 *  specimen mount for the bird (with a real binomial name when we know
 *  one), a "field marks" ledger of facts in dotted-leader index-card
 *  style, houses read as a migration route, the admission number as a
 *  stamped heirloom tag, and the about section as a field notebook entry
 *  with a dropped first letter. Every "record" surface (the plate, the
 *  ledger, every observation card) shares one horizontal inset (RECORD_X)
 *  so the facts column and the posts list always start at the same left
 *  edge, in the same document flow, top to bottom.
 * ------------------------------------------------------------------ */

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Feather,
  MessageCircle,
  Instagram,
  Linkedin,
  Compass,
  ArrowRight,
  Pencil,
  Bookmark,
} from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { Button } from "@/components/ui/button";
import { FadeRise, SpringPress, SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { metaParts, readMinutes, type MockPost, type ProfileVariantProps } from "./_data";

/* Shared horizontal inset for every "record" surface on this page (the
   plate, the field-marks ledger, every observation card). Change once and
   the facts column and the posts list stay lined up at the same left edge. */
const RECORD_X = "px-5 sm:px-8";

/* Real binomial names for common valley species (see the 50-species set in
   bird-avatar-v2.tsx). Best-effort: a species not listed here simply skips
   the scientific-name line rather than guessing one. */
const LATIN_NAMES: Record<string, string> = {
  Hoopoe: "Upupa epops",
  "Common Hoopoe": "Upupa epops",
  "Indian Peafowl": "Pavo cristatus",
  Peafowl: "Pavo cristatus",
  "Spotted Owlet": "Athene brama",
  Owlet: "Athene brama",
  "Indian Roller": "Coracias benghalensis",
  Roller: "Coracias benghalensis",
  "White-throated Kingfisher": "Halcyon smyrnensis",
  Kingfisher: "Halcyon smyrnensis",
  "Indian Pitta": "Pitta brachyura",
  "Rose-ringed Parakeet": "Psittacula krameri",
  Parakeet: "Psittacula krameri",
  "Plum-headed Parakeet": "Psittacula cyanocephala",
  "Green Bee-eater": "Merops orientalis",
  "Bee-eater": "Merops orientalis",
  "Coppersmith Barbet": "Psilopogon haemacephalus",
  Barbet: "Psilopogon haemacephalus",
  "Indian Grey Hornbill": "Ocyceros birostris",
  Hornbill: "Ocyceros birostris",
  "Black Drongo": "Dicrurus macrocercus",
  Drongo: "Dicrurus macrocercus",
  "Purple Sunbird": "Cinnyris asiaticus",
  Sunbird: "Cinnyris asiaticus",
  "Asian Koel": "Eudynamys scolopaceus",
  "Oriental Magpie-Robin": "Copsychus saularis",
  "Indian Robin": "Copsychus fulicatus",
  "Cattle Egret": "Bubulcus ibis",
  "Peregrine Falcon": "Falco peregrinus",
  "Black-hooded Oriole": "Oriolus xanthornus",
  Oriole: "Oriolus xanthornus",
  "Rufous Treepie": "Dendrocitta vagabunda",
  Treepie: "Dendrocitta vagabunda",
  "Baya Weaver": "Ploceus philippinus",
  Weaver: "Ploceus philippinus",
  "Indian Pond Heron": "Ardeola grayii",
  "Pond Heron": "Ardeola grayii",
  "Greater Coucal": "Centropus sinensis",
  Coucal: "Centropus sinensis",
  "Yellow-throated Bulbul": "Pycnonotus xantholaemus",
  "Red-whiskered Bulbul": "Pycnonotus jocosus",
};

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* The one recurring "botanical field-map" texture behind the plate and the
   field-notes card: a faint topographic contour, pure line art so it never
   competes with the bird or the type (and is never mistaken for a photo). */
function ContourLines({ className = "" }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-leaf", className)}
      preserveAspectRatio="none"
      viewBox="0 0 400 220"
      fill="none"
      aria-hidden
    >
      <path d="M-10 34 Q40 12 90 34 T190 34 T290 34 T410 34" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M-10 78 Q40 56 90 78 T190 78 T290 78 T410 78" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M-10 132 Q40 110 90 132 T190 132 T290 132 T410 132" stroke="currentColor" strokeWidth="1" opacity="0.32" />
      <path d="M-10 180 Q40 158 90 180 T190 180 T290 180 T410 180" stroke="currentColor" strokeWidth="1" opacity="0.24" />
    </svg>
  );
}

/* One row of the field-marks ledger: a small-caps label in Canopy, a
   dotted leader (the classic index-card device, tinted Canopy so it reads
   against the warm card without competing with it), then the value. Each
   row is three siblings in the SAME grid (see the "Field marks" section
   below) rather than its own nested flex box, so the value column is a
   true shared grid track and every row's value starts at the same x. */
function LeaderRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-canopy">{label}</span>
      <span className="h-px translate-y-[-3px] border-b border-dotted border-canopy/18" aria-hidden />
      <span className="text-[14px] font-medium leading-snug text-foreground">{value}</span>
    </>
  );
}

function ObservationCard({
  post,
  liked,
  count,
  onToggle,
}: {
  post: MockPost;
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <article
      className={cn(
        "card-elevated rounded-lg border border-border bg-card py-5 transition-transform duration-200 ease-out hover:-translate-y-0.5",
        RECORD_X
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
        {formatLogDate(post.createdAt)}
      </div>
      <p className="mt-2.5 text-[14.5px] leading-[1.7] text-foreground">{post.content}</p>
      <div className="mt-4 flex items-center gap-4 border-t border-border/70 pt-3">
        <LoveButton liked={liked} count={count} onToggle={onToggle} label="Like this post" />
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.commentCount}
        </span>
      </div>
    </article>
  );
}

function LetterCard({
  post,
  liked,
  count,
  onToggle,
}: {
  post: MockPost;
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const minutes = readMinutes(post.content);
  const [firstParagraph, ...rest] = post.content.split(/\n\n+/);

  return (
    <article className={cn("card-elevated rounded-lg border border-cinnamon/25 bg-cinnamon/5 py-6", RECORD_X)}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" />
        Letter
        <span className="font-semibold text-muted-foreground/70">&middot; {minutes} min read</span>
      </div>
      <h3 className="mt-2 font-heading text-[20px] font-bold leading-[1.15] tracking-tight text-foreground">
        {post.title || "Untitled letter"}
      </h3>
      <p className="mt-1 text-[11.5px] text-muted-foreground">{formatLogDate(post.createdAt)}</p>

      <div className="mt-3.5 whitespace-pre-wrap font-heading text-[15.5px] leading-[1.8] text-foreground">
        {firstParagraph}
      </div>

      <AnimatePresence initial={false}>
        {expanded && rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRINGS.gentle}
            className="mt-4 space-y-4 whitespace-pre-wrap font-heading text-[15.5px] leading-[1.8] text-foreground"
          >
            {rest.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-cinnamon/20 pt-4">
        <SpringPress
          as="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 rounded-full text-[13px] font-semibold text-canopy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {expanded ? "Show less" : "Read the full letter"}
          <ArrowRight className={cn("h-3.5 w-3.5 transition-transform duration-200 ease-out", expanded && "rotate-90")} />
        </SpringPress>
        <div className="flex items-center gap-4">
          <LoveButton liked={liked} count={count} onToggle={onToggle} label="Like this letter" />
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}

type TabKey = "observations" | "notes" | "saved";

export default function FieldGuideVariant({ profile }: ProfileVariantProps) {
  const [viewingAsOwner, setViewingAsOwner] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("observations");
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Drops back to a visible tab when the owner-only tab stops being offered, so the panel can never be left pointing at a tab that is gone.
    if (!viewingAsOwner && activeTab === "saved") setActiveTab("observations");
  }, [viewingAsOwner, activeTab]);

  function toggleLike(id: string) {
    setLikeState((prev) => {
      const cur = prev[id];
      return { ...prev, [id]: { liked: !cur.liked, count: cur.count + (cur.liked ? -1 : 1) } };
    });
  }

  const firstName = profile.name.split(" ")[0];
  const binomial = LATIN_NAMES[profile.speciesName];
  const meta = metaParts(profile);
  const profession =
    profile.jobTitle && profile.workplace
      ? `${profile.jobTitle} at ${profile.workplace}`
      : profile.jobTitle || profile.workplace || null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "observations", label: `Observations · ${profile.postCount + profile.letterCount}` },
    { key: "notes", label: "Field notes" },
    ...(viewingAsOwner ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 md:px-10">
      {/* Preview-only affordance: lets a reviewer see both the owner's own
          view (Edit profile, Saved tab) and a visitor's (Write a letter). */}
      <div className="mb-4 flex justify-end">
        <div
          role="group"
          aria-label="Preview as"
          className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5"
        >
          {[
            { key: true, label: "Their own view" },
            { key: false, label: "A visitor's view" },
          ].map((opt) => (
            <SpringPress
              key={String(opt.key)}
              as="button"
              onClick={() => setViewingAsOwner(opt.key)}
              aria-pressed={viewingAsOwner === opt.key}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                viewingAsOwner === opt.key ? "bg-canopy text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </SpringPress>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- *
       *  The plate: the person and their bird, billed with equal
       *  seriousness, the way a field guide bills a species.
       * ---------------------------------------------------------------- */}
      <FadeRise>
        <section
          className={cn(
            "card-elevated relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-card to-mist/60 py-7 sm:py-9",
            RECORD_X
          )}
        >
          <ContourLines className="opacity-55" />
          <Compass
            className="absolute right-6 top-6 h-7 w-7 rotate-[18deg] text-leaf/20 sm:right-8 sm:top-8"
            strokeWidth={1.5}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:gap-10">
            {/* Specimen mount. No fixed width here (unlike the 132px circle
                below): the binomial name is the widest thing in this column,
                so the column sizes to its content and the circle centers
                inside via mx-auto, rather than the name wrapping to fit a
                width sized for the circle alone. */}
            <div className="shrink-0">
              <div className="relative mx-auto h-[132px] w-[132px]">
                <div className="absolute inset-0 rounded-full bg-leaf/10 blur-2xl" aria-hidden />
                <span className="absolute left-0 top-0 h-4 w-4 rounded-tl-md border-l-2 border-t-2 border-leaf/45" aria-hidden />
                <span className="absolute right-0 top-0 h-4 w-4 rounded-tr-md border-r-2 border-t-2 border-leaf/45" aria-hidden />
                <span className="absolute bottom-0 left-0 h-4 w-4 rounded-bl-md border-b-2 border-l-2 border-leaf/45" aria-hidden />
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-br-md border-b-2 border-r-2 border-leaf/45" aria-hidden />
                <div className="relative flex h-full w-full items-center justify-center">
                  <BirdAvatar
                    user={{
                      id: profile.id,
                      name: profile.name,
                      photoUrl: profile.photoUrl,
                      avatarSpecies: profile.avatarSpecies,
                    }}
                    size={104}
                  />
                </div>
              </div>
              <p className="mt-2 whitespace-nowrap text-center text-[10.5px] font-bold uppercase tracking-[0.14em] text-leaf">
                {profile.speciesName}
              </p>
              {binomial && (
                <p className="whitespace-nowrap text-center font-heading text-[12.5px] italic text-muted-foreground">
                  {binomial}
                </p>
              )}
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="flex flex-wrap items-center justify-center gap-x-2 font-heading text-[28px] font-bold leading-[1.05] tracking-tight text-foreground sm:justify-start sm:text-[32px]">
                {profile.name}
                <VerifiedMark user={profile} size={18} />
              </h1>
              <p className="mx-auto mt-2 max-w-[52ch] font-heading text-[14.5px] italic leading-[1.6] text-muted-foreground sm:mx-0">
                {meta.join(" · ")}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                {viewingAsOwner ? (
                  <Button variant="outline">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                ) : (
                  <Button variant="outline">
                    <Feather className="h-3.5 w-3.5" />
                    Write {firstName} a letter
                  </Button>
                )}
                {profile.links.map((link) => (
                  <a
                    key={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-transform duration-150 ease-out hover:-translate-y-px hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.97]"
                  >
                    {link.kind === "instagram" ? (
                      <Instagram className="h-3.5 w-3.5" />
                    ) : (
                      <Linkedin className="h-3.5 w-3.5" />
                    )}
                    {link.handle}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeRise>

      {/* ---------------------------------------------------------------- *
       *  Field marks: the facts column, specimen-plate style. Same
       *  RECORD_X inset as the plate above and every card below, so this
       *  ledger's text starts at the same left edge as the posts do.
       * ---------------------------------------------------------------- */}
      <FadeRise delay={0.05}>
        <section className={cn("card-elevated mt-6 rounded-lg border border-border bg-card py-6", RECORD_X)}>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Field marks</h2>

          {/* One shared grid for every fact row: label | dotted leader | value.
              Because the three columns are real CSS Grid tracks (not each
              row's own flex box), the value track is a single shared width
              and every row's value lands at the same x — a true grid, not
              four independently placed pairs. */}
          <div className="grid grid-cols-[auto_minmax(20px,0.6fr)_minmax(0,1.6fr)] items-baseline gap-x-3 gap-y-3">
            {profile.batchYear != null && (
              <LeaderRow
                label="Batch"
                value={`Batch of ${profile.batchYear}${profile.batchType ? ` (${profile.batchType})` : ""}`}
              />
            )}
            <LeaderRow
              label="City"
              value={
                profile.secondaryCity ? (
                  <>
                    {profile.currentCity}
                    <span className="text-muted-foreground"> &middot; {profile.secondaryCity}</span>
                  </>
                ) : (
                  profile.currentCity
                )
              }
            />
            {profession && <LeaderRow label="Occupation" value={profession} />}
            {profile.yearJoined != null && profile.yearLeft != null && (
              <LeaderRow
                label="Years in the valley"
                value={
                  <>
                    {profile.yearJoined}&ndash;{profile.yearLeft}
                    {profile.gradeJoined != null && (
                      <span className="text-muted-foreground"> (joined in grade {profile.gradeJoined})</span>
                    )}
                  </>
                }
              />
            )}
            {profile.admissionNumber != null && (
              <LeaderRow
                label="Admission no."
                value={
                  <span className="inline-flex w-max items-center rounded-full border border-cinnamon px-4 py-1 font-heading text-[18px] font-bold leading-none text-cinnamon">
                    No. {profile.admissionNumber}
                  </span>
                }
              />
            )}
          </div>

          {profile.houses.length > 0 && (
            <div className="mt-5">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Houses</span>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {profile.houses.map((h, i) => (
                  <div key={h.house} className="flex items-center gap-2">
                    <div className="rounded-md border border-leaf/25 bg-leaf/5 px-3 py-1.5 text-center">
                      <p className="text-[13px] font-semibold leading-tight text-foreground">{h.house}</p>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        {h.fromYear}&ndash;{h.toYear}
                      </p>
                    </div>
                    {i < profile.houses.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </FadeRise>

      {/* ---------------------------------------------------------------- *
       *  Tabs: Observations (posts + letters, chronological), Field notes
       *  (about), Saved (own profile only).
       * ---------------------------------------------------------------- */}
      <div aria-label="Profile sections" className="mt-8 flex items-center gap-6 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <SpringPress
              key={tab.key}
              as="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative -mb-px border-b-2 pb-3 text-[13.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive ? "border-leaf text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </SpringPress>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRINGS.gentle}
          className="mt-6"
        >
          {activeTab === "observations" && (
            <div className="space-y-4">
              {profile.posts.map((post) =>
                post.kind === "letter" ? (
                  <LetterCard
                    key={post.id}
                    post={post}
                    liked={likeState[post.id].liked}
                    count={likeState[post.id].count}
                    onToggle={() => toggleLike(post.id)}
                  />
                ) : (
                  <ObservationCard
                    key={post.id}
                    post={post}
                    liked={likeState[post.id].liked}
                    count={likeState[post.id].count}
                    onToggle={() => toggleLike(post.id)}
                  />
                )
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <section
              className={cn("card-elevated relative overflow-hidden rounded-lg border border-border bg-card py-7", RECORD_X)}
            >
              <ContourLines className="opacity-35" />
              <h2 className="relative mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Field notes &middot; in their words
              </h2>
              <p className="relative max-w-[62ch] text-[15px] leading-[1.7] text-foreground first-letter:float-left first-letter:mr-2 first-letter:font-heading first-letter:text-[52px] first-letter:font-bold first-letter:leading-[0.75] first-letter:text-cinnamon">
                {profile.about}
              </p>
            </section>
          )}

          {activeTab === "saved" && viewingAsOwner && (
            <div className={cn("rounded-lg border border-dashed border-border bg-card/60 py-10 text-center", RECORD_X)}>
              <Bookmark className="mx-auto h-6 w-6 text-muted-foreground/50" aria-hidden />
              <p className="mt-3 text-[14px] text-muted-foreground">Nothing saved yet.</p>
              <p className="mt-1 text-[13px] text-muted-foreground/80">
                Bookmark a letter or a post and it will keep here, just for {firstName}.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
