"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Letterhead II (rebuilt 2026-07-30 to the owner's review)
 *
 *  WHAT THE REVIEW ASKED FOR, and where each answer lives:
 *
 *  1. "The thing I liked about letterhead one was the spacing between the
 *     logo and the Rishi Valley text, and then the name, and then the size
 *     of that name, and then the positioning of the verified leaf."
 *     -> The colophon is one 16px row (mark + number, 6px apart) and the
 *        name sits 8px under it, exactly Letterhead I's step. The leaf is
 *        back on the name's BASELINE (`align-baseline`, no lift), which is
 *        where Letterhead I put it, so it reads as a mark on the name
 *        rather than a superscript floating off its shoulder.
 *  2. "We don't need to say number 1385, we can just say 1385."
 *     -> The colophon reads `1385`. Pressing it still stamps the sheet.
 *  3. "I really don't want these weird subtitles. No ISC, no often in
 *     Bangalore, no joined eighth grade. You're conveying no new
 *     information except the cities."
 *     -> The fact band is three label+value pairs and nothing else. Every
 *        sub-line is gone.
 *  4. "Cities are not primary and secondary, they are all equally
 *     important. Batch first, then in the valley, then cities on the
 *     right."
 *     -> `profile.cities` is a flat list, printed as one comma series in
 *        the third (right-hand) column.
 *  5. "The bird can stop moving." / "If they upload a photo we can't have
 *     it floating above; put the circle to the left of the logo and name,
 *     its height from the top of the orange logo to the bottom of the
 *     name."
 *     -> Two masthead modes. No photo: the bird perches on the sheet's own
 *        top edge (Letterhead I's spot, so it costs no vertical space),
 *        dead still, no species name, and still chirps when pressed. Photo
 *        uploaded: no perch at all, a circle on the sheet's left edge whose
 *        diameter is literally `colophon + gap + name line`, with the
 *        colophon, number and name set to its right.
 *  6. "Get in touch in line with the name, at a proper size like we have
 *     in the feed."
 *     -> The shared `GetInTouch` at the app's default button height (40px),
 *        vertically centred on the name's line box by calc, not by eye.
 *  7. "I don't know why we need a horizontal line, and it is not centred."
 *     -> One engraved rule, with the SAME gap above and below it, and only
 *        when there is a body section under it to separate. When About and
 *        Houses are both empty the rule is not drawn, because a divider
 *        that divides nothing is just a line.
 *  8. "Use the posts card we use in feed and the letters card we use in
 *     feed. I don't like this at all."
 *     -> Entries are the shipped `PostCard` itself (`demo` keeps its
 *        actions local against mock ids), not a look-alike, and they sit
 *        BELOW the sheet. Nesting bordered cards inside the bordered
 *        letterhead would be the box-in-a-box the design system forbids;
 *        in their own folder they read exactly as the feed does. Tab
 *        changes cross-fade through auto-animate.
 *  8b. "Use the dossier navigation style, and make sure the mouse on it
 *      doesn't scroll the headings."
 *     -> Dossier's `FolderTab` verbatim (bevelled clip, active tab flush
 *        with the folder, inactive ones sitting 6px lower), attached to a
 *        recessed folder that holds the cards. The strip is NOT a scroll
 *        container the way Dossier's is: see the note above `FolderTab`.
 *  9. "I don't want the lack of elements to look like gaping white space."
 *     -> Nothing reserves space. Sparse (`&sample=sparse`) drops the
 *        number, the occupation, the missing facts, the rule, About and
 *        Houses, so the tabs come straight up under a short sheet.
 *
 *  THE SPACING CONTRACT (the part the review said had to be justified):
 *
 *  - The sheet's padding is EQUAL on all four sides (24px, 40px from sm),
 *    so the name's distance from the top is its distance from the left.
 *  - Vertical gaps come from four levels of the golden-ratio scale and
 *    nothing in between, each chosen by how related the two blocks are
 *    (Gestalt proximity: the gap IS the statement of relatedness):
 *       8px   `--lh2-gap`      colophon -> name        (one lockup)
 *       6px   `--space-xs`     name -> occupation      (title/subtitle)
 *      10px   `--space-s`      section label -> body   (label owns body)
 *      26px   `--space-l`      block -> block          (peer sections)
 *      42px   `--space-xl`     sheet -> the writing    (different objects)
 *    Tokens are `em`, so they are only ever set on elements left at the
 *    16px base size; anywhere the type is smaller the px value is derived
 *    from the identity variables below instead of guessed.
 *  - One left edge: colophon, name, occupation, facts, rule, About and
 *    Houses all start at the sheet's left padding line, and the sheet, the
 *    tab row and the cards all share the column's outer left edge.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { motion, AnimatePresence } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress, SPRINGS, EASE_OUT_SMOOTH, FadeRise } from "@/components/common/motion";
