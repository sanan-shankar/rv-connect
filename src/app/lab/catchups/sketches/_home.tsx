"use client";

/* ------------------------------------------------------------------ *
 *  /catchups/[id] — a Catch-up's home. A PLACE, not a page that
 *  reshapes itself.
 *
 *  His question, and the answer this file takes: "is there a home page
 *  that you then keep navigating from to do things like answer or
 *  whatever, or does the home page transform into something each time. I
 *  think the answer being its own page is good."
 *
 *  A place. Four regions, always in the same spot, at every state and for
 *  every member:
 *
 *    the head        the picture, the name
 *    the Edition       what this cycle is right now, and ONE thing to do
 *    the rail        People / Reminders / Running this  (_rail.tsx)
 *    earlier         the Editions that have already come out
 *
 *  Only what is inside the second region changes. The first draft
 *  reshaped the whole page per state, which is why he could not find the
 *  same thing twice: "you've just totally changed the homepage into this
 *  new UI. All the controls are gone ... now I don't know where they are."
 *
 *  ONE PRIMARY ACTION, and it is never in a row of equals. Collecting: the
 *  box for writing a question, which is the shipped design he singled out
 *  as better than mine — "the asking thing now has a box. And it says, be
 *  the first to ask. And then under that, it would show everything ... the
 *  asking is probably even better now on the shipped version than what
 *  you've created." Answering: Answer, large, with nothing beside it,
 *  because in my first draft "the biggest elements are the people,
 *  questions, the people who have written, and then the earlier editions.
 *  The actual answering is not even there."
 *
 *  NO LIST OF QUESTIONS except where the questions are the thing being
 *  made, which is collecting. He said it three times in one sitting about
 *  three different screens: "Why do we just have this list of questions?
 *  I just don't get it. It's so annoying."
 *
 *  NO ROUND NUMBERS. "Why do we need to have the round 4? It doesn't
 *  matter what edition, it's going to be edition 15. How does it matter
 *  whether it's 15 or 16?"
 *
 *  WHICH FACE, AND WHY. He asked for a rule on 2026-09-07, having found the
 *  two faces used for the same job one line apart: "the text above it is
 *  'Answers close Thursday 20 August' and the parallel text is 'Earlier
 *  Editions' except that's in serif. please make it clear and sensible what's
 *  serif and what sans serif and have some logic behind it and consistency."
 *
 *  The rule, and it is one line:
 *
 *      SERIF is a TITLE or a NAME. The page's title, a Catch-up's name, a
 *      dialog's title, a card's own title, a question, and the date that
 *      identifies an Edition on its cover.
 *
 *      SANS is the APP TALKING. The label over a group, a state line, a
 *      hint, a value, a control, a count -- everything set small and muted.
 *
 *  It needed writing down because globals.css puts `font-heading` on h1 to
 *  h4, so a section LABEL marked up as an <h2> came out serif while the state
 *  line beside it, a <p>, came out sans. Anything under this rule that is a
 *  label carries `font-sans` explicitly, whatever tag it uses.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, Eye, EyeOff, ImagePlus, Library, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATCHUP_PROMPT_SETS } from "@/lib/catchups-core";
import { BirdAvatar } from "@/components/common/bird-avatar";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { Cover, PICTURE_SCRIM } from "./_cover";
import { PeopleDoor, SettingsDoor } from "./_rail";
import { dayAndDate, shortDate, type SketchCatchup, type ShelfEdition } from "./_shelf";

/** THE APP'S OWN RAIL GRID, and it is not a new number.
 *
 *  He asked where the numbers came from: "that wide column has the narrow
 *  column to the right as it should. but the gap between those columns seems
 *  a bit big? a bit wasted space. have some sense behind that decision. maybe
 *  see what we do in the app already."
 *
 *  The app already has one, in `src/components/layout/rail-grid.ts`: a fluid
 *  main column, a 318px rail from 1180px up, and 30px between them. The feed
 *  and the shipped Catch-ups index both draw it. This page had invented 300
 *  and 56 instead, so it was 26px narrower down one side and 26px wider in
 *  the middle than every other two-column page in the app.
 *
 *  WHICH COLUMN TAKES THE SPACE BACK: the main one, and it keeps no cap. Its
 *  content is a photograph the width of the column (an Edition's cover) and a
 *  box you write a question into; both are better wider. The rail's content
 *  is a stack of small covers whose whole point is that they are back
 *  numbers, and 318 is already the widest the app makes a rail. */
