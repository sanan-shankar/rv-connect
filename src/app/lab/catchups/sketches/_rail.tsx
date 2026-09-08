"use client";

/* ------------------------------------------------------------------ *
 *  The rail: where every control lives, in the same place, always.
 *
 *  THIS IS THE THING THAT WAS MISSING. The first draft of this home had
 *  no rail and put the controls in a row of equal pills under the
 *  content, which is how they ended up, in his words: "you have these
 *  controls like nudge everyone, close now, just hanging in the middle of
 *  nowhere. It looks so horrible. Just arbitrarily there. There's no
 *  sense. Revolut wouldn't ship something like this. Apple wouldn't."
 *
 *  He was also clear that the SHIPPED version, whose settings panel he
 *  has complained about for months, is better than that: "at least it
 *  works ... it's not great but it's not as atrocious design as your just
 *  nudge everyone in the middle of nowhere." The reason it is better is
 *  that it has a rail, so every control has an address.
 *
 *  THE RULE, which is what stops it happening again. A control is either
 *  the page's ONE primary action, in the content, attached to the thing
 *  it acts on -- or it is in this rail. There is no third place, and
 *  there is never a row of equal-weight pills in the content.
 *
 *  WHAT IS LEFT IN THIS FILE, since 2026-09-09: the two doors on the
 *  photograph and the roster behind one of them. The settings LIST, the
 *  sheet, and every dialog a row opens moved to `../_settings.tsx`, which
 *  the /lab/catchups/settings room draws on its own for all three of the
 *  people who open it. One implementation, two doors, so the spine and
 *  that room cannot drift.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Sprout, Users } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import {
  PictureDoor,
  REMINDERS,
  SettingsDialogs,
  SettingsPanel,
  Sheet,
  type Opens,
} from "../_settings";
import { cn } from "@/lib/utils";
import type { SketchCatchup } from "./_shelf";
import type { SketchPerson } from "./_types";

/* ── one person ────────────────────────────────────────────────────── *
 *  Names, with birds beside them, and never a bird alone: "a row of birds
 *  with this plus icon ... I am not identifying the birds or the people"
 *  (para 23). The Keeper's sprout follows the name rather than sitting at
 *  the far end of the column, which stranded a single mark 180px from the
 *  person it belongs to. */
export function Person({ p, size = 30 }: { p: SketchPerson; size?: number }) {
  /* A LINK, all of it. His, 2026-09-07: "under people all the profiles should
     be clickable and take you to their profile." A name and a face in this app
     always go to the person -- the feed's byline, the directory's card, an
     answer's author -- and this roster was the one place they did not, which
     made the sheet a dead end you had to back out of to find anybody. */
  /* A PLAIN <a>, not next/link, and only because this is the lab. Measured
     2026-09-07: a client-side navigation from `/lab/...` into `(main)/...`
     crosses two different layout trees, and the `(main)` layout does not take
     over -- the profile arrived with `main` at left 0 and width 1512 instead
     of left 248 and width 1264, i.e. drawn without the app's sidebar, which is
     what he saw: "their tile wasn't in the right spot. it was weirdly off to
     the side but when I reloaded the page it was all fine."

     Nothing is wrong with the profile, and nothing here will be wrong in the
     shipped version: this roster lives inside `(main)` there, so a <Link> from
     it stays in the same layout tree and is the right thing. It is only the
     lab, sitting outside that tree, that has to leave it by a full page load.
     Whoever ships this should use next/link. */
  return (
    <a
      href={`/profile/${p.id}`}
      className="state-layer -mx-2 flex min-w-0 items-center gap-2.5 rounded-full px-2 py-1 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <BirdAvatar user={p} size={size} />
      <span className="min-w-0 truncate text-[14.5px] text-foreground">{p.name}</span>
      {p.isKeeper && <Sprout className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-label="Keeper" />}
    </a>
  );
}

