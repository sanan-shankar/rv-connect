"use client";

/* ------------------------------------------------------------------ *
 *  "Reaching you", which stands where the tab strip stands.
 *
 *  Owner, 2026-08-07: "below that, right now it shows All posts, Letters,
 *  Saved. We can remove all of that, fade it out and put this stuff that
 *  isn't above: emails, phone numbers, links." And: "make sure the
 *  reaching you UI doesn't look out of place with the rest, both what's
 *  above it and what it was replacing."
 *
 *  So it borrows from both sides. From the strip it replaces: the same
 *  card surface, the same two-layer shadow, the same top margin, the same
 *  full width. From the sheet above it: canopy caps for the label, the
 *  15px value rung, and the same pen rule under every typeable value.
 *  What it does NOT borrow is the sliding thumb, because there is nothing
 *  here to select between.
 *
 *  One list, not eight fields. The old settings page kept a permanently
 *  visible, permanently empty row for Instagram, LinkedIn and Facebook
 *  whether or not you had them. Here nothing exists until you ask for it,
 *  and the icon carries the kind so no row needs a written label.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { SPRINGS } from "@/components/common/motion";
import {
  buildRows,
  newId,
  rowsToPayload,
  type ContactKind,
  type ContactRow,
} from "@/lib/contact-rows";
import { PenValue } from "@/components/profile/pen";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";

const ICON: Record<ContactKind, typeof Mail> = {
  email: Mail,
  phone: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  link: Globe,
};

const PLACEHOLDER: Record<ContactKind, string> = {
  email: "you@example.com",
  phone: "+91 ...",
  instagram: "@handle",
  linkedin: "linkedin.com/in/...",
  facebook: "facebook.com/...",
  link: "https://...",
};

const KIND_LABEL: Record<ContactKind, string> = {
  email: "Email",
  phone: "Phone",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  link: "Something else",
};

/* Only one of each of these can exist, so the add menu hides the ones you
   already have. Phones and links are lists and never run out. */
const SINGLETON: ContactKind[] = ["email", "instagram", "linkedin", "facebook"];
const ADDABLE: ContactKind[] = ["phone", "instagram", "linkedin", "facebook", "email", "link"];

/* Re-exported so the profile keeps importing its editor's vocabulary from the
   editor, while the round trip itself lives in a module a test can reach. */
export { buildRows, rowsToPayload };
export type { ContactKind, ContactRow };

export function ContactsEditor({
  rows,
  onChange,
  onCommit,
}: {
  rows: ContactRow[];
  onChange: (next: ContactRow[]) => void;
  /**
   * Save. Pass the rows to save when the caller already knows them.
   *
   * The remove button has to: it calls `onChange` and `onCommit` in the same
   * handler, and `onChange` is a plain setState, so the parent's `commitContacts`
   * ran against the row array captured in the SAME render -- the one that still
   * had the removed phone number in it. The UI dropped the row and the server
   * saved the pre-removal list, so the "removed" number was back on the Get in
   * touch sheet after a reload (bug audit B-049). commitPlaces and commitHouses
   * already took their `next` explicitly for exactly this reason.
   */
  onCommit: (next?: ContactRow[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const taken = useMemo(() => new Set(rows.map((r) => r.kind)), [rows]);
  const options = ADDABLE.filter((k) => !(SINGLETON.includes(k) && taken.has(k)));

  function patch(id: string, next: Partial<ContactRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  return (
    <div
      // The strip's own surface and shadow, so the block that takes its place
      // reads as the same material rather than as something new arriving.
      className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]"
      style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)" }}
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">Reaching you</p>

      {/* space-y-3, not the 2px it was. Every row carries a dotted rule 4px
          under its text, so at 2px the rule under the email was practically
          touching the phone icon below it (owner, 2026-08-07: "email and phone
          are too close together"). 12px leaves the rule 8px of air and lets
          the list read as separate facts rather than a block. */}
      <div className="mt-[var(--space-s)] space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            const Icon = ICON[row.kind];
            return (
              <motion.div
                key={row.id}
                layout="position"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRINGS.gentle}
                className="group/row flex items-center gap-2.5"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                  aria-label={KIND_LABEL[row.kind]}
                />
                {row.kind === "link" && (
                  <PenValue
                    value={row.label ?? ""}
                    onChange={(v) => patch(row.id, { label: v })}
                    onCommit={onCommit}
                    editing
                    placeholder="what it is"
                    ariaLabel="What this link is"
                    delay={0.02 * i}
                    className="shrink-0 text-[15px] font-semibold"
                  />
                )}
                <PenValue
                  value={row.value}
                  onChange={(v) => patch(row.id, { value: v })}
                  onCommit={onCommit}
                  editing
                  placeholder={PLACEHOLDER[row.kind]}
                  ariaLabel={KIND_LABEL[row.kind]}
                  delay={0.02 * i}
                  // Hugs its text, like every other pen on the sheet. Stretched
                  // to flex-1 it dragged a 700px dotted rule out from under a
                  // 200px email address, which reads as a line on a form rather
                  // than as a value you can change.
                  className="min-w-0 text-[15px]"
                  inputMode={row.kind === "phone" ? "tel" : row.kind === "email" ? "email" : undefined}
                />
                {/* The slot is always reserved and only painted on hover or
                    focus, so a row never changes width when you point at it. */}
                <button
                  type="button"
                  aria-label={`Remove this ${KIND_LABEL[row.kind].toLowerCase()}`}
                  onClick={() => {
                    const next = rows.filter((r) => r.id !== row.id);
                    onChange(next);
                    onCommit(next);
                  }}
                  // ml-auto, so the removes line up on one right edge even
                  // though the values they belong to are all different lengths.
                  className="state-layer ml-auto shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 outline-none transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-hover/row:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {options.length > 0 && (
          <div className="pt-3">
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger
                type="button"
                className="state-layer inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-[12.5px] font-semibold text-muted-foreground outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {rows.length === 0 ? "Add a way to reach you" : "Add another"}
              </PopoverTrigger>
              <PopoverPortal>
                <PopoverPositioner sideOffset={6} align="start" side="bottom">
                  <PopoverContent className="w-[200px] p-1.5">
                    {options.map((k) => {
                      const Icon = ICON[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            onChange([
                              ...rows,
                              { id: newId(), kind: k, value: "", ...(k === "link" ? { label: "" } : {}) },
                            ]);
                            setAddOpen(false);
                          }}
                          className="state-layer flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-left text-[13.5px] font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                          {KIND_LABEL[k]}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </PopoverPositioner>
              </PopoverPortal>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}
