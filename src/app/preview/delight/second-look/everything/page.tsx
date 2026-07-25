"use client";

import { useMemo, useState } from "react";
import { LabShell, Rule, Tell } from "../_kit";
import { FINDINGS, SURFACES, type Severity } from "./_findings";
import { cn } from "@/lib/utils";

const SEV: Record<Severity, { label: string; dot: string; chip: string }> = {
  "looks-broken": {
    label: "Actually broken",
    dot: "bg-heart",
    chip: "border-heart/40 bg-heart/10 text-heart",
  },
  "looks-fine-but-thoughtless": {
    label: "Fine, but never decided",
    dot: "bg-cinnamon",
    chip: "border-cinnamon/40 bg-cinnamon/10 text-cinnamon",
  },
  "genuinely-good": {
    label: "Protected",
    dot: "bg-leaf",
    chip: "border-leaf/40 bg-leaf/12 text-leaf",
  },
};

const SEV_ORDER: Severity[] = ["looks-broken", "looks-fine-but-thoughtless", "genuinely-good"];

/* The audit text quotes classNames and file paths in backticks. Rendering them
   as literal backticks reads like an unparsed email, so split on them and set
   the odd segments as inline code. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-mist px-1 py-0.5 text-[0.86em] text-foreground/75">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function EverythingRoom() {
  const [surface, setSurface] = useState<string | null>(null);
  const [sev, setSev] = useState<Severity | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    const bySev = Object.fromEntries(SEV_ORDER.map((s) => [s, 0])) as Record<Severity, number>;
    const bySurface: Record<string, number> = {};
    for (const f of FINDINGS) {
      bySev[f.severity]++;
      bySurface[f.surface] = (bySurface[f.surface] ?? 0) + 1;
    }
    return { bySev, bySurface };
  }, []);

  const shown = FINDINGS.filter(
    (f) => (!surface || f.surface === surface) && (!sev || f.severity === sev),
  );

  const grouped = SURFACES.map((s) => ({
    ...s,
    items: shown.filter((f) => f.surface === s.key),
  })).filter((g) => g.items.length > 0);

  return (
    <LabShell
      title="Everything else"
      lede="One read-through of every surface in the product, by nine readers who were told to hunt complacency rather than bugs. 76 findings. This is the map; the other rooms are the worked examples."
    >
      <Tell
        label="How to read this"
        stats={[
          { n: String(counts.bySev["looks-broken"]), of: "actually broken, not a taste call" },
          {
            n: String(counts.bySev["looks-fine-but-thoughtless"]),
            of: "working, inoffensive, and never decided. This is the brief.",
            tone: "plain" as const,
          },
          {
            n: String(counts.bySev["genuinely-good"]),
            of: "genuinely well made, listed so nobody undoes them by accident",
            tone: "good" as const,
          },
        ]}
      >
        <p>
          Each finding names the thing, quotes the code, says what it costs the reader, and proposes
          one alternative. They are not all worth doing. Several contradict each other. The point is
          that none of them was <b>visible</b> before: every one of these surfaces looked fine.
        </p>
        <p className="text-[13.5px] text-muted-foreground">
          Honesty note on sourcing: the nine findings in <b>Global chrome</b> were re-verified by
          hand, every contrast ratio recomputed and every count re-grepped, as were the four in
          Support. The rest are as reported by the reader that found them, with the evidence quote
          attached so you can check any one in a few seconds. Treat an unverified claim as a lead, not
          a fact. Catch-ups in particular was being rewritten on disk while it was read, so some of it
          may already be stale.
        </p>
      </Tell>

      <Rule>Filter</Rule>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Kind
          </span>
          <FilterChip active={sev === null} onClick={() => setSev(null)}>
            All {FINDINGS.length}
          </FilterChip>
          {SEV_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={sev === s}
              tone={SEV[s].chip}
              onClick={() => setSev(sev === s ? null : s)}
            >
              <span
                className={cn("mr-1.5 inline-block h-2 w-2 rounded-full align-middle", SEV[s].dot)}
              />
              {SEV[s].label} {counts.bySev[s]}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Surface
          </span>
          <FilterChip active={surface === null} onClick={() => setSurface(null)}>
            Everything
          </FilterChip>
          {SURFACES.map((s) => (
            <FilterChip
              key={s.key}
              active={surface === s.key}
              onClick={() => setSurface(surface === s.key ? null : s.key)}
            >
              {s.label} {counts.bySurface[s.key]}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="mt-6 text-[13px] text-muted-foreground">
        Showing {shown.length} of {FINDINGS.length}.
      </p>

      {grouped.map((g) => (
        <section key={g.key}>
          <Rule>{g.label}</Rule>

          <div className="divide-y divide-border border-y border-border">
            {g.items.map((f) => {
              const isOpen = open[f.id];
              return (
                <article key={f.id} className="py-5">
                  <div className="flex gap-4">
                    <span
                      className={cn(
                        "mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full",
                        SEV[f.severity].dot,
                      )}
                      title={SEV[f.severity].label}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-[16.5px] font-bold leading-snug tracking-tight">
                        {f.title}
                      </h3>

                      <div className="mt-2 grid gap-x-10 gap-y-2 lg:grid-cols-2">
                        <p className="text-[14px] leading-[1.62] text-muted-foreground">
                          <Prose text={f.why} />
                        </p>
                        {f.idea && (
                          <p className="text-[14px] leading-[1.62]">
                            <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-leaf">
                              Instead
                            </span>
                            <Prose text={f.idea} />
                          </p>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setOpen((o) => ({ ...o, [f.id]: !o[f.id] }))}
                          aria-expanded={isOpen}
                          className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-mist hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
                        >
                          {isOpen ? "Hide evidence" : "Evidence"}
                        </button>
                        {f.verified ? (
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-leaf">
                            Re-verified by hand
                          </span>
                        ) : (
                          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            Reported, not re-verified
                          </span>
                        )}
                      </div>

                      {isOpen && (
                        <p className="mt-2.5 rounded-xl bg-background px-4 py-3 text-[12.5px] leading-[1.6] text-muted-foreground">
                          <Prose text={f.evidence} />
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {(!sev || sev === "genuinely-good") && (
            <div className="mt-5 flex gap-4 rounded-[16px] border border-leaf/30 bg-leaf/[0.06] p-5">
              <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-leaf" />
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-leaf">
                  Best thing on this surface, do not regress it
                </div>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-muted-foreground">
                  <Prose text={g.best} />
                </p>
              </div>
            </div>
          )}
        </section>
      ))}
    </LabShell>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
        active
          ? "border-[#235C49] bg-[#235C49] text-white"
          : (tone ?? "border-border bg-card text-muted-foreground hover:bg-mist hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}
