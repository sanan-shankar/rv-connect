"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, IndianRupee, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { startContribution, confirmContribution } from "@/app/(main)/support/actions";

/**
 * The single client island on the Support page: the contribution panel.
 * Everything else on /support is static server-rendered copy.
 *
 * This replaced a static UPI QR and an `upi://pay` deep link (2026-08-05). The
 * QR was free to run but only worked from an Indian phone with a UPI app --
 * which is exactly the wrong constraint for a school whose alumni are spread
 * across a dozen countries. Razorpay's checkout still offers UPI, and adds
 * cards, netbanking and wallets on any device, in exchange for a processor's
 * cut. Office blue (the `sky` token) stays the one primary action.
 *
 * One-time amounts only, never a subscription. The chips are a suggestion; the
 * payer can always type their own. The amount that reaches Razorpay is the one
 * the SERVER validated, not the one this component sent -- see
 * src/app/(main)/support/actions.ts.
 */

const SUGGESTIONS = [
  { label: "₹500", amount: 500 },
  { label: "₹1,000", amount: 1000 },
  { label: "₹2,000", amount: 2000 },
  { label: "₹5,000", amount: 5000 },
  { label: "Other", amount: null },
] as const;

// Default to the ₹1,000 chip.
const DEFAULT_INDEX = 1;

// Mirrors MIN_RUPEES in the Support actions. Duplicated deliberately: this copy
// exists to say "₹100 minimum" before the payer submits, the server's copy is
// the one that decides. If they ever disagree, the server wins and the payer
// sees its message.
const MIN_RUPEES = 100;

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/* The shape of Razorpay's global, narrowed to what we actually call. Written
   by hand rather than pulled from a types package so nothing beyond the
   checkout script itself enters the dependency tree. */
type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (e: { error?: { description?: string } }) => void) => void;
};
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

/* Injected on first interaction with this panel, not on page load: a visitor
   who only reads the cost breakdown should not pay for a third-party script,
   and Razorpay should not see them at all. Memoised, so hovering the button
   and then clicking it loads one script, once. */