export const HOME_RAIL = 318;
export const HOME_GAP = 30;

/* ── the head ──────────────────────────────────────────────────────── *
 *  The picture, with the name written on it, and the way to the people.
 *
 *  It used to be a bare banner with the name and two text buttons under it.
 *  His, 2026-09-07: "the photo on top should not just be a photo. Let's have
 *  it fade to black and again have the name, and then let's have a People or
 *  some other word that conveys that sentiment, which is clearly clickable.
 *  And when you click it, we can pull up a dialog that lists the people."
 *
 *  So the head is the list's own card at page width: picture, dark fade,
 *  words on it. "Again" is the operative word -- the two surfaces now say a
 *  Catch-up's identity the same way, which is the whole point of the picture
 *  (it is "almost like a group chat photo").
 *
 *  SMALLER, and the saving is the TITLE rather than the crop. He asked for
 *  "maybe 20% smaller"; the first attempt took it out of the picture's height
 *  and went to 5:1, and he looked at it: "the header photo looks so bad."
 *  He was right and the two asks were pulling against each other -- the same
 *  paragraph also says "stop picking an insanely cropped in, like, 30x zoom
 *  picture", and a 5:1 letterbox of a photograph is more crop, not less.
 *
 *  So the ratio goes back to 4:1 and the height comes off the head as a
 *  whole: with the name INSIDE the picture there is no 30px title and no 16px
 *  gap under it, so the head is 269px where it used to be 321. Sixteen per
 *  cent off, none of it out of the photograph.
 */
function Head({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  return (
    <header>
      <div
        className="relative w-full overflow-hidden rounded-[var(--radius)] bg-muted"
        /* A HEIGHT, not a ratio, and that is the fix for two of his notes at
           once. A ratio ties the banner's height to the window: at 1512 a 4:1
           banner is 269px and at 1920 it is 350, so the wider the screen the
           more of the page it eats -- and a fixed 5:1 made the crop worse
           rather than the picture smaller ("the header photo looks so bad").
           A fixed height does the opposite: a wider window shows MORE of the
           photograph, never a thinner slice of it. 240 against the 269 it
           was, so it is smaller as he asked, and the rest of the saving came
           from moving the name inside.

           The phone's is 172, a third taller than the 132 it was, at his
           word: "on mobile you can make the header photo 30% taller." A phone
           column is 350px wide, so 132 was a 2.65:1 letterbox -- the most
           severe crop anywhere in the drawing, on the smallest picture. */
        style={{ height: phone ? 172 : 240 }}
      >
        <Image
          src={c.picture.src}
          alt=""
          fill
          sizes="1100px"
          /* Each photograph carries the band it should be cropped at (see
             PICTURES in _shelf.ts). A centred 4:1 window through any of these
             lands in the canopy and comes back as green texture; the horizon,
             the benches and the ground are all in the lower third. */
          style={{ objectPosition: c.picture.focus }}
          className="object-cover"
          priority
        />
        {/* The list card's fade, exactly: transparent for the top half, then
            away quickly, so the picture stays a picture and the words have
            ground. One gradient over 55% of a light photograph leaves the
            name on a grey wash halfway up, which reads as a bug. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: PICTURE_SCRIM }}
        />
        {/* ONE row along the foot: the name from the bottom left, the two
            doors hard right, at both widths. `items-end` and no wrapping,
            because a second row of chrome on a 117px phone picture is the
            thing he told me not to do: "I don't want two rows of stuff for the
            picture on phone." */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3",
            phone ? "p-4" : "p-5",
          )}
        >
          <h1
            className="min-w-0 font-heading text-white"
            style={{
              fontSize: phone ? 24 : 30,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              textShadow: "0 1px 12px rgb(0 0 0 / 0.4)",
            }}
          >
            {c.name}
          </h1>
          {/* Both doors, at both widths, because the sidebar that used to
              hold their contents is now the Earlier Editions column. */}
          <span className="flex shrink-0 items-center gap-2">
            <PeopleDoor c={c} phone={phone} />
            <SettingsDoor c={c} phone={phone} />
          </span>
        </div>
      </div>
    </header>
  );
}

