"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Valley terrain
 *
 *  Colour without a banner photo: a generated, layered-gradient ridge
 *  line stands in for a header image (three SVG hill bands + a sky wash
 *  + a hand-grain noise pass), the bird perched on the highest peak, and
 *  the person's name set into the front ridge like a name carved into a
 *  hillside trail marker. The content sheet then rises up over the
 *  bottom of the terrain, rounded corners first, the way a page of paper
 *  might rise out of a valley floor.
 *
 *  Two signature moments: the bird breathes (a slow idle bob, never
 *  gated on reduced-motion per the design system) and a small hand-set
 *  trail sign carries the person's Rishi Valley tenure ("Std 4 -> left
 *  2021") the way a real trail marker carries distances.
 *
 *  Every content block below the terrain shares one CONTAINER measure so
 *  the identity line in the header, the admission/verified strip, the
 *  field notes, and the post list all start at the exact same left edge
 *  (the alignment complaint from the old profile).
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Instagram,
  Linkedin,
  Milestone,
  MapPin,
  Bookmark,
  Bird as BirdIcon,
  GraduationCap,
  Home,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import { Feather, Quotes, ChatCircle, ArrowRight } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { Button } from "@/components/ui/button";
import { SpringPress, FadeRise } from "@/components/common/motion";
import { formatTimeAgo, renderRichText, letterTitle } from "@/lib/utils";
import { metaParts, readMinutes, type MockPost, type ProfileVariantProps } from "./_data";

/** Every section shares this measure so text lines up top to bottom. */
const CONTAINER = "mx-auto w-full max-w-[720px] px-6 md:px-10";

type TabKey = "posts" | "letters" | "saved";

const LINK_ICON = { instagram: Instagram, linkedin: Linkedin } as const;

