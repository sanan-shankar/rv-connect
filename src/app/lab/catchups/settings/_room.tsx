"use client";

/* ------------------------------------------------------------------ *
 *  The room. Three panels, one phone, four dialogs.
 *
 *  Everything on this page is the real component, live: press a row and
 *  the dialog it opens actually opens. His, 2026-09-09: "I would love to
 *  see what happens when I click on each one of these because none of
 *  these is clickable right now under the sketches and lab."
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ConfirmBody,
  FLAT_PANEL,
  PictureBody,
  REMINDERS,
  SettingsDialogs,
  SettingsPanel,
  Sheet,
  confirmCopy,
  type Opens,
} from "../_settings";
import type { SketchCatchup } from "../sketches/_shelf";

/* ── the three cases ───────────────────────────────────────────────── *
 *  The whole reason this is one room. A settings list drawn for the
 *  Keeper alone is the list nobody else ever sees; two of the three
 *  people who open this surface are not Keepers, and one of those is in a
 *  Catch-up nobody keeps at all. */
type Case = { key: string; title: string; note: string; c: SketchCatchup };

function cases(shelf: SketchCatchup[]): Case[] {
  const mine = shelf.find((c) => c.kind === "people" && c.state === "collecting") ?? shelf[0];
  const batch = shelf.find((c) => c.kind === "batch") ?? shelf[0];
  return [
    {
      key: "keeper",
      title: "You keep it",
      note: "Every row opens. The Edition group only exists here.",
      c: mine,
    },
    {
      key: "member",
      title: "You are only in it",
      note: "The same rows. Name and Rhythm state their answer and do not press.",
      c: { ...mine, youKeep: false, canRun: false },
    },
    {
      key: "batch",
      title: "Your batch",
      note: "Nobody keeps it, so nobody runs it. The picture is still anyone's.",
      c: batch,
    },
  ];
}

/* ── one panel, in the dialog's own material ───────────────────────── */
function Case({ case: k }: { case: Case }) {
  const [reminder, setReminder] = useState<string>(REMINDERS[0]);
  const [rhythm, setRhythm] = useState<string>("");
  const [name, setName] = useState(k.c.name);
  const [open, setOpen] = useState<Opens | null>(null);
  const c = { ...k.c, name };

  return (
    <div className="min-w-0">
      <h3 className="font-heading text-[15px] font-medium">{k.title}</h3>
      <p className="mt-0.5 mb-3 min-h-[2.6em] text-[13.5px] text-muted-foreground">{k.note}</p>
      {/* The X sits where the material puts it -- absolute, 8px in from the
          top and right corner -- rather than in the header's flow, so this
          exhibit is the dialog and not an impression of it. */}
      <div className={cn(FLAT_PANEL, "relative")}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="absolute top-2 right-2"
        >
          <X />
        </Button>
        <h2 className="font-heading text-base leading-none font-medium">Settings</h2>
        <SettingsPanel c={c} reminder={reminder} rhythm={rhythm} onOpen={setOpen} />
      </div>
      <SettingsDialogs
        c={c}
        open={open}
        onClose={() => setOpen(null)}
        reminder={reminder}
        onReminder={setReminder}
        rhythm={rhythm}
        onRhythm={setRhythm}
        name={name}
        onName={setName}
        onPicture={() => setOpen(null)}
      />
    </div>
  );
}

/* ── the phone ─────────────────────────────────────────────────────── *
 *  The sheet is `fixed`, so it cannot be framed: it is opened over the
 *  window, which at 390 is exactly what a member gets. The button is
 *  here because at 1512 there is otherwise no way to see it. */
