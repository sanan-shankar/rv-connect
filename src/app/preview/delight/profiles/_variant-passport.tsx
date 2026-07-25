"use client";

/* ------------------------------------------------------------------ *
 *  Concept A: PASSPORT
 *
 *  Identity first. The page is a real two-column composition on a
 *  laptop: a sticky identity column on the left (portrait plate, name,
 *  "Get in touch") and the folder tabs plus their panel on the right.
 *  On a phone it becomes one ordered stack: picture, who they are, how
 *  to reach them, then the record.
 *
 *  WHY THE PORTRAIT PLATE. The shipped page crops the uploaded picture
 *  into a ~6.4:1 band, which shows about a quarter of a 3:2 source at
 *  roughly 5x magnification. Here the plate is 4:5 on desktop and 3:2
 *  on mobile with an explicit `object-position: 50% 30%`, so the crop is
 *  art-directed and most of the frame survives. The plate ends at a hard
 *  bordered edge; nothing fades from the photo into the surface.
 *
 *  Rules this concept is built against (docs/planning/profile-concepts-
 *  brief.md sec 1), all deliberate:
 *   - no decorative watermark or glyph parked in dead space
 *   - solid hairlines only, never dashed or dotted
 *   - hover changes colour and nothing else; only :active presses
 *   - About is the first and default tab
 *   - email and phone live behind "Get in touch", never beside the name
 *   - valley years read "2014-2021", never "7 years"
 *   - nothing on the page owns a vertical scroller of its own
 *
 *  From the THIRD owner review (2026-07-25), all load-bearing:
 *   - THE LINE UNDER THE NAME IS THE OCCUPATION. "Let the subtitle to the
 *     name be the occupation and organisation." So it reads "Software
 *     Engineer at Bluepeak Systems" and nothing else. The batch moved down
 *     into the record ("batch doesn't have to be that close to the name, it
 *     can be elsewhere") and the city is gone from up here entirely ("don't
 *     have the city under the name, it's not that important").
 *   - THE RECORD IS TWO FACTS PLUS WHERE THEY LIVE. "We don't have to
 *     specify what batch entered and all. Just batch of whatever and what
 *     years they were there." The old "Entered / Grade 4" cell is deleted.
 *   - THE CITY LABEL IS PLURAL-TOLERANT. "Based in" promised one place and
 *     then printed two, so the label counts: "City" for one, "Cities" for
 *     several.
 *   - NOTHING CONTACTABLE IS PRINTED ON THE SURFACE. "I love this idea of
 *     only when you say contact them does their email and number and stuff
 *     come out. That's how it should be everywhere", and "don't think the
 *     LinkedIn and IG need to be there outside and inside the Get in touch."
 *     The "Find them" pills are gone; Instagram, LinkedIn and any custom
 *     link sit inside the Get in touch dialog beside the email and phone,
 *     exactly as the shipped page now does it.
 *   - THE ADMISSION NUMBER IS AN ARTEFACT, NOT A FIELD. "I don't want it
 *     like any other text field. Something special about it." It is the
 *     cinnamon double-ruled stamp on the plate, and it appears nowhere else
 *     on the page as plain labelled text.
 *
 *  From the second owner review, still load-bearing:
 *   - HOUSES ARE A DETAIL, NOT A SECTION. "House is just a fun thing, it's
 *     not that important, you're making it 50% of the profile." The chain
 *     is the shipped one, unrestyled, and it rides as a quiet strip at the
 *     foot of the record. No heading of its own, no band, no subtitle.
 *   - THE BIRD SPECIES IS NEVER PAINTED. "They can see it by clicking the
 *     bird." It survives only in ProfileAvatar's aria-label and its own
 *     tap chip, which is exactly where the owner put it.
 *   - ONE TYPE LADDER. Prose was serif at 16.5px while every other body in
 *     the app is sans at 15px, which read as a mistake. Everything here now
 *     sits on the app's rungs: 30px name / 20px title / 15px body /
 *     13.5px small / 12.5-13px secondary / 10.5-11px uppercase labels.
 *     Libre Baskerville is for the name and titles, never for paragraphs.
 *   - The preview harness supplies the app frame (sidebar, valley back-
 *     layer, a max-w-[1280px] <main> with its own gutters), so this file
 *     paints no page background, adds no max-width wrapper, and adds no
 *     gutters of its own.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Feather, Images, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { Button } from "@/components/ui/button";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import { HousesTrail } from "./_houses-trail";
import {
  readMinutes,
  type MockPost,
  type MockProfile,
  type ProfileVariantProps,
} from "./_data";

/* The folder-tab silhouette, lifted from the shipped ProfileShell: the
   owner said the tabs are the one thing that already works. Same cut,
   same flush-against-the-body active state, minus any hover movement. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

type TabKey = "about" | "posts" | "letters" | "photos";

const TABS: { key: TabKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "posts", label: "Posts" },
  { key: "letters", label: "Letters" },
  { key: "photos", label: "Photos" },
];

/* ------------------------------------------------------------------ *
 *  Formatting
 * ------------------------------------------------------------------ */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The one line under the name: what they do and where they do it. Owner:
 * "let the subtitle to the name be the occupation and organisation." No
 * batch (it sits in the record now), no city, no species, no contact.
 */
