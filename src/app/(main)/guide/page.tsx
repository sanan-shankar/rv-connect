import type { Metadata } from "next";
import Link from "@/components/common/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GUIDE_AREAS } from "@/lib/guide-areas";

export const metadata: Metadata = {
  title: "Guide",
  description: "How each part of the site works, and what it is for.",
};

/**
 * The guide's index, and the half of the door that has to be findable.
 *
 * The other half is the page title on each surface, which opens that page's
 * own chapter and is invisible until you look for it. That one is a shortcut
 * and is allowed to be quiet precisely because this exists: a member who is
 * lost looks at the menu, not at the page. See docs/spec/guide.md section 4.
 */
export default function GuideIndexPage() {
  return (
    <div>
      <PageHeader
        title="Guide"
        subtitle="What each part of the site is for, and how it works."
      />
      <ul className="grid gap-2.5">
        {GUIDE_AREAS.map((area) => (
          <li key={area.slug}>
            <Link
              href={`/guide/${area.slug}`}
              className="state-layer group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 outline-none transition-transform duration-150 ease-out active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-[1.05rem] font-bold tracking-[-0.015em] text-foreground">
                  {area.title}
                </span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted-foreground">
                  {area.blurb}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