let checkoutPromise: Promise<void> | null = null;
function loadCheckout() {
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${CHECKOUT_SRC}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = CHECKOUT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      // Cleared so a later attempt can retry rather than inherit the rejection
      // forever (an ad blocker may be off by the time they try again).
      checkoutPromise = null;
      reject(new Error("checkout script failed to load"));
    };
    document.head.appendChild(el);
  });
  return checkoutPromise;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function SupportContribute() {
  const [selected, setSelected] = useState<number>(DEFAULT_INDEX);
  const [custom, setCustom] = useState("");
  // "working" covers everything from the click to the modal appearing, and
  // again from the modal closing to the server confirming. Both are moments
  // where a second click would open a second order.
  const [working, setWorking] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const customRef = useRef<HTMLInputElement>(null);

  const isOther = SUGGESTIONS[selected].amount === null;
  const amount = isOther ? Number(custom) : SUGGESTIONS[selected].amount;
  const amountValid = Number.isInteger(amount) && (amount as number) >= MIN_RUPEES;

  const warm = useCallback(() => {
    loadCheckout().catch(() => {});
  }, []);

  async function pay() {
    if (!amountValid || working) return;
    setWorking(true);

    try {
      await loadCheckout();
    } catch {
      setWorking(false);
      toast.error("The payment window could not load. An ad blocker may be in the way.");
      return;
    }

    const started = await startContribution(amount as number);
    if ("error" in started) {
      setWorking(false);
      toast.error(started.error);
      return;
    }

    const Razorpay = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
    if (!Razorpay) {
      setWorking(false);
      toast.error("The payment window could not load. Please try again.");
      return;
    }

    const rzp = new Razorpay({
      key: started.keyId,
      amount: started.amount,
      currency: started.currency,
      order_id: started.orderId,
      name: "Rishi Valley",
      description: "A one-time contribution",
      // The mountain mark, so the most trust-sensitive moment on the site does
      // not show Razorpay's fallback initial. Absolute by construction: their
      // iframe resolves this itself and will not accept a relative path. PNG
      // rather than SVG (their checkout does not render SVG reliably), and the
      // light variant because the logo sits on a white tile inside the modal,
      // not on the green panel beside it.
      //
      // Confirmed working in production (2026-08-05). It shows the fallback
      // "R" on localhost, which is not a bug in this line: Razorpay cannot
      // resolve a localhost URL, so only a real domain renders it.
      //
      // Razorpay draws it on a white tile, which is why the light mark is
      // right; do not "fix" that frame away with theme.image_padding: false,
      // because a green mark on the green panel disappears.
      //
      // The illustration below it in the modal is NOT settable from here. It
      // is a preset chosen under Dashboard > Account Settings > Checkout
      // Styling, which is also where the logo, fonts and border style live.
      image: `${window.location.origin}/images/brand/rishi-valley-mountain-mark-light-200.png`,
      prefill: { name: started.name, email: started.email, contact: started.contact },
      theme: { color: "#235C49" },
      handler: async (res: RazorpaySuccess) => {
        const confirmed = await confirmContribution(res);
        setWorking(false);
        if ("error" in confirmed) {
          toast.error(confirmed.error);
          return;
        }
        setPaidAmount(amount as number);
      },
      modal: {
        // Fires when the payer closes the modal without paying. Nothing to
        // undo: the row stays "created", which is what an abandoned checkout
        // is. Silent on purpose -- they closed it, they know.
        ondismiss: () => setWorking(false),
      },
    });

    rzp.on("payment.failed", (e) => {
      setWorking(false);
      toast.error(e.error?.description ?? "That payment did not go through. Nothing was charged.");
    });

    rzp.open();
  }

  if (paidAmount !== null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: EASE_OUT_SMOOTH }}
        className="flex flex-col items-start gap-[var(--space-s)]"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-canopy/10 text-canopy" aria-hidden>
          <Check className="h-6 w-6" />
        </span>
        <p className="font-heading text-xl font-bold tracking-tight text-foreground">
          Thank you, truly.
        </p>
        <p className="leading-relaxed text-muted-foreground" role="status">
          {inr(paidAmount)} received. A receipt is on its way to your email from
          Razorpay. We will be in touch about picking your bird.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-m)]">
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
                onPointerEnter={warm}
                onClick={() => {
                  setSelected(i);
                  if (s.amount === null) requestAnimationFrame(() => customRef.current?.focus());
                }}
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

        {/* The amount field only exists once "Other" is chosen: an always-on
            input beside four chips reads as a fifth, contradictory ask. */}
        <AnimatePresence initial={false}>
          {isOther && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
              className="mt-[var(--space-s)]"
            >
              <label htmlFor="contribute-amount" className="sr-only">
                Amount in rupees
              </label>
              <div className="relative w-full max-w-[13rem]">
                <IndianRupee
                  className="pointer-events-none absolute left-[var(--space-s)] top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={customRef}
                  id="contribute-amount"
                  type="number"
                  inputMode="numeric"
                  min={MIN_RUPEES}
                  step={1}
                  placeholder="Amount"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className={cn(
                    // --radius-input, the design system's 12px for inputs, not
                    // the card's 16px: a box nested in another box never
                    // repeats its container's radius.
                    "h-12 w-full rounded-[var(--radius-input)] border border-border bg-card pl-[calc(var(--space-s)+1.5rem)] pr-[var(--space-s)]",
                    "text-[15px] font-semibold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground",
                    // Same focus treatment as src/components/ui/input.tsx: one
                    // offset ring in the neutral ring colour. An extra sky
                    // border underneath it read as two concentric rings.
                    "transition-[border-color] duration-150 ease-out",
                    "hover:border-sky/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                />
              </div>
              {custom !== "" && !amountValid && (
                <p className="mt-[var(--space-xs)] text-sm text-cinnamon" role="alert">
                  Please enter a whole amount of {inr(MIN_RUPEES)} or more.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
          A one-time thank-you, however much feels right. Never a subscription.
        </p>
      </div>

      {/* The single primary action, in office blue */}
      <button
        type="button"
        onClick={pay}
        onPointerEnter={warm}
        onFocus={warm}
        disabled={!amountValid || working}
        className={cn(
          // gap-xxs, not the -s the old "Open my UPI app" button used: the
          // middot already separates label from amount, and at -s beside a
          // one-word label the two halves stopped reading as one phrase.
          "inline-flex h-12 w-full items-center justify-center gap-[var(--space-xxs)] rounded-full bg-sky px-[var(--space-l)] text-[15px] font-semibold text-white sm:w-auto sm:self-start",
          "shadow-[0_6px_16px_-12px_var(--color-sky)]",
          "transition-[transform,filter,opacity] duration-150 ease-out",
          "hover:brightness-[1.06] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {working ? (
          <>
            {/* The one place a spinner is right: the payer must not click
                again, and the Razorpay modal takes a beat to appear. */}
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Opening
          </>
        ) : (
          <>
            Contribute
            {amountValid && <span className="tabular-nums opacity-90">· {inr(amount as number)}</span>}
          </>
        )}
      </button>

      <p className="flex items-start gap-[var(--space-xs)] text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-[0.15em] h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Payment is handled by Razorpay. UPI, cards, netbanking and wallets all
          work, from India or abroad. We never see your card or UPI details.
        </span>
      </p>
    </div>
  );
}
