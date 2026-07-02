import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A warm, honest placeholder for surfaces that are designed but not yet built.
 * Not a dead 404: it tells people what is coming and points them somewhere useful.
 */
export function ComingSoon({
  icon: Icon,
  eyebrow,
  title,
  children,
  cta,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf/10 text-leaf">
          <Icon className="h-7 w-7" strokeWidth={1.7} />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        <div className="mx-auto mt-3 max-w-md space-y-3 text-[14.5px] leading-relaxed text-muted-foreground">
          {children}
        </div>
        {cta && (
          <Link href={cta.href} className="mt-6 inline-block">
            <Button variant="primary" className="rounded-full">
              {cta.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
