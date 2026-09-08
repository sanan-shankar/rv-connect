"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  Mail,
  Phone,
  Instagram,
  Linkedin,
  Globe,
  Download,
  Lock,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS } from "@/components/common/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";
import { MemberVerifyDialog } from "@/components/auth/member-verify-dialog";

export interface ContactMethod {
  kind: "email" | "phone" | "instagram" | "linkedin" | "website";
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

const ICONS = {
  email: Mail,
  phone: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  website: Globe,
} as const;

/*  The batch line, and the app's one small-caps label rung.
 *
 *  12px semibold at 0.12em is off the documented ladder rather than picked by
 *  eye: DESIGN-SYSTEM.md §5 sets the label rung at `0.75rem uppercase,
 *  letter-spacing 0.08-0.16em`, which is what the policies pages and the
 *  messages index already use. The 10.5-11px bolds elsewhere in the app are
 *  cinnamon KICKERS sitting over a heading -- decoration, allowed to be small.
 *  A batch is the second thing you read about a person (owner, 2026-09-09:
 *  "the batch of font is sooo small").
 *
 *  "Batch of", never "Class of": the phrase the sidebar byline, the auto-joined
 *  group and the directory heading all already use. Formatted here, once, so
 *  it cannot drift from them one caller at a time. */
const EYEBROW = "text-[12px] font-semibold uppercase tracking-[0.12em]";

/** One reach-out: the link on the left, a copy button on the right.
 *
 *  Two hit targets rather than one, because the two verbs are different and
 *  most of the time the wanted one is copy. They are siblings, not nested: a
 *  button inside an anchor is invalid, and hiding the copy control until hover
 *  would move a control under the cursor, which this project does not do.
 *
 *  The label is the line you read and the value sits under it, small. That is
 *  the shipped type ladder, unchanged -- what this rework replaced is the
 *  container, not the type. A raw address set as the loud line was tried and
 *  rejected (owner, 2026-09-08: "it looks a bit ugly if that's the big part"). */
function ReachRow({ method }: { method: ContactMethod }) {
  const [copied, setCopied] = useState(false);
  const Icon = ICONS[method.kind];

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(method.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Never silent: clipboard writes fail on an insecure origin and when the
      // permission is denied, and a tick that did not copy anything is worse
      // than no tick at all.
      toast.error("Could not copy. Try selecting it by hand.");
    }
  }

  return (
    <div className="flex items-center">
      <a
        href={method.href}
        target={method.external ? "_blank" : undefined}
        rel={method.external ? "noopener noreferrer" : undefined}
        className="state-layer -mx-2 flex min-w-0 flex-1 items-center gap-3.5 rounded-[10px] px-2 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {/* Canopy on light; --canopy is byte-identical in both themes by brand
            policy, so on the dark card it all but vanishes and the icon takes
            --leaf, which IS lightened there. */}
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
      </a>

