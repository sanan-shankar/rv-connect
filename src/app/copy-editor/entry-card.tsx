"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { InventoryEntry } from "./groups";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Understated color coding so a scan down the page tells you what kind of
// string you're looking at without reading the chip.
const KIND_STYLES: Record<string, string> = {
  heading: "bg-secondary text-secondary-foreground",
  body: "bg-muted text-muted-foreground",
  button: "bg-canopy/10 text-canopy",
  label: "bg-muted text-muted-foreground",
  placeholder: "bg-muted text-muted-foreground",
  tooltip: "bg-sky/10 text-sky",
  helper: "bg-muted text-muted-foreground",
  "empty-state": "bg-muted text-muted-foreground",
  validation: "bg-destructive/10 text-destructive",
  error: "bg-destructive/10 text-destructive",
  toast: "bg-cinnamon/10 text-cinnamon",
  notification: "bg-cinnamon/10 text-cinnamon",
  metadata: "bg-muted text-muted-foreground",
};

async function postUpdate(id: string, replacement: string | null, notes: string | null) {
  return fetch("/api/copy-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, replacement, notes }),
    keepalive: true,
  });
}

export function EntryCard({
  entry,
  onEntryUpdate,
  onSavingChange,
}: {
  entry: InventoryEntry;
  onEntryUpdate: (id: string, patch: { replacement: string | null; notes: string | null }) => void;
  onSavingChange: (id: string, saving: boolean) => void;
}) {
  const [replacementDraft, setReplacementDraft] = useState(entry.replacement ?? "");
  const [notesDraft, setNotesDraft] = useState(entry.notes ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Refs so the debounce timer and the unmount-flush always see the latest
  // typed value, not whatever was current when the timer was scheduled.
  const replacementRef = useRef(replacementDraft);
  const notesRef = useRef(notesDraft);
  replacementRef.current = replacementDraft;
  notesRef.current = notesDraft;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    setStatus("saving");
    onSavingChange(entry.id, true);
    const replacement = replacementRef.current.trim() === "" ? null : replacementRef.current;
    const notes = notesRef.current.trim() === "" ? null : notesRef.current;
    try {
      const res = await postUpdate(entry.id, replacement, notes);
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      onSavingChange(entry.id, false);
    }
  }

  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void save();
    }, 600);
  }

  // If the entry unmounts (group switch, search) with a pending debounce,
  // flush it immediately rather than silently dropping the edit.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        const replacement = replacementRef.current.trim() === "" ? null : replacementRef.current;
        const notes = notesRef.current.trim() === "" ? null : notesRef.current;
        void postUpdate(entry.id, replacement, notes);
        onSavingChange(entry.id, false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, [entry.id]);

  function handleReplacementChange(value: string) {
    setReplacementDraft(value);
    onEntryUpdate(entry.id, {
      replacement: value.trim() === "" ? null : value,
      notes: notesRef.current.trim() === "" ? null : notesRef.current,
    });
    scheduleSave();
  }

  function handleNotesChange(value: string) {
    setNotesDraft(value);
    onEntryUpdate(entry.id, {
      replacement: replacementRef.current.trim() === "" ? null : replacementRef.current,
      notes: value.trim() === "" ? null : value,
    });
    scheduleSave();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-[var(--space-l)] shadow-[0_8px_20px_-16px_rgba(35,36,30,0.4)]">
      <div className="flex flex-wrap items-center gap-[var(--space-xs)]">
        <Badge className={cn("capitalize", KIND_STYLES[entry.kind] ?? "bg-muted text-muted-foreground")}>
          {entry.kind}
        </Badge>
        <span className="text-xs text-muted-foreground">{entry.situation}</span>
      </div>

      <p className="mt-[var(--space-xxs)] font-mono text-[11px] text-muted-foreground/70">
        {entry.file}:{entry.line}
      </p>

      <blockquote className="mt-[var(--space-s)] rounded-md border-l-2 border-cinnamon/50 bg-mist px-[var(--space-m)] py-[var(--space-s)] text-[0.95rem] leading-[1.6] whitespace-pre-wrap text-foreground">
        {entry.text}
      </blockquote>

      <div className="mt-[var(--space-m)] grid gap-[var(--space-s)] sm:grid-cols-[2fr_1fr]">
        <div>
          <Label htmlFor={`rewrite-${entry.id}`} className="mb-[var(--space-xxs)] text-muted-foreground">
            Rewrite (blank keeps it as is)
          </Label>
          <Textarea
            id={`rewrite-${entry.id}`}
            className="min-h-11 field-sizing-content"
            placeholder="Keep as is"
            value={replacementDraft}
            onChange={(e) => handleReplacementChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`notes-${entry.id}`} className="mb-[var(--space-xxs)] text-muted-foreground">
            Notes
          </Label>
          <Input
            id={`notes-${entry.id}`}
            placeholder="Optional"
            value={notesDraft}
            onChange={(e) => handleNotesChange(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-[var(--space-xs)] flex h-4 items-center justify-end gap-1 text-xs">
        <AnimatePresence mode="wait">
          {status === "saving" && (
            <motion.span
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.snappy}
              className="flex items-center gap-1 text-muted-foreground"
            >
              <Loader2 className="size-3 animate-spin" /> Saving
            </motion.span>
          )}
          {status === "saved" && (
            <motion.span
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.snappy}
              className="flex items-center gap-1 text-canopy"
            >
              <Check className="size-3" /> Saved
            </motion.span>
          )}
          {status === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.snappy}
              className="flex items-center gap-1 text-destructive"
            >
              <TriangleAlert className="size-3" /> Couldn&apos;t save, try typing again
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
