import Link from "@/components/common/link";
import { Button } from "@/components/ui/button";

/**
 * The "you cannot read this" surface both Catch-up routes need: a broken or
 * old link, an Edition that has been deleted, a non-member who has the URL.
 *
 * One component for the two routes, because two of them had already drifted.
 * The Catch-up home's copy took the owner's 2026-07-25 correction -- symmetric
 * LiftKit padding instead of an arbitrary `p-12`, and a narrower measure -- and
 * the answering screen's copy did not, while its docblock went on claiming it
 * mirrored the home's "copy and shape exactly". This is the corrected one.
 */
export function NotAvailableCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {/* Symmetric padding, one LiftKit token, same as every other Catch-ups
          tile. It was `p-12`: an arbitrary step, and far bigger than the copy
          it held (owner review 2026-07-25). */}
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-[var(--space-xs)] text-muted-foreground">{body}</p>
        {cta && (
          <Link href={cta.href} className="mt-[var(--space-m)] inline-flex">
            <Button variant="primary">{cta.label}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