/* ── the Edition ─────────────────────────────────────────────────────── */

/** One line, the stage in words. No Edition number, no counts, and nothing the
 *  thing underneath already says.
 *
 *  Two lines were deleted here on 2026-09-07, both his:
 *
 *  "Open for questions is not necessary because if the box is there, it
 *  implies that it's open for questions." So collecting has no stage line at
 *  all -- the ask box IS the line.
 *
 *  "Answers close Thursday 20 August, and it comes out the same day. Well, you
 *  don't need to say it comes out the same day. That's almost like implied.
 *  That's so stupid." So the deadline is the deadline and nothing else. */
function Stage({ c }: { c: SketchCatchup }) {
  const r = c.edition;
  /* Nothing while it is held. The deadline is not running, so printing
     "Answers close Thursday 20 August" under a card that says the Catch-up is
     on hold is the page contradicting itself in two lines. */
  if (c.paused) return null;
  const words =
    c.state === "ended" && c.endedAt
      ? `Ended ${shortDate(c.endedAt)}`
      : !r
        ? ""
        : c.state === "answering" && r.closesAt
          ? `Answers close ${dayAndDate(r.closesAt)}`
          : c.state === "published" && r.nextOpensAt
            ? `The next one opens ${shortDate(r.nextOpensAt)}`
            : "";
  if (!words) return null;
  /* UNDER the tile and hard right, with air above it. His, 2026-09-07: "move
     Answers close Thursday 20 August to under the tile and align it to the
     right", then "it's hugging the bottom of the tile give some space above
     it." Above the tile it pushed the whole column down and the sidebar's
     first cover stopped lining up with the main column's first tile; under it
     it reads as a caption on the thing it describes, and the two columns start
     on the same pixel. The same line does the job on published and on ended:
     "obviously Ended can be the same." */
  return <p className="mt-3.5 text-right text-[13.5px] text-muted-foreground">{words}</p>;
}

/** The box, which is the shipped one he named as better than mine. The
 *  heading changes on the first ask and the copy does not multiply. */
function AskBox({ first }: { first: boolean }) {
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  return (
    <div className="card-elevated relative rounded-[var(--radius)] border border-border bg-card p-5">
      {/* ONE ROW OF CONTROLS, AND ANONYMITY IS A MARK RATHER THAN A CHOICE.
          It used to be a two-option segmented pill (Ask as Sanan / Ask
          anonymously) plus two buttons, three controls across two rows for one
          question. His, 2026-09-07: "obviously ask. I think we can default to
          non anonymous. we can have just some icon or something you click and
          then it's anonymous. if not it's not. but do it in a pretty way. I
          think we should be able to fit it in one row. maybe below we have
          library and ask and the anonymous is somehow on the top right."

          So the default is your name, which it always was, and the only thing
          on screen is the way to turn that off: one toggle in the box's top
          right, lit cinnamon when it is on. The box says who it is going out
          as, in the same place, either way -- nothing is hidden behind a
          state you cannot see. */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-heading text-[17px] text-foreground">
          {first ? "Be the first to ask something" : "Ask everyone something"}
        </p>
        <button
          type="button"
          onClick={() => setAnon((v) => !v)}
          aria-pressed={anon}
          aria-label={anon ? "Asking anonymously" : "Ask anonymously"}
          title={anon ? "Asking anonymously" : "Ask anonymously"}
          className={cn(
            /* `-my-1` so a 32px target does not make this row 32px tall: the
               title beside it is 23px of ink, and the row's height is what the
               revealed line below measures its gap from. Without it the line
               sat 1.5 under a box that was 9px taller than the words, which
               reads as uneven padding above it. */
            "-mr-1 -my-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            anon
              ? "bg-cinnamon/[0.14] text-cinnamon"
              : "state-layer text-muted-foreground hover:text-foreground",
          )}
        >
          {anon ? (
            <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.9} />
          ) : (
            <Eye className="h-[17px] w-[17px]" strokeWidth={1.9} />
          )}
        </button>
      </div>
      {/* Nothing at rest. A line saying "Going out as Sanan" was on screen
          permanently to explain a state that is the default and always has
          been, which is the app narrating itself. His: "don't say Going out as
          Sanan. don't have that line. if they click the eye then you cleanly
          smoothly expand the box to show that line and it says 'Ask
          anonymously'." So the box grows by one line only when you have
          changed something, and the line says what you changed it to. */}
      <AnimatePresence initial={false}>
        {anon && (
          <m.p
            key="anon"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.26, ease: EASE_OUT_SMOOTH },
              opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
            }}
            className="overflow-hidden font-sans text-[12.5px] font-medium text-cinnamon"
          >
            <span className="mt-1.5 block leading-none">Ask anonymously</span>
          </m.p>
        )}
      </AnimatePresence>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Your question for the group"
        maxLength={300}
        className="mt-3 max-h-64 min-h-[5.5rem] bg-background/60"
      />
      <div className="mt-3 flex items-center gap-2.5">
        <LibraryDialog />
        <Button size="sm" className="ml-auto" disabled={!text.trim()}>
          Ask the group
        </Button>
      </div>
    </div>
  );
}

