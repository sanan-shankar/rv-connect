"use client";

/* ------------------------------------------------------------------ *
 *  THE THREE QUESTIONS THE ARCHIVE ASKS ABOUT A PHOTOGRAPH.
 *
 *  What it is of, when it was taken, and what you remember -- in the
 *  owner's own order (2026-08-28), which is roughly the order somebody
 *  knows those three things about an old picture and puts the one-tap
 *  question at the top where the answer rate is highest.
 *
 *  These lived inside the contribute room until 2026-08-30, when the
 *  owner asked for the same questions to be askable AGAIN, later:
 *  "instead of delete photo button, have an edit icon. there let it pull
 *  up a dialog similar to the contribute where they can retag, recaption,
 *  and add year." Two rooms asking the same three questions is exactly
 *  the thing that drifts -- a seventh bucket, a change to what the date
 *  box understands, a reworded hint -- so they ask from here, once.
 *
 *  The room around them is NOT here. Contributing is a wall of files
 *  climbing to a bucket; editing is one row already in the archive. What
 *  they share is the asking, and that is all this file holds.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FIELD_PAD,
  FLOAT_LABEL_BASE,
  FLOAT_LABEL_REST,
  FLOAT_LABEL_UP,
  FloatArea,
} from "@/components/common/float-field";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { eraFromPartial, eraSaid, MONTHS, typedDate, yearGiven } from "@/lib/collection";
import { valleyYear } from "@/lib/utils";
import { BucketTiles } from "./bucket-tiles";
import { cn } from "@/lib/utils";

/** What the questions answer, for one photograph.
 *
 *  `area` used to be here as a fourth field, "Where in the valley?". The
 *  owner deleted it: "remove where in the valley. we should prompt them to
 *  include that in the description." Two boxes asking for prose about one
 *  photograph is how you get one of them left blank; search cannot tell the
 *  two columns apart anyway (spec sec.7.2), so the place is now something the
 *  description's own hint asks for. Existing rows keep whatever they were
 *  given, the viewer still prints it, and editing one leaves it alone.
 *
 *  The date is two fields because a contributor may know any amount:
 *  nothing (leave it), a decade (three digits), a year, a month.
 */
export type PhotoAnswers = {
  caption: string;
  buckets: string[];
  /** Digits as typed, up to four. THE ONLY DATE FIELD THERE IS NOW.
   *
   *  There used to be a `decade` beside it, holding one of ten pills or the
   *  word "unknown". The owner scrapped the pills outright (2026-08-28) and
   *  the field absorbed what they did: three digits is a decade, four is a
   *  year, nothing is nothing. So a contributor stops typing when they run
   *  out of certainty rather than choosing which of two controls matches how
   *  much they know. See `photoDate` in lib/collection.ts. */
  year: string;
  /** A month name from MONTHS, or "" -- and only ever alongside a real year,
   *  because a month with no year is not something the archive can file. */
  month: string;
};

export const EMPTY_ANSWERS: PhotoAnswers = {
  caption: "",
  buckets: [],
  year: "",
  month: "",
};

/** A photograph already in the archive, as answers a person can change.
 *  The date half is `typedDate`, which is pinned as the exact inverse of what
 *  a save writes back -- so opening a photograph and saving it untouched
 *  files it exactly where it already was. */
export function answersFor(photo: {
  caption: string | null;
  subject: string[];
  photoYear?: number | null;
  photoMonth?: number | null;
  datePrecision?: string | null;
  era?: string | null;
}): PhotoAnswers {
  return {
    caption: photo.caption ?? "",
    buckets: photo.subject,
    ...typedDate(photo),
  };
}

/* ------------------------------------------------------------------ *
 *  The asking itself.
 *
 *  `idPrefix` exists because both rooms can be mounted at once -- the
 *  contribute pop-up stays in the tree after it closes, so its close
 *  animation can run -- and two labels pointing at one id is a label that
 *  focuses the wrong box.
 * ------------------------------------------------------------------ */
