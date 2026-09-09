"use client";

/* ------------------------------------------------------------------ *
 *  Collecting: the box you ask a question in, and the questions asked
 *  so far.
 *
 *  THE BOX IS THE SHIPPED ONE, and it is here because he named it as
 *  better than what I drew: "the asking thing now has a box. And it
 *  says, be the first to ask. And then under that, it would show
 *  everything ... the asking is probably even better now on the shipped
 *  version than what you've created. This asking thing shows the
 *  questions. It doesn't invite you to ask." Mine had the list first and
 *  a button under it. Inverted.
 *
 *  ONE ROW OF CONTROLS, AND ANONYMITY IS A MARK RATHER THAN A CHOICE.
 *  It used to be a two-option segmented pill (Ask as Sanan / Ask
 *  anonymously) plus two buttons: three controls across two rows for one
 *  question. His: "obviously ask. I think we can default to non
 *  anonymous. we can have just some icon or something you click and then
 *  it's anonymous. if not it's not ... I think we should be able to fit
 *  it in one row. maybe below we have library and ask and the anonymous
 *  is somehow on the top right."
 *
 *  NOTHING AT REST. A line saying "Going out as Sanan" was on screen
 *  permanently to explain a state that is the default: "don't say Going
 *  out as Sanan. don't have that line. if they click the eye then you
 *  cleanly smoothly expand the box to show that line and it says 'Ask
 *  anonymously'."
 *
 *  NO LIST OF QUESTIONS ANYWHERE ELSE. He said it three times in one
 *  sitting about three different screens: "Why do we just have this list
 *  of questions? I just don't get it. It's so annoying." Collecting is
 *  the one place they earn their space, because there they are the thing
 *  being made.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Library, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callAction } from "@/lib/call-action";
import { curatePrompt, submitPrompt } from "@/app/(main)/catchups/actions";
import type { CatchupPromptSet } from "@/lib/catchups-core";
import { cn } from "@/lib/utils";
import type { HomePromptView } from "./types";

/** The app's own ceiling on a question, and the same number the server
 *  validates against, so the counter and the refusal cannot disagree. */
const QUESTION_MAX = 300;

export function AskBox({
  editionId,
  first,
  library,
  onAsked,
}: {
  editionId: string;
  first: boolean;
  library: CatchupPromptSet[];
  onAsked: () => void;
}) {
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openLibrary, setOpenLibrary] = useState(false);

  async function ask() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const result = await callAction(() =>
        submitPrompt({ editionId, text: body, showAsker: !anon })
      );
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setText("");
      setAnon(false);
      onAsked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-elevated relative rounded-[var(--radius)] border border-border bg-card p-5">
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
               title beside it is 23px of ink, and the row's height is what
               the revealed line below measures its gap from. */
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
        maxLength={QUESTION_MAX}
        className="mt-3 max-h-64 min-h-[5.5rem] bg-background/60 [overflow-wrap:anywhere]"
      />
      <div className="mt-3 flex items-center gap-2.5">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpenLibrary(true)}>
          <Library className="h-3.5 w-3.5" />
          From the library
        </Button>
        <Button size="sm" className="ml-auto" disabled={!text.trim() || busy} onClick={ask}>
          Ask the group
        </Button>
      </div>
      <LibraryDialog
        open={openLibrary}
        onOpenChange={setOpenLibrary}
        library={library}
        onPick={(t) => {
          setText(t);
          setOpenLibrary(false);
        }}
      />
    </div>
  );
}

/* ── the library ───────────────────────────────────────────────────── *
 *  His, 2026-09-07: "the previous one was drawn in a way where it became
 *  kind of hard to read. It takes some effort to kind of get that
 *  knowledge." And, of the shipped one: "the way that the folders are
 *  organized in the library isn't great."
 *
 *  What made it hard to read is that everything in it was set at the
 *  same weight and nearly the same size: five sets, each headed by an
 *  11px uppercase letterspaced label, then five 13.5px sans lines a row
 *  apart. Twenty-five near-identical lines with no rhythm.
 *
 *  Three changes, all separation rather than decoration. The set names
 *  are a heading in sentence case, not shouted small caps -- that is the
 *  register he calls corporate. The questions are the heading face,
 *  which is what he said he liked: "it is serif ... there's something
 *  nicer about that." A question is a sentence somebody wrote, so it is
 *  set like one. And there is air: a set is separated from the next by a
 *  clear band rather than by a rule. "We have that list of names, a
 *  horizontal line, and then a box ... it's just not beautiful." */