function occupationLine(profile: MockProfile): string | null {
  const { jobTitle, workplace } = profile;
  if (jobTitle && workplace) return `${jobTitle} at ${workplace}`;
  return jobTitle ?? workplace ?? null;
}

/**
 * Where they live, under a label that counts. "Based in" promised one place
 * and then listed two, so the label is plural-tolerant: "City" for one,
 * "Cities" for several. The real `User` already stores several (Place rows,
 * plus currentCity/secondaryCity), so this is the honest shape.
 */
function citiesFact(profile: MockProfile): { label: string; value: string } | null {
  const cities = [profile.currentCity, profile.secondaryCity].filter(
    (c): c is string => Boolean(c)
  );
  if (cities.length === 0) return null;
  return { label: cities.length > 1 ? "Cities" : "City", value: cities.join(" · ") };
}

/** Two years and a hyphen. Never a year count: people can subtract. */
function valleyYears(profile: MockProfile): string | null {
  const { yearJoined, yearLeft } = profile;
  if (yearJoined && yearLeft) return `${yearJoined}-${yearLeft}`;
  if (yearJoined) return `From ${yearJoined}`;
  if (yearLeft) return `Until ${yearLeft}`;
  return null;
}

/** The opening of a letter, two paragraphs at most. The full text lives on the letter's own page. */
function letterOpening(content: string): string {
  return content.split("\n\n").slice(0, 2).join("\n\n");
}

/**
 * EVERY way of reaching this person, in ONE place: the Get in touch dialog.
 *
 * Owner, third review: "I love this idea of only when you say contact them
 * does their email and number and stuff come out. That's how it should be
 * everywhere", and "don't think the LinkedIn and IG need to be there
 * outside and inside the Get in touch." So Instagram and LinkedIn are not
 * pills on the page any more, they are rows in here beside the email and
 * the phone. Nothing contactable is printed on the surface at all.
 *
 * The mock payload carries no email or phone column (the real `User` does:
 * email / displayEmail / phone), so both are stand-ins that show the slots
 * working. The point of the rule is where these live, not what they say.
 */
function stubEmail(profile: MockProfile): string {
  return `${profile.name.trim().toLowerCase().replace(/\s+/g, ".")}@example.com`;
}

const STUB_PHONE = "+91 98840 21385";

function contactMethods(profile: MockProfile): ContactMethod[] {
  const email = stubEmail(profile);
  return [
    { kind: "email", label: "Email", value: email, href: `mailto:${email}` },
    {
      kind: "phone",
      label: "Phone",
      value: STUB_PHONE,
      href: `tel:${STUB_PHONE.replace(/\s+/g, "")}`,
    },
    ...profile.links.map((link) => ({
      kind: link.kind,
      label: link.label,
      value: link.handle,
      href: link.href,
      external: true,
    })),
  ];
}

