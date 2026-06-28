"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * The single client island on the Support page: the UPI contribution panel.
 * Everything else on /support is static server-rendered copy. This handles the
 * copy-to-clipboard interaction, the suggested-amount chips, and the UPI deep
 * link. Office blue (the `sky` token) is reserved for the one primary action.
 *
 * No payment processor, no amount is ever required. The chips only prefill a
 * suggestion in the user's own UPI app.
 */

const UPI_ID = "rvalumni@upi";
const PAYEE_NAME = "RV Alumni";

const SUGGESTIONS = [
  { label: "Cover a month", amount: 20, note: "About a month of running costs" },
  { label: "Cover a quarter", amount: 60, note: "Three quiet months kept online" },
  { label: "Whatever feels right", amount: null, note: "Any amount is genuinely appreciated" },
] as const;

function buildUpiLink(amount: number | null) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    cu: "INR",
  });
  if (amount) {
    params.set("am", String(amount));
    params.set("tn", "Keeping RV Alumni online");
  }
  return `upi://pay?${params.toString()}`;
}

export function SupportContribute() {
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<number | null>(0);

  const active = selected !== null ? SUGGESTIONS[selected] : null;
  const amount = active?.amount ?? null;

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      toast.success("UPI ID copied. Thank you for keeping us online.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions). The ID stays
      // selectable text below, so the user can copy it by hand.
      toast.error("Could not copy automatically. Please select and copy the ID below.");
    }
  }

  return (
    <div className="grid gap-[var(--space-l)] sm:grid-cols-[auto_minmax(0,1fr)]">
      {/* QR for phone-camera scanning */}
      <div className="flex flex-col items-center gap-[var(--space-s)]">
        <div className="rounded-[var(--radius-lg)] border border-border bg-float p-[var(--space-s)] shadow-[0_1px_2px_rgba(30,28,22,0.05),0_14px_30px_-26px_rgba(30,28,22,0.45)]">
          <Image
            src="/images/support-qr-placeholder.svg"
            alt={`UPI QR code for ${UPI_ID}. Scan it with any UPI app to contribute.`}
            width={176}
            height={176}
            className="h-44 w-44"
            priority={false}
          />
        </div>
        <p className="flex items-center gap-[var(--space-xxs)] text-xs text-muted-foreground">
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Scan with any UPI app
        </p>
      </div>

      {/* UPI id + suggestions + primary action */}
      <div className="flex min-w-0 flex-col gap-[var(--space-m)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            UPI ID
          </p>
          <div className="mt-[var(--space-xs)] flex flex-wrap items-center gap-[var(--space-s)]">
            <code className="select-all rounded-[var(--radius-md)] border border-border bg-mist px-[var(--space-m)] py-[var(--space-s)] font-mono text-base text-foreground">
              {UPI_ID}
            </code>
            <button
              type="button"
              onClick={copyUpi}
              aria-label="Copy UPI ID"
              className={cn(
                "inline-flex h-10 items-center gap-[var(--space-xs)] rounded-[var(--radius-md)] border border-border bg-card px-[var(--space-m)] text-sm font-medium text-foreground",
                "transition-[transform,background-color] duration-150 ease-out",
                "hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-leaf" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            A gentle suggestion
          </p>
          <div className="mt-[var(--space-xs)] flex flex-wrap gap-[var(--space-xs)]">
            {SUGGESTIONS.map((s, i) => {
              const on = selected === i;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "inline-flex items-center gap-[var(--space-xxs)] rounded-full border px-[var(--space-m)] py-[var(--space-s)] text-sm font-medium",
                    "transition-[transform,background-color,border-color,color] duration-150 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
                    on
                      ? "border-sky/40 bg-sky/12 text-sky"
                      : "border-border bg-card text-muted-foreground hover:bg-mist hover:text-foreground",
                  )}
                >
                  {s.label}
                  {s.amount && (
                    <span className="text-xs font-semibold tabular-nums opacity-80">
                      ₹{s.amount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
            {active?.note ?? "Any amount is genuinely appreciated."}
          </p>
        </div>

        {/* The single primary action, in office blue */}
        <a
          href={buildUpiLink(amount)}
          className={cn(
            "group inline-flex h-12 w-full items-center justify-center gap-[var(--space-s)] rounded-full bg-sky px-[var(--space-l)] text-[15px] font-semibold text-white sm:w-auto",
            "shadow-[0_6px_16px_-12px_var(--color-sky)]",
            "transition-[transform,filter] duration-150 ease-out",
            "hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.98]",
          )}
        >
          Open my UPI app
          {amount && <span className="tabular-nums opacity-90">· ₹{amount}</span>}
        </a>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The button opens your UPI app with the ID filled in. On a laptop, scan the
          code or copy the ID into your phone. Card and international options are
          coming for those abroad.
        </p>
      </div>
    </div>
  );
}