import { HousesTrail } from "./_houses-trail";
import type { MockPost, MockProfile, ProfileVariantProps } from "./_data";

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

/** Stand-in for an uploaded profile picture, to prove the photo masthead. */
const DEMO_PHOTO = "/images/collection/c3.webp";

/**
 * The identity lockup's geometry, declared once and then DERIVED from.
 *
 * Two things in the masthead have to agree with the name's type: the photo
 * circle (its diameter is "top of the mark to the bottom of the name", the
 * owner's own definition) and the Get in touch pill (centred on the name's
 * line box). Both are calc()ed off these, so changing the name size moves
 * them correctly instead of leaving two magic numbers behind.
 */
const IDENTITY_VARS = {
  "--lh2-colophon": "1rem", // the colophon row's fixed height: 16px
  "--lh2-gap": "0.5rem", // colophon -> name, Letterhead I's step: 8px
  "--lh2-name": "clamp(1.9rem, 7vw, 2.6rem)",
  "--lh2-head": "calc(var(--lh2-colophon) + var(--lh2-gap) + var(--lh2-name) * 1.05)",
  // Centre a 40px (h-10) pill on the name's line box.
  "--lh2-cta-top":
    "calc(var(--lh2-colophon) + var(--lh2-gap) + (var(--lh2-name) * 1.05 - 2.5rem) / 2)",
} as CSSProperties;

type TabKey = "all" | "posts" | "letters" | "saved";
type Sample = "full" | "sparse";
type Masthead = "bird" | "photo";

/** Placeholder reach-outs, derived only to exercise the Get in touch dialog
 *  (the mock payload has no email/phone columns; the real `User` does). */