export default function ValleyTerrainVariant({ profile }: ProfileVariantProps) {
  const meta = metaParts(profile);
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");
  const firstName = profile.name.split(" ")[0];

  // Concept demo only: this mock persona stands in for the signed-in viewer's
  // own profile, so the Saved tab is shown. In production this gates on
  // `session.user.id === profile.id` — visiting someone else's page never
  // shows Saved.
  const isOwnProfile = true;

  const [tab, setTab] = useState<TabKey>("posts");

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "posts", label: "Posts", count: profile.postCount },
    { key: "letters", label: "Letters", count: profile.letterCount },
    ...(isOwnProfile ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <div className="w-full bg-background">
      <TerrainHeader profile={profile} meta={meta} />

      {/* The sheet rises over the terrain: negative margin pulls it up so the
          rounded top edge overlaps the front ridge, and the shadow reads as
          the page lifting off the hillside rather than a plain divider. */}
      <div
        className="relative z-10 mx-auto -mt-6 max-w-[1040px] rounded-t-2xl border border-b-0 border-border/70 bg-background pb-4 sm:-mt-8 md:-mt-12"
        style={{
          boxShadow:
            "0 -1px 0 rgba(35,36,30,0.03) inset, 0 -28px 60px -36px rgba(20,26,20,0.45)",
        }}
      >
        <div className={`${CONTAINER} pt-7 md:pt-9`}>
          <FadeRise>
            <FactStrip profile={profile} />
          </FadeRise>

          <div className="mt-4">
            <IdentityStrip profile={profile} firstName={firstName} />
          </div>

          <FadeRise delay={0.05}>
            <AboutBlock about={profile.about} />
          </FadeRise>

          <FadeRise delay={0.1}>
            <FieldNotes profile={profile} />
          </FadeRise>

          <nav className="mt-9 flex flex-wrap items-center gap-2" aria-label="Profile sections">
            {tabs.map((t) => {
              const active = t.key === tab;
              return (
                <SpringPress
                  key={t.key}
                  as="button"
                  aria-pressed={active}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    active
                      ? "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {typeof t.count === "number" && (
                    <span
                      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold ${
                        active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </SpringPress>
              );
            })}
          </nav>
        </div>

        <div className={`${CONTAINER} mt-6 flex flex-col gap-4 pb-2`}>
          {tab === "posts" &&
            (posts.length ? (
              posts.map((p, i) => <EntryCard key={p.id} post={p} index={i} />)
            ) : (
              <EmptyState label="No posts yet" />
            ))}
          {tab === "letters" &&
            (letters.length ? (
              letters.map((p, i) => <EntryCard key={p.id} post={p} index={i} />)
            ) : (
              <EmptyState label="No letters yet" />
            ))}
          {tab === "saved" && (
            <FadeRise>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-mist/50 px-6 py-14 text-center">
                <Bookmark className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.75} />
                <p className="text-[14.5px] font-semibold text-foreground">Nothing saved yet</p>
                <p className="max-w-[36ch] text-[13px] leading-[1.6] text-muted-foreground">
                  Letters and posts you bookmark will collect here, visible only to you.
                </p>
              </div>
            </FadeRise>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Header: layered SVG ridge line + bird + trail sign + name.
 * ------------------------------------------------------------------ */

function TerrainHeader({
  profile,
  meta,
}: {
  profile: ProfileVariantProps["profile"];
  meta: string[];
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Dawn sky wash, warm rather than a cold blue. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-sky) 38%, var(--color-mist)) 0%, color-mix(in srgb, var(--color-sky) 14%, var(--color-mist)) 46%, var(--color-mist) 78%)",
        }}
      />
      {/* Warm glow, low on the horizon, like early light over Rishikonda. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 55% at 72% 62%, color-mix(in srgb, var(--color-cinnamon) 40%, transparent), transparent 70%)," +
            "radial-gradient(32% 40% at 18% 10%, color-mix(in srgb, var(--color-paper) 60%, transparent), transparent 72%)",
        }}
      />

      {/* Three ridge bands. viewBox is 100x40 with preserveAspectRatio="none" so a
          path coordinate (x, y) always lands at (x%, y/40*100%) of the box,
          whatever the header's height at the current breakpoint -- the bird and
          sign below are positioned in that same percentage space. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="ridge-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--color-sky) 45%, var(--color-canopy))" />
            <stop offset="100%" stopColor="var(--color-canopy)" />
          </linearGradient>
          <linearGradient id="ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-leaf)" />
            <stop offset="100%" stopColor="var(--color-canopy)" />
          </linearGradient>
          <linearGradient id="ridge-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--color-canopy) 88%, black)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--color-canopy) 70%, black)" />
          </linearGradient>
        </defs>

        <path
          d="M0,19 C14,11 24,17 36,12 C50,7 62,15 78,10 C88,7 94,11 100,9 L100,40 L0,40 Z"
          fill="url(#ridge-back)"
          opacity="0.45"
        />
        <path
          d="M0,25 C16,18 28,24 42,17 C56,11 66,19 82,14 C90,12 96,15 100,14 L100,40 L0,40 Z"
          fill="url(#ridge-mid)"
          opacity="0.62"
        />
        <path
          d="M0,27 C14,20 26,25 40,18 C52,12 60,20 66,13 C72,7 78,15 88,17 C94,18 98,20 100,19 L100,40 L0,40 Z"
          fill="url(#ridge-front)"
        />
      </svg>

      {/* Hand-grain noise, very faint, ties the header to the field-journal texture
          used elsewhere rather than a flat vector gradient. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden>
        <filter id="valley-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#valley-grain)" />
      </svg>

      {/* Trail sign: the person's Rishi Valley tenure, carried like a distance
          marker. Sits on the front ridge's shoulder, just left of the bird. */}
      {profile.yearJoined && profile.yearLeft && (
        <div
          className="absolute hidden -translate-x-1/2 -translate-y-full sm:block"
          style={{ left: "42%", top: "38%" }}
        >
          <div
            className="flex -rotate-2 items-center gap-1.5 rounded-[3px] border border-black/10 bg-[color-mix(in_srgb,var(--color-cinnamon)_92%,black)] px-2.5 py-1.5 shadow-[0_10px_18px_-12px_rgba(20,15,10,0.55)]"
          >
            <Milestone className="h-3.5 w-3.5 shrink-0 text-paper/80" strokeWidth={2} />
            <span className="whitespace-nowrap font-heading text-[11px] font-bold tracking-[0.02em] text-paper">
              Std {profile.gradeJoined ?? "—"}, {profile.yearJoined}
              <span className="mx-1 text-paper/60">&rarr;</span>
              {profile.yearLeft}
            </span>
          </div>
          {/* the post it hangs from */}
          <div className="ml-4 h-5 w-[3px] rounded-full bg-[color-mix(in_srgb,var(--color-canopy)_60%,black)]" />
        </div>
      )}

      {/* The bird, perched on the tallest point of the front ridge. A soft
          ground shadow keeps its feet planted rather than floating, and a slow
          vertical bob (transform only) is the header's signature breath. */}
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-[78%]"
        style={{ left: "66%", top: "32.5%" }}
        animate={{ y: [0, -4, 0], rotate: [0, -1.2, 0, 1.2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative flex flex-col items-center">
          <div
            aria-hidden
            className="absolute -inset-3 rounded-full opacity-70 blur-md"
            style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-cinnamon) 35%, transparent), transparent 70%)" }}
          />
          <BirdAvatar
            user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
            size={72}
            className="relative drop-shadow-[0_10px_14px_rgba(15,25,15,0.35)]"
          />
          <div
            aria-hidden
            className="mt-[-6px] h-[7px] w-16 rounded-[100%] opacity-45 blur-[2px]"
            style={{ background: "color-mix(in srgb, var(--color-canopy) 70%, black)" }}
          />
        </div>
      </motion.div>

      {/* Name + meta, carved into the front ridge -- the same left edge every
          section below shares. This is the header's only normal-flow child, so
          it (not a fixed pixel height) sets the header's real height: if the
          meta line wraps to two lines on a narrow screen the header simply
          grows to fit, and the rising sheet below can never clip it. */}
      <div
        className={`relative z-10 flex min-h-[220px] flex-col justify-end pb-5 sm:min-h-[240px] sm:pb-6 md:min-h-[280px] md:pb-7 ${CONTAINER}`}
      >
        <h1
          className="font-heading text-[22px] font-bold leading-[1.05] tracking-tight text-paper sm:text-[26px] md:text-[30px]"
          style={{
            textShadow:
              "0 1px 0 rgba(255,255,255,0.12), 0 3px 2px rgba(15,22,15,0.35), 0 14px 28px rgba(10,16,10,0.4)",
          }}
        >
          {profile.name}
        </h1>
        <p
          className="mt-2 text-[13px] font-semibold text-paper/85 sm:text-[14px]"
          style={{ textShadow: "0 2px 10px rgba(10,16,10,0.45)" }}
        >
          {meta.map((part, i) => (
            // A non-breaking space glues the separator to the word before it, so a
            // wrap never strands a lone "·" at the start of the next line --
            // it trails the previous line instead, which reads far more natural.
            <span key={part}>
              {i > 0 && (
                <>
                  {" "}
                  <span aria-hidden className="text-paper/45">
                    &middot;
                  </span>{" "}
                </>
              )}
              {part}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Fact strip: the glanceable line -- batch, city, house, years -- set
 *  right at the top of the rising sheet so the hard facts never require
 *  a scroll, even with the shrunk terrain header above.
 * ------------------------------------------------------------------ */

function FactStrip({ profile }: { profile: ProfileVariantProps["profile"] }) {
  const items: { icon: typeof MapPin; text: string }[] = [];
  if (profile.batchYear) {
    items.push({ icon: GraduationCap, text: `Batch of ${profile.batchYear}` });
  }
  if (profile.currentCity) {
    items.push({ icon: MapPin, text: profile.currentCity });
  }
  if (profile.houses.length > 0) {
    items.push({ icon: Home, text: profile.houses.map((h) => h.house).join(" → ") });
  }
  if (profile.yearJoined != null && profile.yearLeft != null) {
    items.push({ icon: Milestone, text: `${profile.yearJoined}–${profile.yearLeft}` });
  }

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-border/60 pb-4 text-[13px] font-semibold text-foreground/85">
      {items.map(({ icon: Icon, text }, i) => (
        <span key={text} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-leaf" strokeWidth={2} />
          {text}
          {i < items.length - 1 && (
            <span aria-hidden className="ml-1 text-muted-foreground/35">
              &middot;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Identity strip: verified + admission heirloom + links + the two
 *  profile actions -- Follow/Message carries the Canopy fill as the
 *  actual profile-primary action, "Write a letter" rides secondary.
 * ------------------------------------------------------------------ */

function IdentityStrip({
  profile,
  firstName,
}: {
  profile: ProfileVariantProps["profile"];
  firstName: string;
}) {
  const [following, setFollowing] = useState(false);

  return (
    <FadeRise>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {profile.admissionNumber != null && (
            <div className="inline-flex items-center gap-2 rounded-full border border-cinnamon/30 bg-cinnamon/[0.07] py-1 pl-3 pr-3.5">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-cinnamon/80">
                No.
              </span>
              <span className="font-heading text-[15px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {profile.admissionNumber}
              </span>
            </div>
          )}

          <VerifiedMark user={profile} size={15} />

          {profile.links.length > 0 && (
            <div className="flex items-center gap-1.5">
              {profile.links.map((link) => {
                const Icon = LINK_ICON[link.kind];
                return (
                  <a
                    key={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${profile.name} on ${link.label}`}
                    title={link.handle}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-leaf/40 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-90"
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant="primary"
            aria-pressed={following}
            aria-label={following ? `Message ${firstName}` : `Follow ${firstName}`}
            onClick={() => setFollowing((v) => !v)}
          >
            {following ? <MessageCircle /> : <UserPlus />}
            {following ? "Message" : "Follow"}
          </Button>

          <Button type="button" size="sm" variant="outline" aria-label={`Write ${firstName} a letter`}>
            <Feather weight="fill" />
            Write a letter
          </Button>
        </div>
      </div>
    </FadeRise>
  );
}

/* ------------------------------------------------------------------ *
 *  About: "in their words", set like a letter excerpt.
 * ------------------------------------------------------------------ */

function AboutBlock({ about }: { about: string }) {
  return (
    <div className="relative mt-7 border-l-[3px] border-cinnamon/35 pl-5">
      <Quotes className="absolute -left-[11px] -top-1 h-6 w-6 rounded-full bg-card text-cinnamon/70" weight="fill" />
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        In their words
      </p>
      <p className="mt-2 font-sans text-[17px] leading-[1.7] text-foreground/90">
        {about}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Field notes: years at school, houses per year, species -- the
 *  naturalist-journal facts panel, aligned to the same left edge.
 * ------------------------------------------------------------------ */

function FieldNotes({ profile }: { profile: ProfileVariantProps["profile"] }) {
  const hasYears = profile.yearJoined != null && profile.yearLeft != null;
  const hasHouses = profile.houses.length > 0;
  const hasAdmission = profile.admissionNumber != null;
  const hasCity = Boolean(profile.currentCity);

  if (!hasYears && !hasHouses && !hasAdmission && !hasCity) return null;

  return (
    // pl-[22px] (not pl-5) is deliberate: the card's own 1px border plus this
    // padding puts the label text at the exact same 23px inset as the bio
    // quote above (its 3px cinnamon rule + pl-5) -- both blocks now share one
    // left edge instead of the quote reading as indented past the facts.
    <div className="mt-7 rounded-lg border border-border bg-mist/60 py-5 pr-5 pl-[22px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Field notes
      </p>
      <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {hasAdmission && (
          <FactItem label="Admission">
            <span className="font-heading text-[15px] font-bold tracking-tight text-cinnamon tabular-nums">
              No. {profile.admissionNumber}
            </span>
          </FactItem>
        )}

        {hasCity && (
          <FactItem label="City">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-sky" strokeWidth={2} />
              <span className="text-[13.5px] font-semibold text-foreground">{profile.currentCity}</span>
            </span>
          </FactItem>
        )}

        {hasYears && (
          <FactItem label="At Rishi Valley">
            <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              {profile.yearJoined} &ndash; {profile.yearLeft}
            </span>
            {profile.gradeJoined && (
              <span className="ml-1.5 text-[12px] text-muted-foreground">
                joined Std {profile.gradeJoined}
              </span>
            )}
          </FactItem>
        )}

        {hasHouses && (
          // Spans two columns so a multi-house chain (e.g. "Aravali -> Krishna")
          // sits on one line instead of wrapping inside a single narrow column.
          <div className="sm:col-span-2">
            <FactItem label="House">
              <div className="flex flex-wrap items-center gap-1.5">
                {profile.houses.map((h, i) => (
                  <span key={h.house} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-[12px] font-semibold text-foreground">
                      {h.house}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        &rsquo;{String(h.fromYear).slice(-2)}&ndash;&rsquo;{String(h.toYear).slice(-2)}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            </FactItem>
          </div>
        )}

        <FactItem label="Species">
          <span className="inline-flex items-center gap-1.5">
            <BirdIcon className="h-3.5 w-3.5 text-leaf" strokeWidth={2} />
            <span className="text-[13.5px] font-semibold text-foreground">{profile.speciesName}</span>
          </span>
        </FactItem>

        {profile.secondaryCity && (
          <FactItem label="Also spends time in">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-sky/70" strokeWidth={2} />
              <span className="text-[13.5px] font-semibold text-foreground">{profile.secondaryCity}</span>
            </span>
          </FactItem>
        )}
      </div>
    </div>
  );
}

function FactItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/75">
        {label}
      </span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Posts / letters list.
 * ------------------------------------------------------------------ */

function EntryCard({ post, index }: { post: MockPost; index: number }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const isLetter = post.kind === "letter";

  function handleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }

  const plain = post.content
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = plain.length > 220 ? plain.slice(0, 220).trimEnd() + "..." : plain;

  return (
    <FadeRise delay={Math.min(index, 4) * 0.04}>
      <article className="card-elevated rounded-lg border border-border bg-card p-4">
        {isLetter ? (
          <button
            type="button"
            className="block w-full rounded-md border border-border bg-paper/60 p-4 text-left hover:border-leaf/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.995]"
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
              <Feather size={13} weight="fill" />
              Letter
              <span className="text-muted-foreground/70">&middot; {readMinutes(post.content)} min read</span>
            </div>
            <h3 className="mt-2 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-foreground">
              {letterTitle(post.title, post.content)}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-leaf">
              Read this letter
              <ArrowRight size={15} />
            </span>
          </button>
        ) : (
          <p
            className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground"
            dangerouslySetInnerHTML={{ __html: renderRichText(post.content) }}
          />
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">
            {formatTimeAgo(new Date(post.createdAt))}
          </span>
          <div className="-mx-2 flex items-center gap-1 text-muted-foreground">
            <LoveButton liked={liked} count={likeCount} onToggle={handleLike} size="sm" label="Like" />
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px]">
              <ChatCircle size={16} weight="regular" aria-hidden />
              {post.commentCount}
              <span className="sr-only">comments</span>
            </span>
          </div>
        </div>
      </article>
    </FadeRise>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-mist/50 px-6 py-14 text-center text-[13.5px] text-muted-foreground">
      {label}
    </div>
  );
}
