"use client";

/* ------------------------------------------------------------------ *
 *  Four brown boxes on a white card.
 *
 *  The Get in touch sheet paints its contact tiles `--card` #F5F2EA and
 *  floats them on a `--float` #FFFFFF panel. Paper is a rung BELOW float
 *  on the surface ladder, so the warmth is climbing instead of sinking,
 *  which DESIGN-SYSTEM.md rule 1 forbids and rule 3 forbids again ("if
 *  it needs an edge, it earns a border, not a fill" - these tiles have
 *  both). Four of them stacked is the loudest thing in the dialog.
 *
 *  Every sheet below is a static replica of the real DialogContent, not
 *  a live Dialog: same 400px width, same 16px padding, same 20.8px
 *  radius, same border and shadow, so they can sit next to each other
 *  and be compared at the size they actually render. The tokens are the
 *  app's own (`bg-float`, `bg-card`, `text-canopy`), not the lab's v2
 *  approximations, so the tan in "Ships today" is the shipped tan.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  Mail,
  Phone,
  Instagram,
  Linkedin,
  Globe,
  Download,
  X,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { SPRINGS } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { DelightShell, DemoCard, DemoGrid } from "../_kit";

/* The reach-outs one real profile would carry. Placeholder values: this room
   never reads a member's row. */
const METHODS = [
  { kind: "email", label: "Email", value: "sanan.shankar@example.com", external: false },
  { kind: "phone", label: "Phone", value: "+91 98450 33712", external: false },
  { kind: "instagram", label: "Instagram", value: "@sanan.shankar", external: true },
  { kind: "linkedin", label: "LinkedIn", value: "linkedin.com/in/sananshankar", external: true },
] as const;

const ICONS = {
  email: Mail,
  phone: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  website: Globe,
} as const;

/** The real DialogContent's panel, minus the portal and the animation. */
const PANEL =
  "relative w-[400px] max-w-full rounded-xl border border-border bg-float text-sm " +
  "shadow-[0_1px_2px_rgba(30,28,22,0.06),0_24px_48px_-24px_rgba(30,28,22,0.55)]";

