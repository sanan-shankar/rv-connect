import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The answering screen's "not available" surface (spec 3.4 edge states):
 * a broken/old link, or a non-member hitting the URL directly. Mirrors the
 * Catch-up home's own `NotAvailableCard` (catchups/[catchupId]/page.tsx)
 * copy and shape exactly, so the two sibling routes read as one screen.
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
    <div className="mx-auto max-w-3xl text-center">
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
        {cta && (
          <Link href={cta.href} className="mt-5 inline-flex">
            <Button variant="primary">{cta.label}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