function contactMethodsFor(profile: MockProfile): ContactMethod[] {
  if (profile.links.length === 0) return [];
  const slug = profile.name.toLowerCase().replace(/\s+/g, ".");
  const methods: ContactMethod[] = [
    { kind: "email", label: "Email", value: `${slug}@example.com`, href: `mailto:${slug}@example.com` },
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
    profile.cities[0] ? `ADR:;;;${profile.cities[0]};;;` : null,
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
    currentCity: "",
    secondaryCity: null,
    cities: [],
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

/** Mock post -> the shipped card's payload. Everything the mock has no column
 *  for (tags, images, polls, city scope) is honestly null rather than faked. */
function toPostData(post: MockPost, author: MockProfile): PostData {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title ?? null,
    content: post.content,
    tag: null,
    images: null,
    cityScope: null,
    createdAt: post.createdAt,
    author: {
      id: author.id,
      name: author.name,
      photoUrl: author.photoUrl,
      birdOverride: null,
      accountType: author.accountType,
      verifyState: author.verifyState,
      batchType: author.batchType,
      batchYear: author.batchYear,
    },
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    liked: false,
    bookmarked: DEMO_SAVED_IDS.has(post.id),
    isOwn: IS_OWN_PROFILE,
    poll: null,
  };
}

export default function LetterheadTwoVariant({ profile }: ProfileVariantProps) {
  // ?sample=sparse and ?avatar=photo deep-link the other three states, so a
  // screenshot agent can shoot all four without clicking anything. Read as the
  // initial value only; the toggles own the state from then on. (Safe against
  // a prerendered shell because the harness page keeps this whole tree inside
  // a Suspense boundary, which is exactly what useSearchParams asks for.)
  const searchParams = useSearchParams();
  const [sample, setSample] = useState<Sample>(() =>
    searchParams.get("sample") === "sparse" ? "sparse" : "full"
  );
  const [masthead, setMasthead] = useState<Masthead>(() =>
    searchParams.get("avatar") === "photo" ? "photo" : "bird"
  );

  const base = sample === "full" ? profile : sparseOf(profile);
  const active: MockProfile =
    masthead === "photo" ? { ...base, photoUrl: DEMO_PHOTO } : { ...base, photoUrl: null };

  return (
    <>
      {/* The concept starts at the very top of the shell's own gutter, the way
          the shipped profile would, with no lab furniture above it. The only
          top padding is the perch clearance the bird needs to hang over the
          sheet's edge without being cut off. No horizontal padding of its own
          either: the shell owns the gutter in the real app, so it owns it
          here. */}
      <div className="mx-auto w-full max-w-3xl pb-[var(--space-xl)] pt-[var(--space-m)] sm:pt-[var(--space-l)]">
        {/* Keyed so all sheet state (tab, stamp, likes) resets with the mock. */}
        <Letterhead key={`${sample}-${masthead}`} profile={active} />
      </div>

      {/* Lab chrome, floated off to the side so it never sits in the concept's
          own space: a panel on the right edge from lg up (where the page has
          empty margin to spare), a glass bar above the mobile nav below that.
          Not part of the concept. */}
      <div
        className="glass fixed bottom-20 left-1/2 z-[var(--z-overlay)] flex -translate-x-1/2 flex-row items-center gap-[var(--space-m)] rounded-[var(--radius)] border border-border p-2.5 lg:bottom-auto lg:left-auto lg:right-5 lg:top-36 lg:translate-x-0 lg:flex-col lg:items-start lg:gap-[var(--space-s)]"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.06), 0 18px 40px -28px rgba(35,36,30,0.7)" }}
      >
        <ToggleGroup
          label="Preview data"
          options={[
            { key: "full", label: "Full" },
            { key: "sparse", label: "Sparse" },
          ]}
          value={sample}
          onChange={(k) => setSample(k as Sample)}
        />
        <ToggleGroup
          label="Avatar"
          options={[
            { key: "bird", label: "Bird" },
            { key: "photo", label: "Photo" },
          ]}
          value={masthead}
          onChange={(k) => setMasthead(k as Masthead)}
        />
      </div>
    </>
  );
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    /* A row on the mobile bar, a labelled stack in the desktop panel, which
       keeps the panel narrow enough to sit clear of the sheet's right edge. */
    <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-start lg:gap-1.5">
      {/* The labels earn their room only in the desktop side panel; the mobile
          bar floats over the concept, so it stays as small as it can. */}
      <span className="hidden whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 lg:inline">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {options.map((o) => (
          <SpringPress
            key={o.key}
            as="button"
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              value === o.key
                ? "border-transparent bg-canopy text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </SpringPress>
        ))}
      </div>
    </div>
  );
}