      {/* Presses on SPRINGS.snappy like every other control, and the glyph swap
          is its own spring rather than a cut: the copy mark shrinks out as the
          tick springs in, and the pair runs in reverse when it times out.
          `mode="popLayout"` keeps the two from shoving each other sideways
          while both are on screen. */}
      <m.button
        type="button"
        aria-label={copied ? "Copied" : `Copy ${method.label.toLowerCase()}`}
        onClick={copyValue}
        whileTap={{ scale: 0.88 }}
        transition={SPRINGS.snappy}
        className="state-layer ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

/**
 * "Get in touch" CTA for other people's profiles. Opens the person's calling
 * card: their bird and batch over the reach-outs they actually shared, plus a
 * Save contact (.vcf) action. Honest about being a directory: no fake inbox.
 *
 * **The card is why the tiles are gone.** Until 2026-09-09 each reach-out sat
 * in a box painted `--card` #F5F2EA on the `--float` #FFFFFF panel. Paper is a
 * rung BELOW float on the surface ladder, so the warmth was climbing where
 * DESIGN-SYSTEM.md rule 1 says it must sink, and rule 3 caught the same tiles
 * again -- each carried a fill AND a border where one would have done. Four of
 * them stacked were the loudest thing in the dialog (owner: "I don't like that
 * brown for the boxes"). The answer was not a different fill. `/lab/reach`
 * holds the four constructions this one was picked from.
 *
 * **Where the bird goes.** It sits on the white body, never on green. A canopy
 * band was drawn first and needed a cream disc behind the glyph to be visible
 * at all, which does not survive the fact that the 50 bird glyphs share no
 * bounding box: the same disc fits a kingfisher and hangs loose around a
 * thrush (owner, 2026-09-09). On paper there is no disc and no size to get
 * right. 72px, not 64: a glyph does not fill its own box to the edge, so at 64
 * the ink stopped short and the space to the name read as a hole.
 *
 * **The head has no single gap**, because it holds two different relationships.
 * Bird to name is 8px; name to batch is 6px. The name and the batch are one
 * unit and the bird is a separate object above it, so the pair must read closer
 * to itself than to the glyph. One `gap-2` used to serve both, which made bird
 * to name 12px and left the name floating (owner, 2026-09-09: "move the name a
 * bit up"). How far the ink actually sits from the name still varies by
 * species, and that is not fixable from here: the glyphs share no bounding box.
 *
 * **The gaps, each one deliberate.** 24px between the head and the first row,
 * because there is no hairline there and the gap is the only separator; 21px
 * between rows, being 10px of row padding either side of a hairline; 20px above
 * the button, which is the row rhythm, because a filled green pill does not
 * need extra air to stop reading as a fifth row; and the dialog's own 16px to
 * the panel edge. Two of those measured 34px and 26px before the owner asked
 * what they were for and neither had an answer.
 *
 * **One departure from the dialog material, on the owner's instruction.** The
 * name is 20px, so this is the only dialog title in the app that is not 16px,
 * against the material's "no per-dialog title sizes". The reason: this title
 * is not naming an action, it is the subject of a card, and it is the only
 * dialog title that shares its block with a 72px portrait. 20px is the h3 rung
 * on the §5 ladder rather than a number that looked right. Do not cite this as
 * precedent for a second one.
 *
 * `showSave` controls the OUTER Save-contact button only; the dialog always
 * carries its own. Surfaces that want a single CTA pass false -- the shipped
 * letterhead does, on both of its call sites. The default is `true` and it is
 * NOT dead: three of the /lab/profiles variants take it, which is what that
 * room is for. (An audit called this prop unused after grepping shipped
 * callers only.)
 *
 * `size` is the shared Button scale. "sm" (h-9) is the default because this
 * usually sits in a crowded action row; a surface where this is the page's ONE
 * action passes "default" (h-10) so it reads at the same weight as every other
 * primary CTA in the app (owner, 2026-07-30: "I wanted like a proper size like
 * we have in the feed and everywhere ... it's kind of shrunken").
 */
export function GetInTouch({
  name,
  person,
  batchYear,
  methods,
  vcard,
  showSave = true,
  size = "sm",
  lock,
}: {
  name: string;
  /** Whose card this is, for the portrait at the top. Required rather than
   *  optional: a fallback would give the app two different contact dialogs,
   *  which is the drift the one-material rule exists to stop. */
  person: AvatarUser;
  /** Rendered as "Batch of {year}". Omitted entirely when a member has no
   *  year on their row, rather than printing a half line. */
  batchYear: number | null;
  methods: ContactMethod[];
  vcard: string;
  showSave?: boolean;
  size?: "sm" | "default";
  /** Set when the details were withheld from the VIEWER rather than never
   *  shared by the member. Names WHICH gate is closed, because "they have not
   *  shared anything", "confirm your email" and "you are not verified yet"
   *  send a person to three completely different fixes. */
  lock?: "email" | "member";
}) {
  const [open, setOpen] = useState(false);
  const locked = !!lock;
  const hasMethods = methods.length > 0;

  function saveContact() {
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-")}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex gap-2">
        {/* Locked stays PRESSABLE. A disabled control with a tooltip is the
            wrong shape here: the person can fix this in about a minute, and a
            dead button tells them nothing about how. */}
        <Button
          size={size}
          className="rounded-full"
          onClick={() => setOpen(true)}
          disabled={!hasMethods && !locked}
          title={hasMethods || locked ? undefined : "This member hasn't shared contact details yet."}
        >
          {locked ? (
            <Lock className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          ) : (
            <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          )}
          Get in touch
        </Button>
        {showSave && !locked && (
          <Button variant="outline" size={size} className="rounded-full" onClick={saveContact}>
            <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Save contact
          </Button>
        )}
      </div>

      {/* Locked, this is not a variant of the Reach dialog at all: it IS the
          one shared card for whichever gate is closed (verify-email-dialog /
          member-verify-dialog), the same components posting and commenting
          open, action button and all. One component per gate means the
          wording can never drift between surfaces (owner, 2026-08-18: "make
          all the confirm email alerts look the same"). */}
      {lock === "email" ? (
        <VerifyEmailDialog open={open} onOpenChange={setOpen} />
      ) : lock === "member" ? (
        <MemberVerifyDialog open={open} onOpenChange={setOpen} />
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          {/* gap-2.5 overrides the material's gap-4. Every row already carries
              10px of its own padding, so the panel's gap is not the whole
              distance between two things and cannot be read as one. */}
          <DialogContent className="gap-2.5 sm:max-w-[400px]">
            {/* Centred, which the dialog material allows for exactly this
                shape: a short block anchored by an icon. No description line
                under it -- the material's test is whether it changes which
                button you press, and "they chose to share these" does not. */}
            <DialogHeader className="items-center gap-0 pb-1 text-center">
              {/* No top padding above the bird: the panel's own 16px is the
                  only space there, which puts the glyph's top edge on the
                  close X's line. The X is not the thing that moves -- top
                  right at 16px is the one inset every dialog shares. */}
              <BirdAvatar user={person} size={72} />
              <DialogTitle className="mt-2 text-[20px] leading-tight">{name}</DialogTitle>
              {batchYear !== null && (
                <p className={`mt-1.5 text-muted-foreground ${EYEBROW}`}>{`Batch of ${batchYear}`}</p>
              )}
            </DialogHeader>

            {/* The rows, with a hairline between them inset past the icon
                gutter the way iOS insets a grouped list. No fill anywhere, so
                there is nothing left to be brown. */}
            <div>
              {methods.map((method, i) => (
                <div key={method.kind + method.value}>
                  {i > 0 && <div className="ml-8 h-px bg-border/70" />}
                  <ReachRow method={method} />
                </div>
              ))}
            </div>

            {/* The material's one footer shape: a right-aligned action row
                (no full-width buttons in dialogs; the X handles close). */}
            <div className="flex justify-end">
              <Button onClick={saveContact}>
                <Download className="h-4 w-4" />
                Save contact card
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