function Phone({ c }: { c: SketchCatchup }) {
  const [open, setOpen] = useState(false);
  const [reminder, setReminder] = useState<string>(REMINDERS[0]);
  const [rhythm, setRhythm] = useState<string>("");
  const [name, setName] = useState(c.name);
  const [row, setRow] = useState<Opens | null>(null);
  const live = { ...c, name };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
        Open the sheet
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Settings">
        <SettingsPanel c={live} reminder={reminder} rhythm={rhythm} onOpen={setRow} className="pb-2" />
      </Sheet>
      <SettingsDialogs
        c={live}
        open={row}
        onClose={() => setRow(null)}
        reminder={reminder}
        onReminder={setReminder}
        rhythm={rhythm}
        onRhythm={setRhythm}
        name={name}
        onName={setName}
        onPicture={() => setRow(null)}
      />
    </>
  );
}

/* ── the four, side by side ────────────────────────────────────────── *
 *  Drawn flat rather than opened one at a time, because the thing being
 *  judged is whether they read as one family. */
const FAMILY = ["leave", "end", "start-next"] as const;

function Family({ c }: { c: SketchCatchup }) {
  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fill,minmax(0,384px))]">
      {FAMILY.map((key) => {
        const copy = confirmCopy(key, c);
        return (
          <div key={key} className={cn(FLAT_PANEL, "min-w-0")}>
            <ConfirmBody
              flat
              title={copy.title}
              line={copy.line}
              verb={copy.verb}
              oneWay={copy.oneWay}
              onCancel={() => {}}
              onDo={() => {}}
            />
          </div>
        );
      })}
      <div className={cn(FLAT_PANEL, "min-w-0")}>
        <PictureBody flat c={c} onCancel={() => {}} onUse={() => {}} />
      </div>
    </div>
  );
}

export function SettingsRoom({ shelf }: { shelf: SketchCatchup[] }) {
  const list = cases(shelf);
  /* `w-full` is load-bearing. The root layout's <body> is `flex flex-col`,
     and an auto horizontal margin on a flex child DISABLES align-self:
     stretch -- so `mx-auto max-w-[...]` alone sized this page to its own
     content and centred it. It looked fine only while the grid inside it
     demanded three fixed columns; the moment the columns could shrink, the
     whole room collapsed to 526px in a 1512px window. */
  return (
    <div className="mx-auto w-full max-w-[1264px] px-5 py-8 sm:px-8">
      <h1 className="font-heading text-[26px] leading-tight">The settings are a description</h1>
      <div className="mt-3 max-w-[62ch] space-y-3 text-[15px] leading-[1.6] text-muted-foreground">
        <p>
          The old list gave every row a beige tile. Nine of them in a column, all the same shape,
          two of them brown because the row was one-way. Nothing in that column told you anything
          the words underneath did not.
        </p>
        <p>
          So there are no tiles here, and no rules, and no card inside the card. A Catch-up&rsquo;s
          settings are the Catch-up described: Name, Picture and Rhythm are the same three rows for
          everybody, and who you are decides which of them open. A row you cannot change still says
          what it is. That is what stops your batch&rsquo;s panel looking like a mistake.
        </p>
        <p>
          The only colour left is the words <span className="text-cinnamon">Cannot be undone</span>,
          where a value would go, and the button that does the thing. Press anything.
        </p>
      </div>

      <h2 className="mt-10 mb-5 font-heading text-[19px]">Three people, one list</h2>
      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fill,minmax(0,384px))]">
        {list.map((k) => (
          <Case key={k.key} case={k} />
        ))}
      </div>

      <h2 className="mt-12 mb-2 font-heading text-[19px]">On a phone</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
        It says Settings at the top left and has an X at the top right, and the grabber pill is
        gone. Swipe down anywhere on it and it comes down, as long as the list is already at the
        top; anywhere else in the list a downward swipe still scrolls.
      </p>
      <Phone c={list[0].c} />

      <h2 className="mt-12 mb-2 font-heading text-[19px]">What the one-way rows open</h2>
      <p className="mb-5 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
        A title naming the thing, one line saying what will be true afterwards, Cancel and then the
        verb. Never &ldquo;Are you sure&rdquo;, and never a second paragraph.
      </p>
      <Family c={list[0].c} />
    </div>
  );
}