function LibraryDialog({
  open,
  onOpenChange,
  library,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  library: CatchupPromptSet[];
  onPick: (text: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask something from the library</DialogTitle>
          <DialogDescription>You can edit it before it goes to the group.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[56dvh] space-y-7 overflow-y-auto pr-1">
          {library.map((set) => (
            <section key={set.id}>
              <h3 className="mb-1.5 px-2.5 font-sans text-[13px] font-medium text-muted-foreground">
                {set.label}
              </h3>
              <div>
                {set.prompts.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => onPick(text)}
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
  );
}

/* ── what the group has asked ──────────────────────────────────────── *
 *  The SHIPPED panel, on this page, and it is his instruction: "put the
 *  questions panel like what's there in the shipped version just there
 *  on the page."
 *
 *  What the drawing had instead was a bare serif list on the page's own
 *  textured paper, and he named both faults. The functional one: "here,
 *  I can't really clear the questions as well, so there's definitely a
 *  loss of functionality" -- the shipped panel can move a question up,
 *  move it down and take it out, and mine could do none of those. The
 *  visual one: "tiny text against the textured background is hard to
 *  see." So every row sits on card stock.
 *
 *  THE CONTROLS RIDE ON THE ASKER'S LINE. Beside the question they took
 *  84px out of a 350px phone row; on their own line under it they cost a
 *  whole row of height for three glyphs. His: "these tiles can be
 *  tighter by moving those controls kinda in line with the name instead
 *  of wasting that space." */
export function AskedPanel({
  editionId,
  prompts,
  youKeep,
  onChanged,
}: {
  editionId: string;
  prompts: HomePromptView[];
  youKeep: boolean;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState(prompts);
  const [busy, setBusy] = useState(false);

  /* The server is the authority: a refresh after asking, removing or
     reordering brings the real order down and this follows it. Without
     this the panel kept whatever it had optimistically arranged and a
     failed reorder stayed on screen looking saved. */
  const [seen, setSeen] = useState(prompts);
  if (seen !== prompts) {
    setSeen(prompts);
    setOrder(prompts);
  }

  if (order.length === 0) return null;

  async function persist(next: HomePromptView[], undo: HomePromptView[]) {
    setOrder(next);
    setBusy(true);
    try {
      const result = await callAction(() =>
        curatePrompt({
          action: "reorder",
          editionId,
          orderedPromptIds: next.map((q) => q.id),
        })
      );
      if (result && "error" in result && result.error) {
        setOrder(undo);
        toast.error(result.error);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, by: number) {
    const to = i + by;
    if (to < 0 || to >= order.length || busy) return;
    const next = [...order];
    [next[i], next[to]] = [next[to], next[i]];
    void persist(next, order);
  }

  async function remove(id: string) {
    if (busy) return;
    const was = order;
    setOrder(order.filter((q) => q.id !== id));
    setBusy(true);
    try {
      const result = await callAction(() => curatePrompt({ action: "remove", promptId: id }));
      if (result && "error" in result && result.error) {
        setOrder(was);
        toast.error(result.error);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-elevated mt-4 rounded-[var(--radius)] border border-border bg-card p-4">
      <p className="mb-3 font-sans text-[13px] font-medium text-muted-foreground">
        {order.length === 1 ? "One question so far" : `${order.length} questions so far`}
      </p>
      <ul className="space-y-2">
        {order.map((q, i) => (
          <li
            key={q.id}
            className="flex min-w-0 items-start gap-2.5 rounded-[10px] border border-border/70 bg-background/40 px-3 py-2.5"
          >
            {q.author ? (
              <BirdAvatar user={q.author} size={28} />
            ) : (
              <span className="mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                ?
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[15.5px] leading-snug text-foreground [overflow-wrap:anywhere]">
                {q.text}
              </p>
              <div className="mt-0.5 flex min-h-[26px] items-center justify-between gap-3">
                <p className="min-w-0 truncate font-sans text-[11.5px] font-medium text-muted-foreground">
                  {q.isOwn ? "You" : (q.author?.name ?? "Someone in the group")}
                </p>
                {youKeep && (
                  <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
                    <RowButton label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </RowButton>
                    <RowButton
                      label="Move down"
                      disabled={i === order.length - 1 || busy}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </RowButton>
                    <RowButton
                      label="Take it out"
                      destructive
                      disabled={busy}
                      onClick={() => void remove(q.id)}
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
