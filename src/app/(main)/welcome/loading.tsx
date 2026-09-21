import { ButtonSkeleton, TextSkeleton } from "@/components/common/skeleton";

/* The Welcome step before it arrives, on onboarding-flow.tsx's and
   welcome-step.tsx's own measurements: the 460px flow centred in 65vh, the
   step dots with "Finish later" opposite, then the card and the button under
   it.

   The dots are drawn as themselves (the first, current one canopy and 24px,
   three more waiting), because a row of 8px shimmers would not read as
   anything and the dots say where you are before the words do. The card's
   words are placeholders: the heading carries the member's first name, and
   the sentence under it sits in three measured lines (258, 264, 141px of
   16px at relaxed, in its 34ch measure).

   One em trap. Every gap here is an em token, and Tailwind v4's space-y
   puts its margin on the element ABOVE the gap, so a gap is measured in that
   element's type: 10.7px under the 28px heading, not the 6.1 a 16px line
   would give. The placeholders are set in the real type so the gaps come
   out the same.

   A fresh account usually reaches this page on a hard redirect from signup,
   and the page answers fast enough that the server rarely streams this
   frame; it is what a click from inside the app paints. */
export default function WelcomeLoading() {
  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-[460px] flex-col justify-center py-[var(--space-xl)]">
      <div className="mb-[var(--space-l)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-[var(--space-xs)]">
          <span className="h-2 w-6 rounded-full bg-canopy" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-border" />
          ))}
        </div>
        <span className="text-[13px] font-medium">
          <TextSkeleton>Finish later</TextSkeleton>
        </span>
      </div>

      <div className="space-y-[var(--space-l)] text-center">
        <div className="space-y-[var(--space-xs)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
          <div className="flex h-[35px] items-center justify-center font-heading text-[28px] leading-tight">
            <div className="skeleton-warm h-[0.6em] w-[214px] max-w-full rounded-md" />
          </div>
          <div className="mx-auto max-w-[34ch] text-[16px] leading-relaxed">
            {["w-[258px]", "w-[264px]", "w-[141px]"].map((w) => (
              <div key={w} className="flex h-[26px] items-center justify-center">
                <div className={`skeleton-warm h-3 max-w-full rounded-md ${w}`} />
              </div>
            ))}
          </div>
        </div>
        <ButtonSkeleton size="lg" label="Let's go" className="w-full" />
      </div>
    </div>
  );
}