function vcardFor(profile: MockProfile): string {
  const org = [profile.jobTitle, profile.workplace].filter(Boolean).join(", ");
  const cities = [profile.currentCity, profile.secondaryCity].filter(Boolean) as string[];
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    org ? `TITLE:${org}` : null,
    `EMAIL:${stubEmail(profile)}`,
    `TEL:${STUB_PHONE.replace(/\s+/g, "")}`,
    ...cities.map((city) => `ADR:;;${city};;;;`),
    ...profile.links.map((link) => `URL:${link.href}`),
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ *
 *  Small shared pieces
 * ------------------------------------------------------------------ */
/** Section eyebrow, 11px cinnamon: the same one the shipped About tab uses. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">{children}</p>
  );
}

/**
 * The rung BELOW SectionLabel: 10.5px muted, for a field inside a section
 * (a record cell, the houses strip). Anything wearing this reads as a
 * detail of the section it sits in, never as a section of its own, which
 * is the whole point of the houses demotion.
 */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * The admission stamp, the detail the owner singled out. Understated,
 * never with a "#". It sits on the plate's top-right corner on a solid
 * paper chip so it stays legible over any uploaded picture, and thumps
 * into place once on load.
 *
 * The entrance deliberately animates scale/rotate only, never opacity:
 * the server-rendered frame is the `initial` one, so starting from
 * opacity 0 would leave the stamp invisible until hydration lands.
 */
function AdmissionStamp({ number }: { number: number }) {
  return (
    <motion.div
      initial={{ scale: 1.18, rotate: -14 }}
      animate={{ scale: 1, rotate: -6 }}
      transition={{ ...SPRINGS.snappy, delay: 0.3 }}
      className="pointer-events-none absolute right-[var(--space-s)] top-[var(--space-s)] select-none rounded-[10px] border-[1.5px] border-cinnamon bg-paper px-3 py-1.5 text-center"
      style={{
        boxShadow: "0 1px 2px rgba(35,36,30,0.18), 0 12px 24px -18px rgba(35,36,30,0.75)",
      }}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-[7px] border border-cinnamon/60" />
      <p className="relative text-[8px] font-bold uppercase tracking-[0.22em] text-cinnamon">
        Admission
      </p>
      <p className="relative mt-0.5 font-heading text-[20px] font-bold leading-none tracking-[0.02em] tabular-nums text-cinnamon">
        {number}
      </p>
    </motion.div>
  );
}

/**
 * The upload slot, visibly designed rather than implied: this is the
 * member's own view of their profile. Colour change on hover, press
 * sink on click, no movement under an idle cursor.
 */
function ChangePhotoButton() {
  return (
    <button
      type="button"
      className="absolute bottom-[var(--space-s)] right-[var(--space-s)] inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition-[colors,transform] duration-150 hover:border-canopy hover:bg-canopy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
    >
      <Camera className="h-3.5 w-3.5" aria-hidden />
      Change photo
    </button>
  );
}

/* There is deliberately NO social-pill component here any more. Instagram
   and LinkedIn used to sit on the surface as "Find them" AND inside the
   Get in touch dialog, which printed the same two links twice on one page.
   The owner cut the surface copy: "don't think the LinkedIn and IG need to
   be there outside and inside the Get in touch." One place, on asking. */

function FolderTab({
  label,
  active,
  onSelect,
  id,
  panelId,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  id: string;
  panelId: string;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      onClick={onSelect}
      initial={false}
      animate={{ y: active ? 0 : 6 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.snappy}
      style={{ clipPath: TAB_CLIP }}
      className={cn(
        // The focus indicator is an INSET outline, not a ring. A ring is
        // drawn outside the border box, and the folder bevel is a
        // clip-path, so a ring on this button would be clipped away
        // entirely and the tab would have no visible focus state.
        "relative shrink-0 px-3 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11.5px] font-bold uppercase tracking-[0.09em] outline-none transition-colors duration-150 focus-visible:[outline:2px_solid_var(--color-canopy)] focus-visible:[outline-offset:-3px] sm:px-6 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </motion.button>
  );
}

/**
 * One cell of the record strip that runs along the bottom of the About
 * panel, the way a passport carries its facts on one printed line.
 *
 * The strip is a WRAPPING ROW, not a fixed grid. It used to be
 * `grid-cols-2 sm:grid-cols-4` with the hairlines placed by index modulo
 * the column count, which only balanced at exactly four facts: drop one and
 * the grid left a hole where a cell used to be. The cell count has since
 * changed twice (the bird species went, then "Entered Grade 4" went and
 * Batch arrived), which is the point: a flex row with the rule on every
 * cell but the first reads correctly at one, two or five facts, and it is
 * the same shape the shipped About tab uses.
 */
function RecordCell({ label, value, divided }: { label: string; value: ReactNode; divided: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0",
        // The rule only exists once the facts are side by side. Stacked on
        // a phone it would be a stray vertical line beside a single fact.
        divided && "sm:ml-[var(--space-l)] sm:border-l sm:border-border sm:pl-[var(--space-l)]"
      )}
    >
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-[14px] font-semibold leading-snug tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Panel content
 * ------------------------------------------------------------------ */
function PostEntry({
  post,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
}: {
  post: MockPost;
  isFirst: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  return (
    <article
      className={cn(
        "pb-[var(--space-l)]",
        isFirst ? "pt-0" : "border-t border-border pt-[var(--space-l)]"
      )}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {formatDate(post.createdAt)}
      </p>
      <p className="mt-[var(--space-s)] max-w-[64ch] text-[15px] leading-[1.7] text-foreground">
        {post.content}
      </p>
      <div className="-ml-2.5 mt-[var(--space-m)] flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={onToggleLike} label="Like" />
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm tabular-nums">
          <MessageCircle className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
      </div>
    </article>
  );
}

function LetterEntry({
  post,
  isFirst,
  liked,
  likeCount,
  onToggleLike,
}: {
  post: MockPost;
  isFirst: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  return (
    <article
      className={cn(
        "pb-[var(--space-l)]",
        isFirst ? "pt-0" : "border-t border-border pt-[var(--space-l)]"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" aria-hidden />
        Letter
        <span className="opacity-65">· {formatDate(post.createdAt)}</span>
        <span className="opacity-65">· {readMinutes(post.content)} min read</span>
      </div>
      {post.title && (
        // 20px, the app's title rung (the shipped letter card in the feed,
        // the admission numeral). It was a one-off 22px.
        <h3 className="mt-[var(--space-xs)] font-heading text-[20px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {post.title}
        </h3>
      )}
      {/* Body copy, so: sans at 15px/1.7, the same as a post and the same as
          the About prose. Libre Baskerville belongs on the title above it,
          not on the paragraph. */}
      <p className="mt-[var(--space-s)] max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
        {letterOpening(post.content)}
      </p>
      <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-s)]">
        <Button variant="outline">
          Read the letter
        </Button>
        <div className="-ml-1 flex items-center gap-1 text-muted-foreground">
          <LoveButton
            liked={liked}
            count={likeCount}
            onToggle={onToggleLike}
            label="Like"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm tabular-nums">
            <MessageCircle className="h-4 w-4" aria-hidden />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * The panel's tab-change transition.
 *
 * `FadeRise` starts at opacity 0, and the server-rendered frame IS the
 * initial frame, so wrapping the panel in it unconditionally means the
 * whole record is invisible until hydration lands. That is fine at 100ms
 * and awful on a cold dev server. So the first paint is plain, fully
 * visible markup, and the fade only takes over once somebody has
 * actually changed tab, which is the moment the motion is for.
 */
function PanelTransition({
  switched,
  tabKey,
  children,
}: {
  switched: boolean;
  tabKey: string;
  children: ReactNode;
}) {
  const className = "flex flex-1 flex-col";
  if (!switched) return <div className={className}>{children}</div>;
  return (
    <FadeRise key={tabKey} y={10} className={className}>
      {children}
    </FadeRise>
  );
}

function EmptyPanel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    // my-auto: on a laptop the folder card stretches to the identity
    // column's height, so an empty state sits in the middle of the panel
    // rather than clinging to the top of a tall blank card.
    <div className="my-auto flex flex-col items-center gap-[var(--space-s)] rounded-[var(--radius-md)] border border-border bg-mist/60 px-[var(--space-l)] py-[var(--space-xl)] text-center">
      {icon}
      <p className="max-w-[42ch] text-[13.5px] leading-[1.6] text-muted-foreground">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Main
 * ------------------------------------------------------------------ */
export default function PassportVariant({ profile }: ProfileVariantProps) {
  // About is first in the list and first in state: the owner should never
  // have to click to read who somebody is.
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  // Flips the first time a tab is chosen; see PanelTransition.
  const [switched, setSwitched] = useState(false);
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(profile.posts.map((p) => [p.id, { liked: false, count: p.likeCount }]))
  );

  function selectTab(key: TabKey) {
    setActiveTab(key);
    setSwitched(true);
  }

  function toggleLike(id: string) {
    setLikes((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1,
        },
      };
    });
  }

  const occupation = occupationLine(profile);
  const years = valleyYears(profile);
  // The whole record, and deliberately no more than this. Owner: "we don't
  // have to specify what batch entered and all. Just batch of whatever and
  // what years they were there." So the "Entered / Grade 4" cell is gone.
  // Batch has come DOWN here from the name block ("batch doesn't have to be
  // that close to the name, it can be elsewhere"), and the cities cell wears
  // a label that counts rather than "Based in", which promised one place and
  // then listed two.
  const record: { label: string; value: string }[] = [
    profile.batchYear ? { label: "Batch", value: String(profile.batchYear) } : null,
    years ? { label: "In the valley", value: years } : null,
    citiesFact(profile),
  ].filter((c): c is { label: string; value: string } => c !== null);
  const posts = profile.posts.filter((p) => p.kind === "post");
  const letters = profile.posts.filter((p) => p.kind === "letter");
  const firstName = profile.name.split(" ")[0];
  const panelId = "passport-panel";

  return (
    // The concept owns NO page chrome. The harness renders it inside the
    // real app frame (flush green sidebar, the faint valley back-layer, a
    // max-w-[1280px] <main> with px-5/sm:px-7/lg:px-10 gutters), so a page
    // background, a second max-width or a second set of gutters here would
    // all fight the shell. This is the grid and nothing else.
    //
    // The grid stretches by default so the folder card always runs to the
    // same bottom edge as the identity column, even on the short About tab.
    // Only the identity column opts out with `self-start`, which is also
    // what gives its sticky position room to move.
    //
    // 310px, not the 340 it started at. The identity column's height is
    // mostly its 4:5 plate, so the track width IS the height budget: at 340
    // the plate ran 425px and the column stood ~120px taller than everything
    // the About panel had left to say once the social pills came off the
    // surface, which is exactly the void the owner keeps calling out. At 310
    // the plate is 388 and the two columns end within a few pixels of each
    // other, measured at 1440 and at 1920.
    //
    // THE SPLIT HAPPENS AT 1350, not at lg. This originally worked around the
    // houses chain, which used to pick its column count off the VIEWPORT and
    // so was a fixed ~560px object from 1024 up; at 1280 its last pill ran
    // straight off this card's right edge. That cause is gone: the chain now
    // measures its own container (see houses-chain.tsx) and steps down to
    // three or two columns when the box is narrow, so it can no longer
    // overflow whatever it is given.
    //
    // The 1350 split is KEPT on its own merits. The app frame leaves <main>
    // only `viewport - 248 sidebar - 80 gutters`, so below ~1350 a 310px
    // identity column and the panel beside it are both too cramped to earn
    // the split; the single-column page reads better there. If you revisit
    // this, judge it on that, not on the chain.
    //
    // overflow-x-clip: VerifiedMark keeps its "Verified member" label in the
    // DOM at opacity 0 and parks it `left-full`, so at 390 the label hangs
    // 10px past the viewport and the page rubber-bands sideways. `clip`
    // rather than `hidden` on purpose: `hidden` would make this element a
    // scrollport and kill the identity column's sticky.
    <div className="grid w-full grid-cols-1 gap-[var(--space-xl)] overflow-x-clip min-[1350px]:grid-cols-[310px_minmax(0,1fr)]">
      {/* ---------------------------------------------------------- *
          IDENTITY BLOCK, in three shapes:
            phone      one column, plate 3:2 across the full width
            laptop     plate on the left, name and actions bottom-aligned
                       beside it, folder card underneath
            1350+      the sticky left column of the two-column page
          The middle shape exists because the page cannot split into two
          columns until 1350 (see above) and a 950px-wide page with a
          560px picture and nothing beside it is exactly the empty half
          the owner keeps rejecting. Sticky only, at any width: this
          column never gets a scroller of its own.
       * ---------------------------------------------------------- */}
      {/* The middle shape is written as a RANGE (`lg:max-[1350px]:`), not as
          an `lg:` rule that a `min-[1350px]:` rule undoes. Tailwind emits an
          arbitrary `min-[...]` variant before the named `lg` breakpoint, so
          `min-[1350px]:block` lost to `lg:flex` and the two-column page came
          up with its identity column still laid out as a squeezed row. A
          range binds to exactly the widths it describes and has nothing to
          outrank. */}
      <div className="sm:max-lg:max-w-[560px] lg:max-[1350px]:flex lg:max-[1350px]:items-end lg:max-[1350px]:gap-[var(--space-xl)] min-[1350px]:sticky min-[1350px]:top-[var(--space-l)] min-[1350px]:self-start">
        <div className="relative lg:max-[1350px]:w-[46%] lg:max-[1350px]:shrink-0">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-xl)] border border-border bg-mist min-[1350px]:aspect-[4/5]">
            {profile.coverPhoto ? (
              <Image
                src={profile.coverPhoto}
                alt={`${profile.name}'s picture`}
                fill
                priority
                sizes="(min-width: 1350px) 310px, (min-width: 1024px) 46vw, (min-width: 640px) 560px, 100vw"
                className="object-cover"
                style={{ objectPosition: "50% 30%" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Camera className="h-7 w-7 text-muted-foreground/45" aria-hidden />
              </div>
            )}
            {profile.admissionNumber && <AdmissionStamp number={profile.admissionNumber} />}
            <ChangePhotoButton />
          </div>

          {/* The bird sits over the plate's bottom-left corner and
              chirps when you tap it. It rides a solid paper disc so
              it reads against any picture instead of sinking into
              it, and lives in its own positioned span so
              ProfileAvatar's own `relative` root is left alone. */}
          <span
            className="absolute -bottom-6 left-[var(--space-m)] z-[var(--z-elevated)] inline-flex rounded-full border border-border bg-paper p-[5px]"
            style={{
              boxShadow:
                "0 1px 2px rgba(35,36,30,0.10), 0 14px 28px -20px rgba(35,36,30,0.65)",
            }}
          >
            <ProfileAvatar
              user={{ id: profile.id, name: profile.name, photoUrl: profile.photoUrl }}
              size={92}
            />
          </span>
        </div>

        {/* Who they are, and the one way to reach them. Beside the plate
            on a laptop, under it everywhere else. */}
        <div className="mt-[var(--space-xl)] min-w-0 lg:max-[1350px]:mt-0 lg:max-[1350px]:flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-heading text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-foreground">
              {profile.name}
            </h1>
            <VerifiedMark
              user={{ verifyState: profile.verifyState, accountType: profile.accountType }}
              size={17}
            />
          </div>
          {/* The subtitle to the name is the OCCUPATION AND ORGANISATION,
              full stop. Batch went down to the record, the city went away
              (owner: "it's not that important"), and email and phone were
              never here. */}
          {occupation && (
            <p className="mt-[var(--space-xs)] text-[14px] leading-[1.5] text-muted-foreground">
              {occupation}
            </p>
          )}

          {/* THE ONLY CONTACT AFFORDANCE ON THE PAGE. Email, phone,
              Instagram, LinkedIn and any custom link are all one click
              behind this dialog and none of them is printed anywhere on
              the surface. That is the owner's note in full: "only when
              you say contact them does their email and number and stuff
              come out. That's how it should be everywhere", plus "don't
              think the LinkedIn and IG need to be there outside and
              inside the Get in touch." Save contact carries the same
              details into a .vcf for people who would rather have the
              card than the dialog. */}
          <div className="mt-[var(--space-l)]">
            <GetInTouch
              name={profile.name}
              methods={contactMethods(profile)}
              vcard={vcardFor(profile)}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- *
          RECORD COLUMN: folder tabs plus one padded panel. Every
          panel shares the panel's padding edge, so switching tabs
          never shifts the left edge of the content.
       * ---------------------------------------------------------- */}
      <div className="flex min-w-0 flex-col">
        <div
          role="tablist"
          aria-label="Profile sections"
          className="relative z-10 flex gap-1 pl-[var(--space-m)] sm:pl-[var(--space-l)]"
        >
          {TABS.map((tab) => (
            <FolderTab
              key={tab.key}
              id={`passport-tab-${tab.key}`}
              panelId={panelId}
              label={tab.label}
              active={activeTab === tab.key}
              onSelect={() => selectTab(tab.key)}
            />
          ))}
        </div>

        <div
          className="relative flex flex-1 flex-col rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
          style={{
            boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)",
          }}
        >
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={`passport-tab-${activeTab}`}
            className="flex flex-1 flex-col px-[var(--space-l)] py-[var(--space-l)] sm:px-[var(--space-xl)] sm:py-[var(--space-xl)]"
          >
            <PanelTransition switched={switched} tabKey={activeTab}>
              {activeTab === "about" && (
                <div className="flex flex-1 flex-col">
                  <section>
                    <SectionLabel>About</SectionLabel>
                    {/* Body copy: sans, 15px, 1.7. It was Libre
                        Baskerville at 16.5px, a different typeface a
                        size and a half above every other paragraph in
                        the app, which read as a bug rather than a
                        choice. 64ch is the shipped measure. */}
                    <p className="mt-[var(--space-m)] max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
                      {profile.about}
                    </p>
                  </section>

                  {/* NOTHING contactable stands here. The Instagram and
                      LinkedIn pills that used to fill this slot moved into
                      the Get in touch dialog, which is the whole of the
                      owner's note: reveal on asking, in one place. */}

                  {(record.length > 0 || profile.houses.length > 0) && (
                    <>
                      {/* ALL the panel's spare height lands here, and never
                          less than a section gap. It replaces the record's
                          old `mt-auto`, which absorbed the slack the same
                          way but collapsed to nothing the moment the two
                          columns balanced, leaving the rule stuck to the
                          last line of the About. One flexible element in
                          this column and only one: two would split the free
                          space between them and open a pair of holes. */}
                      <div aria-hidden className="min-h-[var(--space-xl)] flex-1" />

                      {/* THE RECORD closes the panel, the way a passport
                          prints its facts under the photograph: what they
                          were, when they were here, where they are now, and
                          the houses as the last quiet field of the same
                          block. Nothing contactable, nothing that repeats
                          the name block. */}
                      <section className="border-t border-border pt-[var(--space-l)]">
                        <SectionLabel>The record</SectionLabel>
                        {record.length > 0 && (
                          <dl className="mt-[var(--space-m)] flex flex-col gap-[var(--space-m)] sm:flex-row sm:flex-wrap sm:items-start">
                            {record.map((cell, i) => (
                              <RecordCell
                                key={cell.label}
                                label={cell.label}
                                value={cell.value}
                                divided={i > 0}
                              />
                            ))}
                          </dl>
                        )}

                        {/* HOUSES. Deliberately the smallest thing here.
                            Owner: "house is just a fun thing, it's not
                            that important, you're making it 50% of the
                            profile." So it gets no heading, no band, no
                            section of its own: one 10.5px field label,
                            the same rung the facts above it wear, and
                            the shipped chain underneath, rendered bare
                            at its own width. */}
                        {profile.houses.length > 0 && (
                          <div className={cn(record.length > 0 && "mt-[var(--space-l)]")}>
                            <FieldLabel>Houses</FieldLabel>
                            <div className="mt-[var(--space-s)]">
                              <HousesTrail houses={profile.houses} />
                            </div>
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
              )}

              {activeTab === "posts" &&
                (posts.length === 0 ? (
                  <EmptyPanel
                    icon={
                      <MessageCircle className="h-6 w-6 text-muted-foreground/45" aria-hidden />
                    }
                    text={`Nothing from ${firstName} yet.`}
                  />
                ) : (
                  <div>
                    {posts.map((post, i) => (
                      <PostEntry
                        key={post.id}
                        post={post}
                        isFirst={i === 0}
                        liked={likes[post.id]?.liked ?? false}
                        likeCount={likes[post.id]?.count ?? post.likeCount}
                        onToggleLike={() => toggleLike(post.id)}
                      />
                    ))}
                  </div>
                ))}

              {activeTab === "letters" &&
                (letters.length === 0 ? (
                  <EmptyPanel
                    icon={<Feather className="h-6 w-6 text-muted-foreground/45" aria-hidden />}
                    text={`${firstName} has not written a letter yet.`}
                  />
                ) : (
                  <div>
                    {letters.map((post, i) => (
                      <LetterEntry
                        key={post.id}
                        post={post}
                        isFirst={i === 0}
                        liked={likes[post.id]?.liked ?? false}
                        likeCount={likes[post.id]?.count ?? post.likeCount}
                        onToggleLike={() => toggleLike(post.id)}
                      />
                    ))}
                  </div>
                ))}

              {activeTab === "photos" && (
                <EmptyPanel
                  icon={<Images className="h-6 w-6 text-muted-foreground/45" aria-hidden />}
                  text={`Nothing from ${firstName} in the Valley Collection yet. Pictures added there show up here.`}
                />
              )}
            </PanelTransition>
          </div>
        </div>
      </div>
    </div>
  );
}
