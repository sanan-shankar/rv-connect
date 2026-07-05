import { Sparkle } from "lucide-react";
import { quoteForToday } from "./greeting-quotes";

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function istHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hourCycle: "h23",
    hour: "numeric",
  }).formatToParts(date)[0]?.value;
  return Number(hour ?? 12);
}

function greetingWord(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * GreetingStrip: the warm fill for the top-right rectangle beside the feed
 * header (the owner's pick from /preview/delight/feed-canvas, section B,
 * treatment 1). A name, today's date, and a short rotating line from J.
 * Krishnamurti -- useful because it actually changes, not decoration that
 * goes stale.
 */
export function GreetingStrip({ name }: { name: string }) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const quote = quoteForToday(now);

  return (
    <div className="card-elevated rounded-2xl border border-border bg-gradient-to-br from-cinnamon/[0.08] via-card to-card px-4 py-3.5">
      <p className="font-heading text-[18px] leading-tight tracking-[-0.01em] text-foreground">
        {greetingWord(istHour(now))}, {firstNameOf(name)}
      </p>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        {dateLabel}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-cinnamon">
        <Sparkle className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
        <span>
          &ldquo;{quote}&rdquo; <span className="text-cinnamon/70">J. Krishnamurti</span>
        </span>
      </p>
    </div>
  );
}
