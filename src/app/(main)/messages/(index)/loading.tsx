import { PageHeader } from "@/components/layout/page-header";
import { MessageComposerSkeleton } from "@/components/messages/message-composer-skeleton";

/* "Reach out" before it arrives: the real title, then the composer card at
   page.tsx's and message-composer.tsx's own measurements.

   Only the composer, and not the conversations under it, because that is the
   part that is always there. Most members have never written in, so what
   lands below it is an empty box, not a list; a skeleton that drew a heading
   and three thread cards promised a list to nearly everybody and then took it
   back. The one that has conversations gets them added under a composer that
   did not move, which is an arrival rather than a jump.

   The composer is MessageComposer's own placeholder, shared with the two
   conversation screens. Its bird is drawn on a phone as well, because the
   real one is: the bird's own inline-grid outlasts the `hidden` meant to
   drop it. */
export default function MessagesLoading() {
  return (
    <div>
      <PageHeader title="Reach out" />

      <div className="card-elevated mb-8 rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
        <MessageComposerSkeleton mode="new" submitLabel="Send" />
      </div>
    </div>
  );
}
