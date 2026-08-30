"use client";

/* ------------------------------------------------------------------ *
 *  CHANGING YOUR MIND ABOUT A PHOTOGRAPH THAT IS ALREADY HERE.
 *
 *  Until now the Collection had exactly one correction and it was delete
 *  and upload it again -- which, for a scanned negative, means losing the
 *  file, the hearts and the permalink in order to fix a typo. The owner,
 *  2026-08-30: "instead of delete photo button, have an edit icon. there
 *  let it pull up a dialog similar to the contribute where they can
 *  retag, recaption, and add year all that stuff."
 *
 *  SO IT ASKS THE SAME THREE QUESTIONS, out of the same component the
 *  contribute room asks them with (./photo-questions.tsx). That is the
 *  whole design: a seventh bucket, a reworded hint or a change to what
 *  the date box understands has to reach both rooms, and the only
 *  reliable way to make that true is for there to be one form.
 *
 *  IT IS THE PLAIN DIALOG MATERIAL, not the contribute pop-up's glass.
 *  That room is wide because it holds a wall of files climbing to a
 *  bucket; this is one row already in the archive, so it is `max-w-sm`
 *  with the standard title and the standard footer, per DESIGN-SYSTEM
 *  "Dialogs: one material". The six tiles get 112px each at that width,
 *  which is what they get in the contribute panel too.
 *
 *  NO THUMBNAIL IN HERE. This opens over the viewer, so the photograph is
 *  on screen behind it at full bleed; a second copy of the picture you
 *  are looking at would only push the answers below the fold on a phone.
 *
 *  THE DELETE LIVES HERE NOW, because the trash icon it replaced sat
 *  beside Download in the viewer's top row, where a mis-press was one
 *  pixel away. It is the footer's leading item, separated from Save by
 *  the width of the dialog, and it still opens the same confirmation it
 *  always did -- a member's own photograph takes the plain confirm,
 *  somebody else's takes the moderator's note. The caller owns both.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callAction } from "@/lib/call-action";
import { photoDate } from "@/lib/collection";
import { valleyYear } from "@/lib/utils";
import { editPhoto, type PhotoData } from "@/app/(main)/collection/actions";
import { answersFor, PhotoQuestions, type PhotoAnswers } from "./photo-questions";

/** What a save hands back for the tile and the open viewer to adopt.
 *  Derived on the SERVER, through the same helpers every river row goes
 *  through, so nothing here recomputes the date rule from what was typed. */
export type PhotoPatch = Pick<
  PhotoData,
  | "caption"
  | "subject"
  | "era"
  | "photoYear"
  | "photoMonth"
  | "datePrecision"
  | "takenLabel"
  | "takenShort"
>;

export function EditPhotoDialog({
  photo,
  open,
  onClose,
  onSaved,
  onDelete,
}: {
  photo: PhotoData;
  open: boolean;
  onClose: () => void;
  onSaved: (patch: PhotoPatch) => void;
  /** Hand the taking-down back to the caller, which already owns both
   *  confirmations and the strips the photograph has to leave. */
  onDelete: () => void;
}) {
  /* Seeded once, from the row. `answersFor` runs the three date columns back
     through `typedDate`, which is pinned as the exact inverse of what a save
     writes -- so opening a 1970s photograph and pressing Save having touched
     nothing files it in the 1970s, not in nothing. */
  const [answers, setAnswers] = useState<PhotoAnswers>(() => answersFor(photo));
  const [saving, setSaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  /* Nothing changed, nothing to write. A Save that spends an action and a
     revalidate storing the values already in the row is a round trip for a
     no-op, and a disabled button says "this is already what it says" without
     a line of copy saying it. */
  const dirty = JSON.stringify(answers) !== JSON.stringify(answersFor(photo));

  function answer(patch: Partial<PhotoAnswers>) {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await callAction(() =>
        editPhoto({
          id: photo.id,
          caption: answers.caption.trim(),
          buckets: answers.buckets,
          /* The one date rule, out of lib/collection.ts, exactly as both
             contribute paths encode it: three digits is a decade, four is a
             year, and a month only ever beside a real one. */
          ...photoDate(answers, valleyYear()),
        })
      );
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (res.patch) onSaved(res.patch);
      toast.success("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      {/* FOCUS LANDS ON THE PANEL, NOT ON THE FIRST TILE. Left to itself the
          dialog focused "People", which drew a canopy focus ring around an
          UNSELECTED bucket beside the one that is selected -- a photograph
          filed under Campus looked filed under both -- and put a toggle under
          the Enter key of somebody who had only just opened the box. The
          design system already asks for this on the destructive confirm
          ("nothing auto-focused so Enter cannot destroy"); a six-way toggle
          deserves it for the same reason. Tab still walks the tiles first. */}
      <DialogContent
        ref={panel}
        initialFocus={panel}
        tabIndex={-1}
        /* The tiles and the grouped card can outgrow a short laptop window, so
           the panel scrolls rather than reaching past the viewport. */
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader className="pr-8">
          {/* A statement title naming the object, and no description under it
              -- Carbon's own test, verbatim: title "Edit object", purpose to
              edit an object, so a second line would only restate it. */}
          <DialogTitle>Edit photograph</DialogTitle>
        </DialogHeader>

        <PhotoQuestions idPrefix="edit-photo" value={answers} onAnswer={answer} />

        <DialogFooter>
          {/* The destructive one leads and the gap is the warning, which is
              the rule this design system already applies to a menu's last
              item. `sm:mr-auto` is the whole of the deviation: on a phone the
              footer's own column-reverse takes over and the stack reads Save,
              Cancel, Remove -- the primary most prominent, the destructive
              quietest and last. Pulling Remove to the top of that stack was
              tried and reverted: it puts a red pill above the green one, and
              the mis-tap it was guarding against costs an extra press of a
              confirmation, not a photograph. */}
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={saving}
            className="sm:mr-auto"
          >
            {photo.isOwn ? "Delete" : "Remove"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
