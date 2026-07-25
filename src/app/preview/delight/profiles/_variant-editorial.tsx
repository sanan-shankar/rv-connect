"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Editorial — "The Contributor Page"
 *
 *  A magazine profile spread, not a card. No banner photo, no bordered
 *  box around the whole page — colour and structure come from type and
 *  a small set of rules, echoing the register the Letters detail view
 *  earned "dang" for (Libre Baskerville body copy, a cinnamon kicker, a
 *  cinnamon underline draw). Two columns below the masthead: a narrow
 *  left rail (bird, species, verified leaf, compact facts, contact
 *  links) and a wide right column (About run as a standfirst with a
 *  cinnamon drop cap, then posts/letters as a dated article list). Both
 *  columns start flush at the same left edge and the same y-position
 *  directly under the masthead rule, so "Details" never reads as
 *  floating separately from the posts the way the old header did.
 *
 *  Signature moments:
 *   1. A cinnamon underline draws in beneath the display name on
 *      mount — the exact motif from LetterTitle, reused here to tie
 *      the profile masthead to the page the owner already loves.
 *   2. A true floating drop cap opens the About standfirst, set in a
 *      soft cinnamon-tinted block instead of a plain oversized letter.
 *
 *  Post-review polish (design-judge pass): the masthead name is capped at
 *  ~64px desktop / ~40px mobile so it stops eating the top third; the
 *  admission number moved off the low-contrast masthead into a proper
 *  Canopy-labelled sidebar field; and mobile now opens with a compact
 *  avatar+identity row (not the giant name alone) followed by the sidebar
 *  facts as a 2-column grid instead of a tall single-column stack. The
 *  masthead markup keeps exactly one real `<h1>` — the mobile identity row
 *  wraps it in a flex row via a `md:contents` child so the same heading
 *  reflows into the plain stacked masthead at md+ rather than duplicating it.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import { Feather, Instagram, Linkedin, MessageCircle, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { FadeRise, EASE_POP } from "@/components/common/motion";
import { metaParts, readMinutes, type MockLink, type MockPost, type ProfileVariantProps } from "./_data";

function FactRow({
  label,
  accent,
  className,
  children,
}: {
  label: string;
  /** Canopy-tinted label instead of the usual muted gray — reserved for the
   *  admission field so it reads as an heirloom detail, not lost metadata. */
  accent?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt
        className={`font-heading text-[10.5px] font-semibold uppercase tracking-[0.14em] ${
          accent ? "text-canopy" : "text-muted-foreground/70"
        }`}
      >
        {label}
      </dt>
      <dd className="mt-1.5 text-[14px] leading-[1.55] text-foreground">{children}</dd>
    </div>
  );
}

function LinkChip({ link }: { link: MockLink }) {
  const Icon = link.kind === "instagram" ? Instagram : Linkedin;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-px hover:border-leaf/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.97]"
    >
      <Icon className="h-3.5 w-3.5 text-cinnamon" aria-hidden />
      {link.handle}
    </a>
  );
}

/** A real floating drop cap (CSS float, not a faked first-letter span) set in a soft
 *  cinnamon block, so the About text reads like a standfirst opening a feature. */
function Standfirst({ text }: { text: string }) {
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <p className="mt-4 font-heading text-[18.5px] leading-[1.75] text-foreground sm:text-[19.5px]">
      <span className="float-left mr-3 mb-1 grid h-[50px] w-[50px] place-items-center rounded-[14px] bg-cinnamon/10 text-[32px] font-bold leading-none text-cinnamon sm:h-[56px] sm:w-[56px] sm:text-[36px]">
        {first}
      </span>
      {rest}
    </p>
  );
}

