/* ------------------------------------------------------------------ *
 *  The pieces every guide chapter is built from.
 *
 *  A chapter is plain writing now: a title, paragraphs, and a heading
 *  only where it groups paragraphs that belong together. It used to be
 *  built out of diagrams and comparison boxes with short lines beside
 *  them, and the owner read the result on 2026-09-27: "We have a regular
 *  text font, then we have a subheading, then we have a different
 *  regular text font. [...] Just keep this stuff normal", and of the
 *  graphics, "That's just not working." So there is one paragraph style
 *  (16px, 1.65), headings in the heading face, and nothing else.
 *
 *  The voice is the policy pages': "Just be direct, almost like the terms
 *  and conditions kind of tone." Everything written with these must pass
 *  docs/content/AI-WRITING-TELLS.md. See docs/spec/guide.md section 6.
 *
 *  The spacing is the LiftKit ladder read at this size: 20px under the
 *  title (space-s of its 32px), 16px between paragraphs (space-m of the
 *  16px body), 12px under a heading (space-s of its 20px), 40px before
 *  a heading (space-xl of the body), which is what makes a heading read
 *  as the start of the next group rather than the end of the last one.
 * ------------------------------------------------------------------ */

import Link from "@/components/common/link";
import { cn } from "@/lib/utils";

/** `bare`: inside the guide sheet, where the title stands in the sheet's own
 *  header beside the X (owner, 2026-09-27: the chapter is "the primary
 *  element. But it's so far down"), so the chapter is only its writing. */
export type ChapterProps = { bare?: boolean };

export function Chapter({
  title,
  bare,
  children,
}: { title: string; children: React.ReactNode } & ChapterProps) {
  if (bare) {
    return (
      <article>
        <div className="[&>section:first-child]:mt-0">{children}</div>
      </article>
    );
  }
  return (
    <article>
      {/* tabIndex -1: the tour moves focus here when it swaps in the next
          chapter, so a screen reader starts the new chapter at its title. */}
      <h1
        tabIndex={-1}
        className="font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.028em] text-foreground outline-none"
      >
        {title}
      </h1>
      <div className="mt-5 [&>section:first-child]:mt-0">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {/* The first paragraph under a heading binds to it at 12px, not the
          16px between paragraphs. */}
      <div className="mt-3 [&>p:first-child]:mt-0">{children}</div>
    </section>
  );
}

/** The one paragraph style. Every sentence in a chapter is this. */
export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mt-4 text-base leading-[1.65] text-foreground/90 first:mt-0", className)}>
      {children}
    </p>
  );
}

/** A link inside a sentence: the paragraph's own size, leaf ink, underlined,
 *  so it reads as part of the line rather than a button dropped into it. */
export function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-sm font-medium text-leaf underline decoration-leaf/40 underline-offset-[3px] outline-none transition-colors duration-150 hover:decoration-leaf active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      {children}
    </Link>
  );
}
