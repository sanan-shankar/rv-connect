import { BirdAvatar } from "@/components/common/bird-avatar";
import { SectionReveal } from "./section-reveal";

const VOUCHED = [
  { id: "trust-a", name: "Ananya Krishnan" },
  { id: "trust-b", name: "Rohan Mehta" },
  { id: "trust-c", name: "Meera Iyer" },
  { id: "trust-d", name: "Arjun Reddy" },
  { id: "trust-e", name: "Fatima Sheikh" },
];

/**
 * The section that converts the hesitant alum: explains the gate, shows the
 * vouching idea with overlapping bird avatars, and answers the unspoken
 * objection ("not another feed to keep up with"). Server-rendered copy.
 */
export function TrustSection() {
  return (
    <SectionReveal>
      <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border bg-card px-7 py-12 sm:px-14 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
              Invite only
            </p>
            <h3 className="mt-3 max-w-[20ch] font-heading text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-foreground text-balance sm:text-4xl">
              A small place, kept small on purpose.
            </h3>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.7] text-muted-foreground">
              Members vouch for members, and the alumni office confirms. No open
              sign-ups, no strangers, no growth targets. You will know the place
              by who is in it.
            </p>
            <p className="mt-5 max-w-[52ch] text-[15.5px] font-medium leading-[1.7] text-foreground">
              Not another feed to keep up with. Not Facebook. Just the valley,
              and the people in it.
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 rounded-[var(--radius-2xl)] border border-border bg-leaf/[0.05] px-6 py-10">
            {/* The avatar widths are fixed, so a row of five md discs would force
                the card wider than the narrowest phones (clipping it). Use the
                smaller, tighter sm discs below the sm breakpoint; full size up. */}
            <div className="flex -space-x-2.5 sm:hidden">
              {VOUCHED.map((u) => (
                <span key={u.id} className="rounded-full ring-2 ring-card">
                  <BirdAvatar user={u} size="sm" />
                </span>
              ))}
            </div>
            <div className="hidden -space-x-3 sm:flex">
              {VOUCHED.map((u) => (
                <span key={u.id} className="rounded-full ring-2 ring-card">
                  <BirdAvatar user={u} size="md" />
                </span>
              ))}
            </div>
            <p className="rounded-full border border-leaf/25 bg-leaf/10 px-4 py-1.5 text-[13px] font-semibold text-leaf">
              10 members vouched
            </p>
            <p className="max-w-[28ch] text-center text-[13px] leading-relaxed text-muted-foreground">
              A bird until you upload a face. You will know the verified mark
              when you see it.
            </p>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
