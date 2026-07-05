"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * NewPostCTA: the header primary action on the feed. Opens/focuses the
 * composer wherever it already sits on the page -- it never moves the
 * viewport. The composer (FeedColumn) exposes itself via the `data-composer`
 * attribute so this stays decoupled from its internals.
 */
export function NewPostCTA() {
  function focusComposer() {
    const el = document.querySelector<HTMLElement>("[data-composer]");
    if (!el) return;
    const field = el.querySelector<HTMLElement>("textarea, [contenteditable], input");
    if (field) {
      field.focus({ preventScroll: true });
    } else {
      // Collapsed pill: click it to expand into the full editor.
      el.querySelector<HTMLElement>("button")?.click();
    }
  }

  return (
    <Button variant="primary" onClick={focusComposer}>
      <Plus className="h-[17px] w-[17px]" />
      New post
    </Button>
  );
}