/* ── the library ───────────────────────────────────────────────────── *
 *  His, 2026-09-07: "I don't know if you've redone the from the library, but
 *  the previous one was drawn in a way where it became kind of hard to read.
 *  It takes some effort to kind of get that knowledge. It was just not laid
 *  out in a very readable manner." And, of the shipped one: "the way that the
 *  folders are organized in the library isn't great."
 *
 *  What makes the shipped one hard to read is that everything in it is set at
 *  the same weight and nearly the same size: five sets, each headed by an
 *  11px uppercase letterspaced label in leaf, then five 13.5px sans lines a
 *  row apart. Twenty-five near-identical lines with no rhythm, which is why
 *  finding one "takes some effort".
 *
 *  Three changes, all of them separation rather than decoration:
 *
 *  The set names are a heading, in the heading face, sentence case, at the
 *  same size as the app's own small headings. Not shouted small caps -- that
 *  is the register he calls corporate.
 *
 *  The questions are the heading face at 15.5, which is what he said he liked
 *  about the drawn version of the asked list: "it is serif ... it's a bit more
 *  approachable, but there's something nicer about that." A question is a
 *  sentence somebody wrote, so it is set like one.
 *
 *  And there is air. A row is 10px of padding rather than 8, and a set is
 *  separated from the next by a clear band rather than by a colour change on
 *  one small line. No rules: "we have that list of names, a horizontal line,
 *  and then a box ... it's just not beautiful."
 */
function LibraryDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Library className="h-3.5 w-3.5" />
        From the library
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[19px] tracking-tight">
              Ask something from the library
            </DialogTitle>
            <DialogDescription>You can edit it before it goes to the group.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[56dvh] space-y-7 overflow-y-auto pr-1">
            {CATCHUP_PROMPT_SETS.map((set) => (
              <section key={set.id}>
                <h3 className="mb-1.5 px-2.5 font-sans text-[13px] font-medium text-muted-foreground">
                  {set.label}
                </h3>
                <div>
                  {set.prompts.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setOpen(false)}
                      className="state-layer block w-full rounded-[10px] px-2.5 py-2.5 text-left font-heading text-[15.5px] leading-snug text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── what the group has asked ──────────────────────────────────────── *
 *  The SHIPPED panel, on this page, and it is his instruction of
 *  2026-09-07: "put the questions panel like what's there in the shipped
 *  version just there on the page."
 *
 *  What the drawing had instead was a bare serif list on the page's own
 *  textured paper, and he named both faults. The functional one: "here, I
 *  can't really clear the questions as well, so there's definitely a loss of
 *  functionality" -- the shipped panel can move a question up, move it down
 *  and take it out, and mine could do none of those. The visual one: "having
 *  tiny text on this textured background doesn't work that well ... big text
 *  like the title, all of that is fine, but tiny text against the textured
 *  background is hard to see." So every row sits on card stock, which is the
 *  same reason the answers in the reader are tiles (R40).
 *
 *  What it keeps from mine is the face: he liked that. "It is serif ... it's
 *  a bit more approachable, but there's something nicer about that." So the
 *  question itself is the heading face on paper, and the asker's name under
 *  it is the app's own small sans, exactly as the shipped row has it. */
function AskedPanel({ r, youKeep }: { r: ShelfEdition; youKeep: boolean }) {
  const [order, setOrder] = useState(r.questions);
  if (order.length === 0) return null;

  const move = (i: number, by: number) => {
    const to = i + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[i], next[to]] = [next[to], next[i]];
    setOrder(next);
  };

  return (
    <div className="card-elevated mt-4 rounded-[var(--radius)] border border-border bg-card p-4">
      <p className="mb-3 text-[13px] font-medium text-muted-foreground">
        {order.length === 1 ? "One question so far" : `${order.length} questions so far`}
      </p>
      {/* THE CONTROLS RIDE ON THE ASKER'S LINE. Beside the question they took
          84px out of a 350px phone row and squeezed it into a five-line
          ribbon; on their own line under it they cost a whole row of height
          for three glyphs. His: "these tiles can be tighter by moving those
          controls kinda in line with the name instead of wasting that space."
          So the question gets the full width, and the row that already exists
          under it -- the asker's name -- carries them at its other end. The
          tile loses about 28px and nothing else.

          Nothing is lost from the shipped panel either, which he named: "here,
          I can't really clear the questions as well, so there's definitely a
          loss of functionality." */}
      <ul className="space-y-2">
        {order.map((q, i) => (
          <li
            key={q.id}
            className="flex min-w-0 items-start gap-2.5 rounded-[10px] border border-border/70 bg-background/40 px-3 py-2.5"
          >
            {q.asker ? (
              <BirdAvatar user={q.asker} size={28} />
            ) : (
              <span className="mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                ?
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[15.5px] leading-snug text-foreground">{q.text}</p>
              <div className="mt-0.5 flex min-h-[26px] items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[11.5px] font-medium text-muted-foreground">
                  {q.askedBy ?? "Someone in the group"}
                </p>
                {youKeep && (
                  <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
                    <RowButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </RowButton>
                    <RowButton
                      label="Move down"
                      disabled={i === order.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </RowButton>
                    <RowButton
                      label="Take it out"
                      destructive
                      onClick={() => setOrder(order.filter((x) => x.id !== q.id))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </RowButton>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors duration-150 active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "state-layer hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ── answering, and it happens HERE ────────────────────────────────── *
 *  His, 2026-09-07: "I don't like this answer CTA. I kind of feel like, you
 *  know what, maybe we should just tie in the huge answering UI we had with
 *  our home screen or whatever. Because it doesn't make sense to have the
 *  collecting in the home screen and then the answering takes you away from
 *  it." And, in the same breath: "put the questions panel like what's there
 *  in the shipped version just there on the page instead of on a new page."
 *
 *  He is right and it is the same argument twice: asking happens in a box on
 *  this page, so answering has no business being a different address. The
 *  Edition region is now the writing surface itself -- the question you are on,
 *  the box, somewhere to put photographs, and the way forward.
 *
 *  Two things carried over from the shipped composer he already fixed by eye
 *  (his N36): there is no rule under the photograph strip, and Skip and the
 *  forward button sit on ONE line -- "I would remove that horizontal line
 *  under add a photo and just move the skip for now and share above, on the
 *  same line."
 *
 *  The dots above are the shipped progress rail's job, done without numbers:
 *  "How does it matter whether it's 15 or 16?" A filled mark is answered, the
 *  wide one is where you are. */
/** Stand-ins for a photograph somebody attaches. Three, because three is the
 *  app's own cap per answer (`actions.ts:148`), and of different shapes so the
 *  row is tested against a portrait as well as a landscape. */
const ATTACHABLE = [
  "/images/collection/v2.webp",
  "/images/collection/demo-banyan-canopy.webp",
  "/images/collection/v3.webp",
];
const PHOTO_CAP = 3;

/* ── the photographs on an answer, while it is being written ───────── *
 *  His, 2026-09-07: "make sure you have good ux and animations and elements
 *  are moved to good places when a photo is added to an answer cause
 *  presumably there'll be some tile expansion and maybe displacement. make
 *  sure all of that is thought through and the resultant ui is still extremely
 *  slick."
 *
 *  Four decisions, and the displacement is the whole of the problem.
 *
 *  IT GROWS DOWNWARD, NEVER UPWARD. The strip sits between the writing box and
 *  the row of controls, so adding a photograph pushes the controls down and
 *  moves nothing you are looking at. Putting it above the box would shove the
 *  words you are mid-sentence in down the screen, and putting it below the
 *  controls would separate Add a photo from what it just added.
 *
 *  THE ROW ANIMATES ITS HEIGHT, THE TILES ANIMATE THEMSELVES. The container
 *  opens 0 -> auto so everything under it travels once, smoothly, instead of
 *  jumping a hundred pixels; each tile fades and rises 8px into place. Removing
 *  reverses it, and `AnimatePresence` with a `popLayout` mode lets the
 *  survivors slide across into the gap rather than teleporting.
 *
 *  THE EXIT IS FASTER THAN THE ENTER. 180ms out against 280 in, the same ratio
 *  as the replies and the question panel: a thing arriving may take its time,
 *  a thing you have just dismissed may not.
 *
 *  AND THE CONTROL STOPS OFFERING WHAT IT CANNOT DO. At three the button is
 *  disabled rather than erroring on the fourth, which is the cap the app
 *  actually enforces. */
function Attachments({
  photos,
  onRemove,
}: {
  photos: string[];
  onRemove: (i: number) => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {photos.length > 0 && (
        <m.div
          key="strip"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.28, ease: EASE_OUT_SMOOTH },
            opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
          }}
          className="overflow-hidden"
        >
          <ul className="flex gap-2 pt-3">
            <AnimatePresence initial={false} mode="popLayout">
              {photos.map((src, i) => (
                <m.li
                  key={`${i}-${src}`}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.28, ease: EASE_OUT_SMOOTH }}
                  className="relative"
                >
                  <span className="block h-[76px] w-[76px] overflow-hidden rounded-[10px] bg-muted">
                    <Image
                      src={src}
                      alt=""
                      width={152}
                      height={152}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  {/* Always visible, not on hover: half the people attaching a
                      photograph are on a phone, where there is no hover and a
                      control that only appears on one does not exist. */}
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    aria-label="Take this photograph off"
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_3px_rgba(30,28,22,0.18)] transition-colors duration-150 hover:text-foreground active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Answering({ r }: { r: ShelfEdition }) {
  const [at, setAt] = useState(0);
  /* Each question keeps what you typed and what you attached, so moving
     between them is free and nothing is lost by looking ahead. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [shots, setShots] = useState<Record<string, string[]>>({});
  const q = r.questions[at];
  if (!q) return null;
  const text = drafts[q.id] ?? "";
  const photos = shots[q.id] ?? [];
  const last = at === r.questions.length - 1;
  const written = (x: { id: string }) =>
    Boolean((drafts[x.id] ?? "").trim()) || (shots[x.id] ?? []).length > 0;
  const go = (i: number) => setAt(Math.max(0, Math.min(i, r.questions.length - 1)));
  const addPhoto = () =>
    setShots((p) => {
      const has = p[q.id] ?? [];
      if (has.length >= PHOTO_CAP) return p;
      return { ...p, [q.id]: [...has, ATTACHABLE[has.length % ATTACHABLE.length]] };
    });

  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
      {/* Tighter, top and bottom. Each mark used to sit in a 20px-tall target
          under 20px of card padding, so there were 28px of nothing above a 3px
          line and 24 below it -- "the padding above and below the orange
          progress bar while answering is too big. too much space above and too
          much below. seems imbalanced." */}
      {/* THE MARKS ARE THE NAVIGATOR. They were a read-only progress bar and he
          could not get past them: "I can't really navigate between questions
          while answering them." So every mark is a button to its own question,
          the one you are on is wide, and the ones you have answered are filled.
          No "4 of 11" anywhere near them: "How does it matter whether it's 15
          or 16?" */}
      <ol
        className="-mt-1 mb-2.5 flex flex-wrap items-center gap-1.5"
        aria-label="The questions in this Edition"
      >
        {r.questions.map((x, i) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-label={x.text}
              aria-current={i === at ? "step" : undefined}
              title={x.text}
              className="group grid h-3.5 place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  "block h-[3px] rounded-full transition-all duration-300 ease-out",
                  i === at
                    ? "w-7 bg-cinnamon"
                    : written(x)
                      ? "w-3 bg-cinnamon/45 group-hover:bg-cinnamon/70"
                      : "w-3 bg-border group-hover:bg-muted-foreground/50",
                )}
              />
            </button>
          </li>
        ))}
      </ol>

      <h2 className="font-heading text-[20px] leading-snug text-foreground [overflow-wrap:anywhere]">
        {q.text}
      </h2>
      {q.askedBy && (
        <p className="mt-1.5 text-[13px] text-muted-foreground">Asked by {q.askedBy}</p>
      )}

      <Textarea
        value={text}
        onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
        aria-label={q.text}
        className="mt-4 min-h-[168px] bg-background/60 font-heading text-[17px] leading-[1.7]"
      />

      {/* Between the box and the controls, so it grows downward and never moves
          the sentence you are in the middle of. */}
      <Attachments
        photos={photos}
        onRemove={(i) =>
          setShots((p) => ({ ...p, [q.id]: (p[q.id] ?? []).filter((_, n) => n !== i) }))
        }
      />

      {/* One line, no rule above it, which is his own edit to the shipped
          composer: "I would remove that horizontal line under add a photo and
          just move the skip for now and share above, on the same line." */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button variant="outline" size="sm" onClick={addPhoto} disabled={photos.length >= PHOTO_CAP}>
          <ImagePlus className="h-4 w-4" />
          {photos.length === 0 ? "Add a photo" : "Add another"}
        </Button>
        {/* No "Skip for now". The shipped composer offers it beside Next and he
            cut it: "remove skip for now. just have next. skip for now is same
            as next." It is -- neither writes anything and both move you on. */}
        {/* Back sits WITH Next, not out by the photograph: "in answering have
            the back button near the next button not near the photo button."
            They are one pair, the way through the Edition, and a control's
            neighbours are what say what it does. */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={at === 0}
            onClick={() => go(at - 1)}
            aria-label="The question before"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button size="sm" onClick={() => (last ? undefined : go(at + 1))}>
            {last ? "Share" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Edition({ c, onRead }: { c: SketchCatchup; onRead: (r: ShelfEdition) => void }) {
  const r = c.edition;

  /* Over. Tested BEFORE the branches below, because an ended Catch-up has no
     live Edition: `!r` was true and it fell through to offering **Start the
     first Edition** on a Catch-up that is finished and has already had several.
     His: "why is ended start the first round? ... Firstly, it wouldn't be the
     first round anyway." */
  if (c.state === "ended") return null;
  if (!r) return null;

  /* HELD. It used to render exactly what `answering` renders, with one word
     changed, and he caught it: "why is paused the same as answering?" A held
     Catch-up is not a Catch-up you can write in -- the clock is stopped, so
     the box would be a lie. It says so, once, and offers the one control that
     changes it. */
  if (c.paused) {
    return (
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
        <p className="font-heading text-[17px] text-foreground">This Catch-up is on hold</p>
        {/* The sentence that used to sit here -- "Nothing goes out and no clock
            is running until someone starts it again" -- is deleted at his word.
            It explained the mechanism of a state whose name already says it,
            which is the same fault as the rhythm line and the sentence
            defining an Edition: "we don't need to teach them how to use it." */}
        <Button size="sm" className="mt-4">
          Start it again
        </Button>
      </div>
    );
  }

  if (c.state === "collecting") {
    return (
      <div>
        <AskBox first={r.questions.length === 0} />
        <AskedPanel r={r} youKeep={c.youKeep} />
      </div>
    );
  }

  if (c.state === "answering") return <Answering r={r} />;

  /* Out. The cover, and nothing else. */
  return <Cover edition={r} fallback={c.picture} onOpen={() => onRead(r)} />;
}

/* ── the page ──────────────────────────────────────────────────────── */

/* ── the sidebar ───────────────────────────────────────────────────── *
 *  The back numbers, and nothing else. His, 2026-09-07: "the sidebar is
 *  either empty or filled with nonsense. just put the previous rounds
 *  there."
 *
 *  He is right on both counts, and the second one is measurable. The rail
 *  held a list of verbs, so on a batch Catch-up -- where nobody keeps
 *  anything and there is nothing to run -- it was ONE row, Reminders, alone
 *  in a 300px column. The verbs are behind the Settings door on the picture
 *  now, with the people, so the column carries the one thing that is worth a
 *  column: every Edition that has already come out, as its own cover.
 *
 *  It also puts them where the eye is already going. Earlier Editions used to
 *  sit under the content, which on a published home meant scrolling past the
 *  newest cover to find the older ones, and on a phone meant the page ended
 *  in a stack of pictures he called "so huge and look so disgusting". */
function EarlierEditions({
  c,
  onRead,
  phone,
}: {
  c: SketchCatchup;
  onRead: (r: ShelfEdition) => void;
  phone: boolean;
}) {
  /* THE COLUMN NEVER GOES EMPTY. On a Catch-up whose first Edition is still
     being made there are no back numbers, and the sidebar simply vanished --
     so the page had a wide column and a void beside it, and then grew a
     sidebar out of nowhere the day Edition one came out. His: "make sure you
     have a pretty way of having at least something even maybe placeholder on
     the sidebar when it's the first catch up and there's no previous ones."

     What stands in is the Catch-up's own photograph at the cover's exact
     shape and size, quietened, with one line on it. Not a dashed box and not
     an empty state illustration: the same object the column is made of, so
     when the first Edition arrives nothing moves -- the picture is simply
     replaced by the photographs people took. */
  if (c.before.length === 0) {
    return (
      <div
        className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        aria-hidden
      >
        <div className="relative" style={{ aspectRatio: phone ? "3 / 1" : "5 / 2" }}>
          <Image
            src={c.picture.src}
            alt=""
            fill
            sizes="360px"
            style={{ objectPosition: c.picture.focus }}
            className="object-cover opacity-[0.45] grayscale-[0.35]"
          />
        </div>
        <p className="px-4 py-2.5 font-sans text-[13px] text-muted-foreground">
          Your previous Editions appear here
        </p>
      </div>
    );
  }
  return (
    <section>
      {/* NO HEADING. It said "Earlier Rounds" over a column of covers, each
          of which is a photograph with a date on it in a sidebar -- there is
          nothing else they could be. His: "delete the Earlier Rounds text
          completely. so both tiles move up and let their tops cleanly align."
          The alignment is the second half of it and the better argument: with
          a label here and a state line above the tile opposite, the two
          columns started 20-odd pixels apart for no reason either of them
          could see. */}
      <div className="space-y-3">
        {c.before.map((r) => (
          <Cover
            key={r.number}
            edition={r}
            fallback={c.picture}
            onOpen={() => onRead(r)}
            compact
            phone={phone}
          />
        ))}
      </div>
    </section>
  );
}

export function Home({
  c,
  onRead,
  phone,
}: {
  c: SketchCatchup;
  onRead: (r: ShelfEdition) => void;
  phone: boolean;
}) {
  const edition = (
    <div className={phone ? "mt-5" : "mt-6"}>
      <Edition c={c} onRead={onRead} />
      <Stage c={c} />
    </div>
  );

  if (phone) {
    return (
      <div>
        <Head c={c} phone />
        {edition}
        <div className="mt-11">
          <EarlierEditions c={c} onRead={onRead} phone />
        </div>
      </div>
    );
  }

  /* Both columns flush to the page's own gutters, with only the space
     BETWEEN them growing -- which is the reader's rule and the one he
     approved: "the margins are totally messed up ... what is there in the
     shipped version now has much better margins. It like fills up the
     screen." The page used to cap at 1,076, so at his 1512 the left margin
     was the shell's 40 and the right was 148: "the margin on the right is so
     much bigger than the margin on the left. That makes no sense." */
  return (
    <div>
      <Head c={c} phone={false} />
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: `minmax(0,1fr) ${HOME_RAIL}px`, columnGap: HOME_GAP }}
      >
        <div className="min-w-0">{edition}</div>
        <aside className="sticky self-start pt-6" style={{ top: 40 }}>
          <EarlierEditions c={c} onRead={onRead} phone={false} />
        </aside>
      </div>
    </div>
  );
}