function ArticleRow({ post }: { post: MockPost }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const isLetter = post.kind === "letter";
  const date = new Date(post.createdAt);
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const year = date.getFullYear();
  const plain = post.content.replace(/\s+/g, " ").trim();

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount(next ? likeCount + 1 : likeCount - 1);
  }

  return (
    <article className="group py-7 first:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-7">
        <div className="flex shrink-0 items-baseline gap-1.5 font-heading text-muted-foreground sm:w-20 sm:flex-col sm:items-start sm:gap-0.5">
          <span className="text-[13px] font-semibold tracking-wide text-foreground/70">{day}</span>
          <span className="text-[11.5px] text-muted-foreground/70">{year}</span>
        </div>

        <div className="min-w-0 flex-1">
          {isLetter ? (
            <>
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
                <Feather className="h-3.5 w-3.5" aria-hidden />
                Letter
                <span className="text-muted-foreground/60">· {readMinutes(post.content)} min read</span>
              </div>
              {/* Real destination in the shipped app would be /letters/[id]; a no-op here since
                  this mock letter has no row in the database. Still a genuine button, not a div,
                  so it carries proper hover/focus/active states. */}
              <button
                type="button"
                onClick={() => {}}
                className="relative mt-1.5 block text-left font-heading text-[19px] font-bold leading-[1.25] tracking-tight text-foreground transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-sm active:scale-[0.99] sm:text-[20px]"
              >
                {post.title}
              </button>
              <p className="mt-2 line-clamp-2 font-heading text-[14.5px] leading-[1.7] text-muted-foreground">
                {plain}
              </p>
            </>
          ) : (
            <p className="line-clamp-3 font-heading text-[15px] leading-[1.7] text-foreground/90">{plain}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1">
            <LoveButton
              liked={liked}
              count={likeCount}
              onToggle={toggleLike}
              label={liked ? "Unlike" : "Like"}
              className="-ml-2.5"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-muted-foreground">
              <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
              {post.commentCount}
            </span>
            {isLetter && (
              <span
                aria-hidden
                className="ml-auto hidden items-center gap-1 text-[12.5px] font-semibold text-leaf opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:inline-flex"
              >
                Read the letter <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function EditorialVariant({ profile }: ProfileVariantProps) {
  const meta = metaParts(profile);
  const yearsAtSchool =
    profile.yearJoined && profile.yearLeft ? profile.yearLeft - profile.yearJoined : null;
  const posts = [...profile.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-10 sm:px-8 md:px-10 md:py-14">
      {/* Masthead. On mobile this is a compact avatar+identity 2-up row — the
          bird sits to the left of the name so the page opens with a portrait,
          not a lone giant word. At md+ the wrapper's `md:contents` drops out
          of the flex row entirely, so the name/underline/meta fall back to a
          plain stacked masthead and the avatar (hidden here) lives in the
          sidebar instead. One real `<h1>`, no duplicated heading. */}
      <FadeRise y={14} className="flex items-start gap-4 md:block">
        <div className="shrink-0 md:hidden">
          <BirdAvatar
            user={{
              id: profile.id,
              name: profile.name,
              photoUrl: profile.photoUrl,
              avatarSpecies: profile.avatarSpecies,
            }}
            ring
          />
        </div>

        <div className="min-w-0 flex-1 md:contents">
          <div className="relative inline-block max-w-full">
            <h1 className="text-[clamp(2.5rem,1.7rem_+_3.2vw,4rem)] font-heading font-bold leading-[0.96] tracking-[-0.03em] text-foreground">
              {profile.name}
            </h1>
            <motion.span
              aria-hidden
              className="absolute -bottom-1 left-0.5 h-[3px] w-16 rounded-sm md:w-24"
              style={{
                transformOrigin: "left center",
                background:
                  "linear-gradient(90deg, var(--color-cinnamon), color-mix(in srgb, var(--color-cinnamon) 30%, transparent))",
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: EASE_POP, delay: 0.25 }}
            />
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] uppercase tracking-[0.09em] text-muted-foreground md:mt-5 md:text-[13.5px]">
            {meta.map((part, i) => (
              <span key={part} className="inline-flex items-center gap-1.5">
                {i > 0 && (
                  <span className="dotsep" aria-hidden>
                    ·
                  </span>
                )}
                {part}
              </span>
            ))}
          </p>
        </div>
      </FadeRise>

      <div className="mt-8 h-px w-full bg-gradient-to-r from-canopy/70 via-border to-transparent md:mt-9" />

      {/* Body: left rail + right column, both starting flush at the same edge and the same y. */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:mt-10 md:grid-cols-[260px_1fr] md:gap-16">
        <FadeRise y={14} delay={0.08}>
          <aside className="md:border-r md:border-border/70 md:pr-10">
            {/* Desktop-only: the mobile masthead already showed the bird up top. */}
            <div className="hidden md:block">
              <BirdAvatar
                user={{
                  id: profile.id,
                  name: profile.name,
                  photoUrl: profile.photoUrl,
                  avatarSpecies: profile.avatarSpecies,
                }}
                size="lg"
                ring
              />
            </div>
            <div className="flex items-center gap-1.5 md:mt-4">
              <p className="font-heading text-[11.5px] font-semibold uppercase tracking-[0.13em] text-cinnamon">
                {profile.speciesName}
              </p>
              <VerifiedMark user={profile} size={13} />
            </div>

            {/* Mobile: a 2-column label/value grid, not full-width stacked blocks —
                cuts the sidebar's vertical length so it never reads as an empty
                single column. Desktop keeps the original stacked list. Houses and
                "Also based in" span both columns since their values run long. */}
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 md:mt-8 md:block md:space-y-6">
              {profile.admissionNumber !== null && (
                <FactRow label="Admission" accent>
                  <span className="font-semibold">No. {profile.admissionNumber}</span>
                </FactRow>
              )}

              {yearsAtSchool !== null && (
                <FactRow label="At Rishi Valley">
                  <span className="font-semibold">
                    {profile.yearJoined}–{profile.yearLeft}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    {yearsAtSchool} years
                    {profile.gradeJoined ? ` · joined grade ${profile.gradeJoined}` : ""}
                  </span>
                </FactRow>
              )}

              {profile.houses.length > 0 && (
                <FactRow label="Houses" className="col-span-2 md:col-span-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {profile.houses.map((h, i) => (
                      <span key={h.house} className="inline-flex items-center gap-1.5">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />}
                        {h.house}
                        <span className="text-muted-foreground/60">
                          '{String(h.fromYear).slice(2)}–'{String(h.toYear).slice(2)}
                        </span>
                      </span>
                    ))}
                  </span>
                </FactRow>
              )}

              {profile.secondaryCity && (
                <FactRow label="Also based in" className="col-span-2 md:col-span-1">
                  {profile.secondaryCity}
                </FactRow>
              )}
            </dl>

            {profile.links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 md:mt-8">
                {profile.links.map((link) => (
                  <LinkChip key={link.kind} link={link} />
                ))}
              </div>
            )}
          </aside>
        </FadeRise>

        <FadeRise y={14} delay={0.14}>
          <div className="min-w-0">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
              In their words
            </p>
            <Standfirst text={profile.about} />

            <div className="mt-10 h-px w-full bg-border" />

            <div className="mt-7 flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Posts &amp; Letters
              </h2>
              <span className="text-[12.5px] text-muted-foreground/70">
                {profile.postCount} posts · {profile.letterCount} letter{profile.letterCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="divide-y divide-border">
              {posts.map((post) => (
                <ArticleRow key={post.id} post={post} />
              ))}
            </div>
          </div>
        </FadeRise>
      </div>
    </div>
  );
}