export function PhotoQuestions({
  idPrefix,
  value,
  onAnswer,
}: {
  idPrefix: string;
  value: PhotoAnswers;
  onAnswer: (patch: Partial<PhotoAnswers>) => void;
}) {
  return (
    <>
      {/* 15px, not 13.5. These headings are the questions themselves, and
          the owner's read of the type across this flow was that it had
          stopped respecting the reader: "we have to make sure we don't use
          fonts that are too small on mobile, because this is getting to
          become a bad accessibility thing." */}
      <p className="mb-2 text-[15px] font-semibold text-foreground">What is it of?</p>
      <BucketTiles
        value={value.buckets}
        onChange={(next) => onAnswer({ buckets: next })}
      />

      {/* ONE CARD, TWO ROWS, ONE FRAME. These were two separately bordered
          boxes under a heading each, which is four shapes where the eye wants
          one: "an excess of elements and border... overcrowded and disgusting"
          (owner, 2026-08-28). Grouped, they read as a single form the way an
          inset list does, and the float labels are the headings -- so two
          headings went too.

          `overflow-hidden` is what lets the group's radius clip rows that draw
          no radius of their own. */}
      <div className="mt-5 overflow-hidden rounded-[var(--radius-input)] border border-border">
        <WhenField id={`${idPrefix}-year`} meta={value} onAnswer={onAnswer} />

        {/* THE DESCRIPTION, and it is the one prose field left.

            The label was "What is this photograph?" and the owner cut it back:
            "don't say what is this photograph, we can just say add a
            description." A question mark on a form is a thing you owe an
            answer to; a label is a box you may use.

            The hint behind the (i) lost three things and kept one. Gone: the
            bolding on what/where/who ("I don't want to bold this"), "if you
            know", and "a line is plenty, and nothing is required" -- two
            hedges apologising for a question that had already been asked
            gently. Kept: the three prompts themselves, because
            where-in-the-valley used to be a second box and this sentence is
            now the only place it is asked for. */}
        <div className="border-t border-border">
          <FloatArea
            id={`${idPrefix}-caption`}
            label="Add a description"
            bare
            /* ONE row, not two. It grows from there, so the box is the size of
               what you have written rather than the size of what you might
               write -- and an empty one now matches the date row above it
               instead of towering over it. */
            rows={1}
            maxLength={300}
            value={value.caption}
            onChange={(e) => onAnswer({ caption: e.target.value.slice(0, 300) })}
            hint="Anything you remember. What is happening, where in the valley it was, and who is in it."
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  WHEN WAS IT TAKEN -- one box, and you stop typing when you run out
 *  of certainty.
 *
 *  What this replaces: ten decade pills, an "I don't know" pill, and a
 *  grow-in row holding a bordered year input and a bordered month
 *  dropdown. Thirteen controls to answer one question. The owner:
 *  "looking at that box I'm seeing it just has an excess of elements and
 *  border, it's not smart and sleek at all, it's just overcrowded and
 *  disgusting. we need to hold ourselves to a higher standard."
 *
 *  THE IDEA IS THAT THE FIELD UNDERSTANDS A PARTIAL ANSWER. Nobody
 *  chooses between "a decade" and "a year" any more, because that was
 *  never a choice about the photograph -- it was a choice about which of
 *  our controls matched how much they remembered. Here there is one
 *  numeric box, and how much you type IS the precision:
 *
 *      (blank)  nothing said, which the archive files as unknown
 *      197      the 1970s
 *      1978     1978, and only now does a month exist
 *      1978 + March
 *
 *  AND THE LABEL SAYS WHAT IT UNDERSTOOD, but only when it has something
 *  to add. At three digits it reads "Filed under the 1970s", because
 *  "197" is not self-evidently an answer and a person needs to know they
 *  can stop. At four it goes back to the question, because the year is
 *  sitting right there and a label repeating it is one more thing to
 *  read. That is the whole of the cleverness and it costs no elements:
 *  the floating label was already there.
 *
 *  MONTH ONLY EXISTS ONCE A YEAR DOES. The owner asked the question
 *  himself and left it open -- "do we show year and month or show month
 *  only after they put year? idk." The answer is in `dateMeta`: a month
 *  without a year is not something the archive can store, so a Month
 *  control sitting beside an empty box would be a permanently dead
 *  element, which is the exact complaint above. It fades in on opacity
 *  when the year becomes real, and it is text and a caret rather than a
 *  fourth bordered box.
 *
 *  The material is the signup's, not a copy of the signup: FIELD_PAD,
 *  FLOAT_LABEL_* and the JS-tracked focus are the shared primitives
 *  <PhoneField> is built from (float-field.tsx says so in as many
 *  words). What is different is everything the job is: no mist fill,
 *  because this floats on a white pop-up where a warm fill is the
 *  "yellowing"; no frame of its own, because it is the top row of a
 *  grouped card; and a label that reports rather than only names.
 * ------------------------------------------------------------------ */
function WhenField({
  id,
  meta,
  onAnswer,
}: {
  /** Unique per mounted room; see `idPrefix` above. */
  id: string;
  meta: PhotoAnswers;
  onAnswer: (patch: Partial<PhotoAnswers>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const yearRef = useRef<HTMLInputElement>(null);
  const exact = yearGiven(meta.year, valleyYear());
  const era = eraFromPartial(meta.year);
  const active = focused || meta.year !== "";

  /* The label reports only when it can say something the box does not
     already show. See the note above. */
  const says = era ? `Filed under ${eraSaid(era)}` : "When was it taken?";

  return (
    <div
      className="relative h-14 w-full"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
      /* The whole row is one target: a press on the padding, or on the empty
         middle, lands in the year rather than on nothing. Same call
         <PhoneField> makes. */
      onClick={(e) => {
        if (!(e.target instanceof HTMLInputElement) && !(e.target as HTMLElement).closest("button")) {
          yearRef.current?.focus();
        }
      }}
    >
      <div className={cn("flex h-full items-center", FIELD_PAD)}>
        <input
          ref={yearRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          /* Revealed on focus only, so the resting box holds one piece of
             text and not two -- FloatField's `focusHint` rule. */
          placeholder="1978"
          value={meta.year}
          onChange={(e) => {
            const year = e.target.value.replace(/\D/g, "").slice(0, 4);
            /* A month cannot outlive the year it belonged to. */
            onAnswer(yearGiven(year, valleyYear()) ? { year } : { year, month: "" });
          }}
          className={cn(
            "w-[4.25rem] shrink-0 bg-transparent text-base tabular-nums text-foreground outline-none",
            "placeholder:text-muted-foreground/60 placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-100"
          )}
        />

        {/* Opacity only, and it never moves the row: the year is a fixed
            width, so the month has always had its place whether or not it is
            drawn yet. */}
        <div
          className={cn(
            "ml-auto transition-opacity duration-200",
            exact ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              tabIndex={exact ? 0 : -1}
              aria-label={meta.month ? `Month: ${meta.month}. Change` : "Add a month"}
              className={cn(
                "state-layer -mx-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5",
                "text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                meta.month ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {meta.month || "Month"}
              <CaretDown size={11} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-auto min-w-36 overflow-y-auto">
              {/* First, and unlabelled as a clearing action, because taking
                  the month back off is the same gesture as choosing one. */}
              <DropdownMenuItem
                onClick={() => onAnswer({ month: "" })}
                className="px-2 py-2"
              >
                <span className={cn("text-[14px]", !meta.month && "font-semibold text-canopy")}>
                  No month
                </span>
              </DropdownMenuItem>
              {MONTHS.map((mo) => (
                <DropdownMenuItem key={mo} onClick={() => onAnswer({ month: mo })} className="px-2 py-2">
                  <span className={cn("text-[14px]", meta.month === mo && "font-semibold text-canopy")}>
                    {mo}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <label
        htmlFor={id}
        className={cn(FLOAT_LABEL_BASE, active ? FLOAT_LABEL_UP : FLOAT_LABEL_REST)}
      >
        {/* The float itself is transform-only, per the material's own rule;
            the TEXT swap is a crossfade, so "When was it taken?" becoming
            "Filed under the 1970s" reads as the field answering rather than
            as a word replaced. */}
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={says}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT_SMOOTH }}
            className="block whitespace-nowrap"
          >
            {says}
          </m.span>
        </AnimatePresence>
      </label>
    </div>
  );
}
