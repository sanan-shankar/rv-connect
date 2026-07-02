"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * NewPostCTA: the header primary action on the feed. Brings the composer into
 * view and focuses it. The composer (FeedColumn) exposes itself via the
 * `data-composer` attribute so this stays decoupled from its internals.
 */
export function NewPostCTA() {
  function focusComposer() {
    const el = document.querySelector<HTMLElement>("[data-composer]");
    if (!el) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const field = el.querySelector<HTMLElement>("textarea, [contenteditable], input");
    if (field) {
      field.focus({ preventScroll: true });
    } else {
      // Collapsed pill: click it to expand into the full editor.
      el.querySelector<HTMLElement>("button")?.click();
    }
  }

  return (
    <Button variant="primary" className="h-10 rounded-full px-5" onClick={focusComposer}>
      <Plus className="h-[17px] w-[17px]" />
      New post
    </Button>
  );
}
