import { PageHeader } from "@/components/layout/page-header";
import { VIEW_PILL } from "@/components/admin/analytics/tabs";
import { Heading, Sheet } from "@/components/admin/trivia/parts";
import { RANGES } from "@/lib/trivia-ranges";

/* The trivia gate before it arrives (page.tsx, room.tsx): the real title,
   the three ranges as their own pills with the words invisible, then the
   room's first three blocks with their headings drawn as they are -- the
   door's four steps, two answers waiting to be accepted, and the ten
   question rows, each a line of words over a ribbon's track. */
export default function AdminTriviaLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Trivia gate" />
      <div className="-mx-1 -mt-4 flex gap-1 overflow-hidden px-1 pb-0.5">
        {RANGES.map((r) => (
          <span key={r.key} className={`skeleton-warm ${VIEW_PILL}`}>
            <span className="invisible">{r.label}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-9">
        <section className="flex flex-col gap-3">
          <Heading title="The door" />
          <Sheet className="grid grid-cols-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
                <div className="skeleton-warm h-7 w-12 rounded-md" />
                <div className="skeleton-warm h-2.5 w-24 rounded-md" />
                <div className="skeleton-warm mt-3 h-1.5 w-full rounded-full" />
              </div>
            ))}
          </Sheet>
        </section>
        <section className="flex flex-col gap-3">
          <Heading title="Answers worth a look" />
          <Sheet className="divide-y divide-border">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2 px-3.5 py-3">
                <div className="skeleton-warm h-3.5 w-32 rounded-md" />
                <div className="skeleton-warm h-4 w-48 rounded-full" />
              </div>
            ))}
          </Sheet>
        </section>
        <section className="flex flex-col gap-3">
          <Heading title="The questions, best first" />
          <Sheet className="divide-y divide-border">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2.5 px-3.5 py-3.5 lg:flex-row lg:items-center lg:gap-5">
                <div className="skeleton-warm h-3 w-3/4 rounded-md lg:w-[38%]" />
                <div className="h-2.5 flex-1 rounded-full bg-muted" />
              </div>
            ))}
          </Sheet>
        </section>
      </div>
    </div>
  );
}
