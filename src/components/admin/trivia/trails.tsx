import { Ban, Check, CircleHelp, Monitor, Redo2, Smartphone, Tablet, X, type LucideIcon } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Chip } from "@/components/admin/admin-chip";
import { batchLine, cn, formatTimeAgo, metaLine } from "@/lib/utils";
import type { StuckTrail, TypedEvent } from "@/lib/trivia-report";
import { HOW, KIND, Typed } from "./parts";

/* ------------------------------------------------------------------ *
 *  Two lists of what people actually did: the trails of everyone who
 *  tried and never got in, and every answer typed, newest first.
 * ------------------------------------------------------------------ */

const DEVICE = { phone: Smartphone, tablet: Tablet, desktop: Monitor } as const;

/* Vercel sends a two-letter code; the browser's own list names every one of
   them, so there is no table here to keep up to date. A code it does not know
   prints as itself, which is still an answer. */
const regions = new Intl.DisplayNames(["en"], { type: "region" });
function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

function Where({ device, country }: { device: string | null; country: string | null }) {
  const Icon = device && device in DEVICE ? DEVICE[device as keyof typeof DEVICE] : null;
  const place = countryName(country);
  if (!Icon && !place) return null;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      {Icon && <Icon className="size-3.5" strokeWidth={1.75} aria-label={device ?? undefined} />}
      {place}
    </span>
  );
}

/* What each step on a trail looks like. A miss carries the cinnamon of the
   ribbon's missed segment; a move-on, the sky of its moved-on one. */
const STEP: Record<string, { Icon: LucideIcon; tone: string }> = {
  wrong: { Icon: X, tone: "text-cinnamon" },
  limited: { Icon: Ban, tone: "text-destructive" },
  dontknow: { Icon: CircleHelp, tone: "text-sky" },
  skipped: { Icon: Redo2, tone: "text-sky" },
  right: { Icon: Check, tone: "text-leaf" },
};

function StepIcon({ kind }: { kind: string }) {
  const step = STEP[kind];
  if (!step) return null;
  const { Icon, tone } = step;
  return <Icon className={cn("size-3.5 shrink-0 translate-y-[2px]", tone)} strokeWidth={2.25} aria-hidden />;
}

export function Trails({ trails }: { trails: StuckTrail[] }) {
  return (
    <ul className="divide-y divide-border">
      {trails.map((t) => (
        <li key={t.browserId} className="px-3.5 py-3">
          <p className="flex items-center gap-2 text-[12px]">
            <Where device={t.device} country={t.country} />
            <span className="text-muted-foreground">{formatTimeAgo(new Date(t.lastAt))}</span>
          </p>
          {/* No separator between steps: each opens with its own mark, and a
              slash at the head of a wrapped line on a phone read as a stray. */}
          <ol className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] leading-snug">
            {t.steps.map((s, i) => (
              <li key={i} className="flex items-baseline gap-1">
                <StepIcon kind={s.kind} />
                <span className="sr-only">{KIND[s.kind]?.label}:</span>
                {s.answer && s.kind !== "skipped" ? (
                  <Typed>{s.answer}</Typed>
                ) : (
                  <span className="text-muted-foreground">skipped</span>
                )}
                <span className="text-[12px] text-muted-foreground">{s.label}</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

export function TypedLog({
  events,
  showQuestion = true,
}: {
  events: TypedEvent[];
  showQuestion?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {events.map((e) => {
        const kind = KIND[e.kind];
        return (
          <li key={e.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[14px] leading-snug">
                <Typed className="break-words">{e.answer}</Typed>
                {showQuestion && <span className="text-[12px] text-muted-foreground">{e.label}</span>}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                {e.member ? (
                  <span className="inline-flex items-center gap-1.5">
                    <BirdAvatar user={e.member} size={18} />
                    <span className="text-foreground">{e.member.name}</span>
                    {batchLine(e.member, { blankWhenUnknown: true })}
                  </span>
                ) : (
                  <Where device={e.device} country={e.country} />
                )}
                <span>{metaLine(e.how ? HOW[e.how] : null, formatTimeAgo(new Date(e.at)))}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Chip label={kind?.label ?? e.kind} tone={kind?.tone ?? "idle"} />
              {e.acceptedSince && <span className="text-[12px] text-leaf">gets in now</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