function Letterhead({ profile }: { profile: MockProfile }) {
  const methods = contactMethodsFor(profile);
  const about = profile.about.trim();
  const hasPhoto = Boolean(profile.photoUrl);

  /* Exactly three possible facts, in the owner's order, with no sub-lines:
     batch, then the valley years, then every city as one equal series. */
  const facts: { label: string; value: string; wide?: boolean }[] = [];
  if (profile.batchYear) facts.push({ label: "Batch", value: String(profile.batchYear) });
  if (profile.yearJoined && profile.yearLeft) {
    facts.push({ label: "In the valley", value: `${profile.yearJoined}-${profile.yearLeft}` });
  }
  if (profile.cities.length > 0) {
    facts.push({
      label: profile.cities.length > 1 ? "Cities" : "City",
      // Wide on the 2-column phone grid: a comma series is the one fact that
      // can run long, and clipping someone's third city to fit a column is
      // exactly the ranking the owner asked to remove.
      wide: true,
      value: profile.cities.join(", "),
    });
  }

  /* The rule only exists to separate the masthead from a body. No body, no
     rule (the review: "nothing below it, it is just separating nothing"). */
  const hasBody = Boolean(about) || profile.houses.length > 0;

  /* The stamp: pressed in on demand, held a moment, faded away. */
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

  /* The photo circle's diameter is the owner's definition of it, taken from
     the DOM rather than assumed: "from the top of that orange logo to the
     bottom of the name". The calc in IDENTITY_VARS is the first-paint value
     and is exact whenever the name holds one line; this observer is what keeps
     the promise when a long name wraps on a phone. The loop settles because a
     wider circle can only ever push the name to MORE lines, never back to
     fewer, so height is monotonic and converges after one correction. */
  const lockupRef = useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState<number | null>(null);
  useEffect(() => {
    const el = lockupRef.current;
    if (!hasPhoto || !el) return;
    // ResizeObserver reports the initial size on observe(), so the first
    // measurement arrives through the same callback as every later one.
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      setDiameter((prev) => (prev !== null && Math.abs(prev - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);
  const circle = diameter ? `${diameter}px` : "var(--lh2-head)";

  const cta =
    methods.length > 0 ? (
      <GetInTouch
        name={profile.name}
        methods={methods}
        vcard={buildVcard(profile, methods)}
        showSave={false}
        size="default"
      />
    ) : null;

  return (
    <>
      {/* Not clipped, so the perched bird can overlap the sheet's own edge. */}
      <div className="relative" style={IDENTITY_VARS}>
        {!hasPhoto && <PerchedBird profile={profile} />}

        <div
          data-lh2="sheet"
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

          {/* EQUAL padding on all four sides. */}
          <div className="relative p-6 sm:p-10">
            <FadeRise>
              <header data-lh2="header">
                <div className="flex items-start gap-[var(--space-m)]">
                  {/* Photo masthead: the circle starts on the sheet's own left
                      edge, level with the mark, and ends on the bottom of the
                      name. Nothing else in the sheet indents for it. */}
                  {hasPhoto && (
                    <span
                      data-lh2="photo"
                      className="block shrink-0 overflow-hidden rounded-full border border-border/60 bg-mist"
                      style={{ width: circle, height: circle }}
                      role="img"
                      aria-label={profile.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.photoUrl ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}

                  {/* The lockup, and ONLY the lockup: mark, number, name. The
                      occupation is deliberately outside it, so the measured
                      circle answers the owner's "top of the logo to the bottom
                      of the name" and not a line more. */}
                  <div ref={lockupRef} data-lh2="lockup" className="min-w-0 flex-1">
                    {/* A block-level row, not inline-flex: an inline box would
                        add its line's leading under the mark and quietly turn
                        the 8px step into 14.5px. */}
                    {profile.admissionNumber ? (
                      <button
                        type="button"
                        data-lh2="colophon"
                        onClick={fireStamp}
                        aria-label={`Admission number ${profile.admissionNumber}. Press to stamp the sheet.`}
                        className="flex h-[var(--lh2-colophon)] w-fit items-center gap-1.5 rounded-sm text-cinnamon transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-60"
                      >
                        <PeaksMark size={15} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                          {profile.admissionNumber}
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        data-lh2="colophon"
                        className="flex h-[var(--lh2-colophon)] w-fit items-center text-cinnamon"
                      >
                        <PeaksMark size={15} />
                      </span>
                    )}

                    {/* The leaf rides inline after the last word so a wrapping
                        name never strands it on a line of its own, and sits on
                        the BASELINE, which is where Letterhead I had it. */}
                    <h1
                      className="mt-[var(--lh2-gap)] font-heading font-bold tracking-[-0.03em] text-foreground"
                      style={{ fontSize: "var(--lh2-name)", lineHeight: 1.05 }}
                    >
                      {profile.name}
                      <span className="ml-2.5 inline-flex align-baseline">
                        <VerifiedMark user={profile} size={16} />
                      </span>
                    </h1>
                  </div>

                  {/* The one action, in line with the name: the pill's box is
                      centred on the name's first line by calc, not by eye.
                      Held back on phones, where a 40px pill beside a 30px
                      display name would squeeze the name's own column. */}
                  {cta && (
                    <div
                      className="hidden shrink-0 sm:block"
                      style={{ marginTop: "var(--lh2-cta-top)" }}
                    >
                      {cta}
                    </div>
                  )}
                </div>

                {(profile.jobTitle || profile.workplace) && (
                  <p className="mt-[var(--space-xs)] text-[15px] leading-[1.6] text-muted-foreground">
                    {profile.jobTitle && (
                      <span className="font-semibold text-foreground">{profile.jobTitle}</span>
                    )}
                    {profile.jobTitle && profile.workplace ? " at " : null}
                    {profile.workplace}
                  </p>
                )}

                {cta && <div className="mt-[var(--space-m)] sm:hidden">{cta}</div>}
              </header>

              {facts.length > 0 && (
                <dl className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] sm:grid-cols-3">
                  {facts.map((f) => (
                    <div key={f.label} className={f.wide ? "col-span-2 sm:col-span-1" : "min-w-0"}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                        {f.label}
                      </dt>
                      <dd className="mt-[var(--space-xs)] text-[17px] font-semibold leading-[1.35] text-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* The letterhead's one engraved rule, with equal air above and
                  below it, and only when it has two things to sit between. */}
              {hasBody && (
                <div
                  aria-hidden
                  className="mt-[var(--space-l)] h-[3px] w-full rounded-full"
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(0,0,0,0.14), inset 0 -1px 0 rgba(255,255,255,0.55)",
                  }}
                />
              )}
            </FadeRise>

            {about && (
              <FadeRise delay={0.06}>
                <section className="mt-[var(--space-l)]">
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
          </div>
        </div>
      </div>

      <Writing profile={profile} />
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">{children}</p>
  );
}

/* ------------------------------------------------------------------ *
 *  The bird, perched on the sheet's own top edge exactly where
 *  Letterhead I put it, so it costs the masthead no vertical space.
 *  Still: the idle bob is gone (owner: "don't keep moving the bird").
 *  No species name. Pressing it chirps, three cinnamon arcs and a thump,
 *  because that only happens when someone asks for it.
 * ------------------------------------------------------------------ */
function PerchedBird({ profile }: { profile: MockProfile }) {
  const [chirp, setChirp] = useState(0);

  return (
    /* Scaled from its FEET on phones (origin-bottom), so the perch line stays
       put at both sizes and only one offset has to be right. */
    <div className="absolute -top-12 right-6 z-20 origin-bottom scale-[0.8] sm:right-10 sm:scale-100">
      <button
        type="button"
        onClick={() => setChirp((c) => c + 1)}
        aria-label={`${profile.name}'s bird. Tap for a chirp.`}
        className="relative block rounded-full outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.95]"
      >
        <motion.span
          key={chirp}
          initial={chirp > 0 ? { scale: 1.1, rotate: -6 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={SPRINGS.snappy}
          className="block"
        >
          <BirdAvatar
            user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
            size={80}
          />
        </motion.span>

        {chirp > 0 && (
          <span
            key={`arcs-${chirp}`}
            aria-hidden
            className="pointer-events-none absolute right-[-2px] top-[22px]"
          >
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

      {/* A soft contact shadow on the paper: what makes it read as perched on
          the edge rather than pasted over it. */}
      <span
        aria-hidden
        className="mx-auto -mt-1 block h-2 w-11 rounded-full"
        style={{ background: "var(--color-ink)", opacity: 0.14, filter: "blur(3px)" }}
      />
    </div>
  );
}

/**
 * The switcher. Not underline tabs (a 2px line sliding under grey text is not
 * a control, it is a hint) and not folder tabs (those need a folder, and
 * boxing the post tiles inside another box is exactly what this page is
 * trying not to do). This is the app's OWN segmented pill: a paper track at
 * the same 40px height as every filter pill in the product, with one canopy
 * fill that GLIDES between segments on a shared `layoutId`. It already exists
 * in shipped code as the Catch-ups cadence control
 * (src/components/catchups/create/cadence-control.tsx), which is why it reads
 * as part of the furniture instead of as a one-off invented for this page. If
 * this concept ships, that control and this one should be extracted to one
 * shared `SegmentedPills` in src/components/common/.
 *
 * What it adds over the cadence control: a live count per segment, so the
 * switcher carries information rather than just state, and it survives a
 * 390px viewport with all four labels visible, so it never needs to become a
 * scroll container. That matters beyond tidiness: a horizontally scrollable
 * strip swallows the wheel, and parking the pointer on it stops the page and
 * slides the labels sideways instead (owner, 2026-07-30, on Dossier's
 * `overflow-x-auto` tab row). There is nothing here to scroll.
 *
 * Hover never moves it (owner rule): hover is colour, the press sink is the
 * only transform.
 */
function WritingSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-border bg-card p-1"
      style={{
        boxShadow:
          "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)",
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] sm:px-4 ${
              active ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="lh2WritingThumb"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={SPRINGS.snappy}
                className="absolute inset-0 rounded-full bg-canopy shadow-[0_5px_13px_-12px_var(--color-canopy)]"
              />
            )}
            <span className="relative">{o.label}</span>
            <span
              className={`relative text-[11.5px] font-semibold tabular-nums ${
                active ? "text-white/70" : "text-muted-foreground/60"
              }`}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  What they have written: the switcher, then the shipped PostCard
 *  standing free on the page. No folder, no board, no container of any
 *  kind around the tiles (owner, 2026-07-30: "the post tiles aren't in
 *  anything"), so the sheet, the switcher and every card share the
 *  column's one outer left edge and the cards read exactly as the feed's.
 * ------------------------------------------------------------------ */
function Writing({ profile }: { profile: MockProfile }) {
  const sorted = [...profile.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const TABS: { key: TabKey; label: string; items: MockPost[]; empty: string }[] = [
    { key: "all", label: "All", items: sorted, empty: "Nothing here yet." },
    {
      key: "posts",
      label: "Posts",
      items: sorted.filter((p) => p.kind === "post"),
      empty: "No posts yet.",
    },
    {
      key: "letters",
      label: "Letters",
      items: sorted.filter((p) => p.kind === "letter"),
      empty: "No letters yet.",
    },
  ];
  if (IS_OWN_PROFILE) {
    TABS.push({
      key: "saved",
      label: "Saved",
      items: sorted.filter((p) => DEMO_SAVED_IDS.has(p.id)),
      empty: "Nothing saved yet.",
    });
  }

  const [tab, setTab] = useState<TabKey>("all");
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const [listRef] = useAutoAnimate();

  return (
    <FadeRise delay={0.12}>
      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        <WritingSwitch
          options={TABS.map((t) => ({ key: t.key, label: t.label, count: t.items.length }))}
          value={tab}
          onChange={setTab}
        />

        {/* Nothing wraps the tiles. auto-animate cross-fades the swap, so
            switching reads as the same stack re-settling rather than a cut. */}
        <div ref={listRef} className="mt-[var(--space-m)] space-y-2.5">
          {active.items.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
              <p className="font-heading text-lg tracking-tight text-foreground">{active.empty}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Share a memory, a sighting, or a note for the valley.
              </p>
            </div>
          ) : (
            active.items.map((post) => (
              <PostCard key={post.id} post={toPostData(post, profile)} variant="card" demo />
            ))
          )}
        </div>
      </div>
    </FadeRise>
  );
}
