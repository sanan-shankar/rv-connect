"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";

/**
 * The single client island on the Support page: the UPI contribution panel.
 * Everything else on /support is static server-rendered copy. This handles the
 * suggested-amount chips, the matching QR, and the UPI deep link. Office blue
 * (the `sky` token) is reserved for the one primary action.
 *
 * One-time amounts only, never monthly. No payment processor, no amount is ever
 * required. The chips prefill a suggestion; the payer can always change it.
 *
 * The QR codes are pre-generated per amount by scripts/gen-support-qr.mjs and
 * decode-verified there. Selecting a chip swaps to the code that pre-fills that
 * amount when scanned; "Other" shows the amount-less code. The displayed UPI ID
 * is intentionally omitted: the real handle carries the owner's name, so we keep
 * it off the page and route people through the QR or the deep-link button.
 * Keep buildUpiLink() in sync with the UPI string the generator encodes.
 */

const UPI_ID = "sanan.v.shankar@okhdfcbank";
const PAYEE_NAME = "Rishi Valley";

const SUGGESTIONS = [
  { label: "₹500", amount: 500 },
  { label: "₹1,000", amount: 1000 },
  { label: "₹2,000", amount: 2000 },
  { label: "₹5,000", amount: 5000 },
  { label: "Other", amount: null },
] as const;

// Default to the ₹1,000 chip.
const DEFAULT_INDEX = 1;

function buildUpiLink(amount: number | null) {
  const params = new URLSearchParams({ pa: UPI_ID, pn: PAYEE_NAME });
  if (amount) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}

function qrSrc(amount: number | null) {
  return amount ? `/images/support-qr-${amount}.svg` : "/images/support-qr.svg";
}

export function SupportContribute() {
  const [selected, setSelected] = useState(DEFAULT_INDEX);
  const { amount, label } = SUGGESTIONS[selected];

  return (
    <div className="grid gap-[var(--space-l)] sm:grid-cols-[auto_minmax(0,1fr)]">
      {/* QR for phone-camera scanning, swapped to match the selected amount */}
      <div className="flex flex-col items-center gap-[var(--space-s)]">
        <div className="rounded-[var(--radius-lg)] border border-border bg-float p-[var(--space-s)] shadow-[0_1px_2px_rgba(30,28,22,0.05),0_14px_30px_-26px_rgba(30,28,22,0.45)]">
          {/* Crossfade between amount QRs: the new code dissolves up from a hair
              smaller as the old settles back, no bounce (a QR should never
              wobble). Both frames overlap absolutely inside this fixed box. */}
          <div className="relative h-44 w-44">
            <AnimatePresence initial={false}>
              <motion.div
                key={amount ?? "other"}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.32, ease: EASE_OUT_SMOOTH }}
              >
                <Image
                  src={qrSrc(amount)}
                  alt={
                    amount
                      ? `UPI QR code for Rishi Valley, pre-filled with ${label}. Scan it with any UPI app to contribute.`
                      : "UPI QR code for Rishi Valley. Scan it with any UPI app and enter any amount to contribute."
                  }
                  width={176}
                  height={176}
                  className="h-44 w-44"
                  priority={false}
                  unoptimized
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="flex items-center gap-[var(--space-xxs)] text-xs text-muted-foreground">
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          {amount ? `Scan to give ${label}` : "Scan and enter any amount"}
        </p>
      </div>

      {/* Suggestions + primary action */}
      <div className="flex min-w-0 flex-col gap-[var(--space-m)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            Pick an amount
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
                    "inline-flex items-center gap-[var(--space-xxs)] rounded-full border px-[var(--space-m)] py-[var(--space-s)] text-sm font-semibold tabular-nums",
                    "transition-[transform,background-color,border-color,color] duration-150 ease-out",
                    "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    // Selected keeps its sky wash (semantic). The idle chip
                    // hovered from bg-card to bg-mist, one rung and ~2 dL*,
                    // so the neutral half is the state layer now.
                    on
                      ? "border-sky/40 bg-sky/12 text-sky"
                      : "border-border bg-card text-muted-foreground state-layer hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
            A one-time thank-you, however much feels right. Never a subscription.
          </p>
        </div>

        {/* The single primary action, in office blue */}
        <a
          href={buildUpiLink(amount)}
          className={cn(
            "group inline-flex h-12 w-full items-center justify-center gap-[var(--space-s)] rounded-full bg-sky px-[var(--space-l)] text-[15px] font-semibold text-white sm:w-auto",
            "shadow-[0_6px_16px_-12px_var(--color-sky)]",
            "transition-[transform,filter] duration-150 ease-out",
            "hover:brightness-[1.06] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky",
          )}
        >
          Open my UPI app
          {amount && <span className="tabular-nums opacity-90">· {label}</span>}
        </a>
        <p className="text-xs leading-relaxed text-muted-foreground">
          On Android the button opens your UPI app with the amount filled in. On
          iPhone or a laptop it may not, so scan the code above with your phone
          instead. Card and international options are coming for those abroad.
        </p>
      </div>
    </div>
  );
}
