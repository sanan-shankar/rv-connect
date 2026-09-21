import { PageHeader } from "@/components/layout/page-header";
import { ButtonSkeleton } from "@/components/common/skeleton";
import { COMPOSER_KINDS, kindLabel } from "@/lib/admin-threads";

/* "Reach out" before it arrives: the real title, then the composer card at
   page.tsx's and message-composer.tsx's own measurements.

   Only the composer, and not the conversations under it, because that is the
   part that is always there. Most members have never written in, so what
   lands below it is an empty box, not a list; a skeleton that drew a heading
   and three thread cards promised a list to nearly everybody and then took it
   back. The one that has conversations gets them added under a composer that
   did not move, which is an arrival rather than a jump.

   The composer: the 36px bird beside the field, which is drawn on a phone as
   well (the bird's own inline-grid outlasts the `hidden` meant to drop it);
   the field at the height its placeholder sizes it to, 64px where the
   sentence fits one line and 67.5 where a phone wraps it to two; then the
   three kinds, Screenshot and Send, each as its own box with its words
   invisible, wrapping where the real row wraps. */
export default function MessagesLoading() {
  return (
    <div>
      <PageHeader title="Reach out" />

      <div className="card-elevated mb-8 rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="skeleton-warm mt-0.5 size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="skeleton-warm h-[67.5px] rounded-[var(--radius-input)] sm:h-16" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {COMPOSER_KINDS.map((k) => (
                  <span
                    key={k}
                    className="skeleton-warm rounded-full px-3 py-1.5 text-[12.5px] font-medium"
                  >
                    <span className="invisible">{kindLabel(k)}</span>
                  </span>
                ))}
              </div>
              <span className="skeleton-warm inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
                <span className="size-3.5" />
                <span className="invisible">Screenshot</span>
              </span>
              <div className="ml-auto flex items-center gap-2.5">
                <ButtonSkeleton size="sm" icon label="Send" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
