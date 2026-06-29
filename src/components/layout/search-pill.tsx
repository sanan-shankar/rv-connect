"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance that replaces the old always-on
 * search + filter row. It rests as a wide pill reading "Search the valley...",
 * and expands into a live input on click. Submitting routes to the directory
 * search; the feed can later subscribe to the same query.
 */
export function SearchPill() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Collapse when clicking away with no query.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && !value) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, value]);

  function submit() {
    const q = value.trim();
    if (!q) return;
    router.push(`/directory?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={wrapRef} className="relative">
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex h-10 w-[min(19rem,53vw)] items-center gap-2.5 rounded-full border border-border bg-card pl-4 pr-2 shadow-[0_1px_2px_rgba(30,28,22,0.04)] focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40"
        >
          <MagnifyingGlass
            weight="regular"
            size={16}
            className="pointer-events-none shrink-0 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !value) setOpen(false);
            }}
            placeholder="Search the valley..."
            aria-label="Search the valley"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/75"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search the valley"
          className={cn(
            "flex h-10 w-[min(19rem,53vw)] items-center gap-2.5 rounded-full border border-border bg-card pl-4 pr-4 text-left text-[13.5px] text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)]",
            "transition-transform duration-150 ease-out hover:text-foreground active:scale-[0.99] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          )}
        >
          <MagnifyingGlass weight="regular" size={16} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">Search the valley...</span>
        </button>
      )}
    </div>
  );
}