/* ── the way to the people ─────────────────────────────────────────── *
 *  A word on the picture, and a dialog behind it. Not three dots: "those 3
 *  dots, I would never be able to see them. They're just tucked away in some
 *  corner." It is white on the picture's own dark fade, with a hairline, so
 *  it reads as a control against a photograph rather than as a caption.
 *
 *  On a phone the same word opens a sheet from the foot, because a dialog
 *  centred in a 390px window is a sheet with worse manners. */
export function PeopleDoor({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = <PictureDoor label="People" icon={Users} onClick={() => setOpen(true)} />;

  const list = (
    <ul className={cn("gap-x-6 gap-y-3", phone ? "space-y-3" : "grid grid-cols-2")}>
      {c.members.map((p) => (
        <li key={p.id}>
          <Person p={p} size={32} />
        </li>
      ))}
    </ul>
  );

  const add = c.kind === "people" && c.youKeep;

  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onClose={() => setOpen(false)} title="People">
          {list}
          {add && (
            <button
              type="button"
              className="state-layer -mx-2 mt-3 rounded-[10px] px-2 py-1.5 text-[14px] font-medium text-canopy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              Add someone
            </button>
          )}
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {/* No per-dialog title size: the material's DialogTitle is
                16px medium and DESIGN-SYSTEM.md forbids overriding it,
                which this had been doing at 19px. */}
            <DialogTitle>People</DialogTitle>
          </DialogHeader>
          <div className="max-h-[52dvh] overflow-y-auto pr-1">{list}</div>
          {add && (
            <div>
              <Button variant="outline" size="sm">
                Add someone
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── the way to the settings ───────────────────────────────────────── *
 *  The second word on the picture, beside People, in the same clothes.
 *
 *  It exists because the sidebar no longer does. Every control that changes
 *  the Catch-up or the Edition for everybody else is behind it.
 *
 *  Words rather than a gear or three dots, for his reason: "those 3 dots, I
 *  would never be able to see them. They're just tucked away in some corner."
 *
 *  THE LIST ITSELF LIVES IN `../_settings.tsx` and is drawn on its own at
 *  /lab/catchups/settings, for all three of the people who open it. This is
 *  only the door and the frame around it, so the spine and that room cannot
 *  drift apart.
 *
 *  ONE THING STILL OPEN, and it is his: "I don't want everything in the
 *  separated thing. Honestly, the sidebar in the shipped version has some
 *  settings outside, some not, that is much nicer than this." Everything is
 *  inside here at the moment. Which one or two belong outside it, on the page,
 *  is a question for him rather than a thing to guess. */
export function SettingsDoor({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Opens | null>(null);
  const [reminder, setReminder] = useState<string>(REMINDERS[0]);
  const [rhythm, setRhythm] = useState<string>("");
  const [name, setName] = useState(c.name);
  const panel = useRef<HTMLDivElement>(null);
  const live = { ...c, name };
  const trigger = (
    <PictureDoor label="Settings" icon={SlidersHorizontal} onClick={() => setOpen(true)} />
  );
  const dialogs = (
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
  );

  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onClose={() => setOpen(false)} title="Settings">
          <SettingsPanel c={live} reminder={reminder} rhythm={rhythm} onOpen={setRow} className="pb-2" />
        </Sheet>
        {dialogs}
      </>
    );
  }
  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* `initialFocus` on the panel itself. Without it Base UI focuses the
            first focusable child, which here is a settings row -- so the
            dialog opened with "Start the next Edition now" wearing a focus ring
            and a selected tint, i.e. the one control in the list that cannot
            be undone looked armed. */}
        <DialogContent initialFocus={panel} ref={panel} tabIndex={-1}>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <SettingsPanel
            c={live}
            reminder={reminder}
            rhythm={rhythm}
            onOpen={setRow}
            className="max-h-[60dvh]"
          />
        </DialogContent>
      </Dialog>
      {dialogs}
    </>
  );
}