function CloseX({ onCanopy = false }: { onCanopy?: boolean }) {
  return (
    <span
      className={`absolute top-4 right-4 grid h-6 w-6 place-items-center rounded-full ${
        onCanopy ? "text-white/70" : "text-muted-foreground"
      }`}
    >
      <X className="h-4 w-4" />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  The address block: the row both new sheets are built from
 * ------------------------------------------------------------------ */

/** One reach-out. The label is the line you read and the value sits under it,
 *  small: a raw email address set at 14px medium was the loud thing in the
 *  sheet, and a 30-character address is not a headline (owner, 2026-09-08:
 *  "it looks a bit ugly if that's the big part"). What changed against the
 *  shipped row is the container, not the type ladder.
 *
 *  The copy button is always drawn, never revealed on hover, so nothing moves
 *  under the cursor. */
function ReachRow({ method }: { method: (typeof METHODS)[number] }) {
  const [copied, setCopied] = useState(false);
  const Icon = ICONS[method.kind];

  return (
    <div className="flex items-center">
      <span className="state-layer -mx-2 flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 rounded-[10px] px-2 py-2.5">
        <Icon className="h-[18px] w-[18px] shrink-0 text-canopy dark:text-leaf" />
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-[13px] leading-tight font-semibold text-foreground">
            {method.label}
            {method.external && (
              <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </span>
          <span className="mt-1 block truncate text-[12.5px] leading-tight text-muted-foreground">
            {method.value}
          </span>
        </span>
      </span>

      {/* Presses on SPRINGS.snappy like every other control, and the glyph
          swap is its own spring rather than a hard cut: the copy mark shrinks
          out as the tick springs in, and the same two states run in reverse
          when it times out. `mode="popLayout"` keeps them from shoving each
          other sideways while both are on screen. */}
      <m.button
        type="button"
        aria-label={copied ? "Copied" : `Copy ${method.label.toLowerCase()}`}
        onClick={() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
        whileTap={{ scale: 0.88 }}
        transition={SPRINGS.snappy}
        className="state-layer ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {copied ? (
            <m.span
              key="tick"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={SPRINGS.snappy}
              className="grid place-items-center"
            >
              <Check className="h-4 w-4 text-leaf" />
            </m.span>
          ) : (
            <m.span
              key="copy"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={SPRINGS.snappy}
              className="grid place-items-center"
            >
              <Copy className="h-[15px] w-[15px]" />
            </m.span>
          )}
        </AnimatePresence>
      </m.button>
    </div>
  );
}

/** The rows plus the hairlines between them, inset past the icon gutter the
 *  way iOS insets a grouped list. No fill anywhere, so there is nothing left
 *  to be brown. */
function AddressBlock() {
  return (
    <div>
      {METHODS.map((m, i) => (
        <div key={m.kind}>
          {i > 0 && <div className="ml-8 h-px bg-border/70" />}
          <ReachRow method={m} />
        </div>
      ))}
    </div>
  );
}

function SaveCta() {
  return (
    <div className="flex justify-end">
      <Button>
        <Download className="h-4 w-4" />
        Save contact card
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The calling card, four ways of building the same idea
 *
 *  The owner picked the calling card and then asked the question the first
 *  draft could not answer: the bird was sitting on the canopy band, which
 *  needed a cream disc behind it to be visible at all, and "the birds are
 *  different sizes so it'll look weird on the orange thrush". He is right --
 *  the glyphs are not drawn to a common bounding box, so a disc exposes
 *  whichever one under-fills it.
 *
 *  There is no ring to get right if the bird never touches the green. Three
 *  of the four below put it on the white body instead; the fourth keeps the
 *  band and drops the bird, so the choice between charm and green weight is
 *  visible rather than argued.
 * ------------------------------------------------------------------ */

const PERSON = {
  id: "lab",
  name: "Sanan Shankar",
  birdOverride: "white-throated-kingfisher",
};

/** Only the batch under the name (owner, 2026-09-08: "only say the batch").
 *  The house was a second fact competing with the one that places a person.
 *
 *  "Batch of", never "Class of": that is the phrase the sidebar byline, the
 *  auto-joined group and the directory heading all already use.
 *
 *  Set in the app's small-caps eyebrow rather than as another sentence in body
 *  type, which is what the landing sections, the letters kicker and the
 *  policies pages all do with a line of this job. A calling card sets the
 *  affiliation under the name in caps for the same reason: it stops competing
 *  with the name for the same voice. */
const BATCH = "Batch of 1998";
/*  12px, tracking 0.12em, semibold. Every number here is off the documented
 *  ladder rather than picked by eye: DESIGN-SYSTEM.md §5 sets the label rung at
 *  `0.75rem uppercase, letter-spacing 0.08-0.16em`, and 12px semibold at 0.12em
 *  is exactly what the policies pages and the messages index already use for a
 *  label of real content. The 10.5-11px bolds elsewhere in the app are cinnamon
 *  KICKERS sitting over a heading -- decoration, allowed to be small. A batch is
 *  the second thing you read about a person, so it sits at the top of the rung,
 *  not the bottom (owner, 2026-09-09: "the batch of font is sooo small"). */
const EYEBROW = "text-[12px] font-semibold uppercase tracking-[0.12em]";

/* --- 1. what he saw: bird on the band, inside a cream disc --------- */
function BandRinged() {
  return (
    <div className={`${PANEL} overflow-hidden`}>
      <div className="relative flex items-center gap-3.5 bg-canopy px-4 py-4">
        <CloseX onCanopy />
        <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-card">
          <BirdAvatar user={PERSON} size={46} />
        </span>
        <div className="min-w-0">
          <p className="font-heading truncate text-[17px] leading-tight font-medium text-white">
            {PERSON.name}
          </p>
          <p className={`mt-1.5 truncate text-white/60 ${EYEBROW}`}>{BATCH}</p>
        </div>
      </div>
      <div className="grid gap-2.5 px-4 pt-2.5 pb-4">
        <AddressBlock />
        <SaveCta />
      </div>
    </div>
  );
}

/* --- 2. a printed edge, everything else on paper ------------------- */
function PrintedEdge() {
  return (
    <div className={`${PANEL} overflow-hidden`}>
      {/* One canopy rule across the top edge, the way a printer runs a colour
          off the trim of a card. It carries the green without asking the bird
          to survive on it. 10px, not 6: at 6 it read as a seam in the render
          rather than as a decision. */}
      <div className="h-[10px] bg-canopy" />
      <div className="relative grid gap-2.5 p-4">
        <span className="absolute top-4 right-4 grid h-6 w-6 place-items-center text-muted-foreground">
          <X className="h-4 w-4" />
        </span>
        <div className="flex items-center gap-3.5 pb-1">
          <BirdAvatar user={PERSON} size={48} />
          <div className="min-w-0">
            <p className="font-heading truncate text-[17px] leading-tight font-medium text-foreground">
              {PERSON.name}
            </p>
            <p className={`mt-1.5 truncate text-muted-foreground ${EYEBROW}`}>{BATCH}</p>
          </div>
        </div>
        <AddressBlock />
        <SaveCta />
      </div>
    </div>
  );
}

/* --- 3. the portrait: bird centred and larger ---------------------- */
function Portrait() {
  return (
    <div className={`${PANEL} grid gap-2.5 p-4`}>
      <CloseX />
      {/* Centred because the block is anchored by an icon, which is the one
          case the dialog rules allow centring for. At 64 the glyph is big
          enough to be a portrait rather than a marker.
          No top padding: the panel's own 16px is the only space above the
          bird, which puts the glyph's top edge on the same line as the close
          X (owner asked, 2026-09-09). The X is not the thing that moves --
          top-right at 16px is the one inset every dialog in the app shares. */}
      <div className="flex flex-col items-center gap-2 pb-1 text-center">
        <BirdAvatar user={PERSON} size={64} />
        {/* 20px, and this is the ONE place in the app a dialog title is not
            16px. The material's rule says "no per-dialog title sizes"; the
            owner asked for it bigger (2026-09-09) and the reason holds up --
            this title is not naming an action, it is the subject of a card, and
            it is the only dialog title that shares its block with a 64px
            portrait. 20px because that is the h3 rung on the documented ladder
            (DESIGN-SYSTEM §5), not a number that looked right. */}
        <p className="font-heading mt-1 text-[20px] leading-tight font-medium text-foreground">
          {PERSON.name}
        </p>
        <p className={`text-muted-foreground ${EYEBROW}`}>{BATCH}</p>
      </div>
      <AddressBlock />
      <SaveCta />
    </div>
  );
}

/* --- 4. the band with no bird in it -------------------------------- */
function BandOnly() {
  return (
    <div className={`${PANEL} overflow-hidden`}>
      <div className="relative bg-canopy px-4 py-5">
        <CloseX onCanopy />
        <p className="font-heading truncate pr-8 text-[19px] leading-tight font-medium text-white">
          {PERSON.name}
        </p>
        <p className={`mt-2 truncate text-white/60 ${EYEBROW}`}>{BATCH}</p>
      </div>
      <div className="grid gap-2.5 px-4 pt-2.5 pb-4">
        <AddressBlock />
        <SaveCta />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function ReachRoom() {
  return (
    <DelightShell
      title="Where the bird goes"
      lede="The calling card built four ways. The question is where the bird goes."
      css={CSS}
    >
      <DemoGrid>
        <DemoCard
          title="What you saw"
          note="The bird on the canopy band, which only reads at all because there is a cream disc behind it. The glyphs are not drawn to one bounding box, so that disc will sit tight around a kingfisher and loose around a thrush."
          pad={false}
        >
          <div className="rr-stage">
            <BandRinged />
          </div>
        </DemoCard>

        <DemoCard
          title="A printed edge"
          note="One canopy rule off the top trim and nothing else green up there. The bird sits on paper, which is the surface it was drawn for, so there is no disc and no size to get right."
          pad={false}
        >
          <div className="rr-stage">
            <PrintedEdge />
          </div>
        </DemoCard>

        <DemoCard
          title="The portrait"
          note="Bird at 64 instead of 48, centred, name under it. No band at all: the green is the icons and the button. It gives the glyph the most room of the four, which is either the point or too much."
          pad={false}
        >
          <div className="rr-stage">
            <Portrait />
          </div>
        </DemoCard>

        <DemoCard
          title="The band, no bird"
          note="Keeps the green weight you liked and drops the bird rather than solving it. Worth a look to see whether you miss it."
          pad={false}
        >
          <div className="rr-stage">
            <BandOnly />
          </div>
        </DemoCard>

      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
/* Two columns, not the kit's three. A sheet is 400px wide because the real
   dialog is 400px wide, and a third of this page is 354. */
.dl-grid { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 900px) { .dl-grid { grid-template-columns: 1fr; } }

/* The sheets are floating panels, so they need something to float on: the app
   page colour, which is what sits behind a real dialog once the backdrop has
   blurred it. */
.rr-stage {
  display: grid;
  /* minmax(0,1fr), not the kit's place-items:center. An auto grid column sizes
     to max-content, so the sheet's own max-w-full resolved against 400px and
     the panel hung out over both edges of the card at 390. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 32px 16px;
  background: var(--background);
}
/* Flush at 390 so the specimen is 332 wide against the real dialog's 358.
   The gap matters here: how much of a LinkedIn URL truncates is one of the
   things this room is being asked to judge. */
@media (max-width: 640px) { .rr-stage { padding: 20px 0; } }
`;
