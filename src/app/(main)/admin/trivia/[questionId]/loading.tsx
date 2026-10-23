import { ChevronLeft } from "lucide-react";
import { Heading, Sheet } from "@/components/admin/trivia/parts";

/* One question before it arrives (question-page.tsx): the way back drawn as
   it is, the topic and the question as placeholders at their own line
   heights, then the ribbon's card with its track. */
export default function AdminTriviaQuestionLoading() {
  return (
    <div className="flex flex-col gap-9">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          Trivia gate
        </span>
        <div>
          <div className="flex h-[18px] items-center">
            <div className="skeleton-warm h-2.5 w-24 rounded-md" />
          </div>
          <div className="mt-1.5 flex h-[31px] items-center">
            <div className="skeleton-warm h-5 w-full max-w-[520px] rounded-md" />
          </div>
        </div>
      </header>
      <section className="flex flex-col gap-3">
        <Heading title="How it went" />
        <Sheet className="flex flex-col gap-4 px-3.5 pb-3.5 pt-4">
          <div className="h-3.5 w-full rounded-full bg-muted" />
          <div className="skeleton-warm h-2.5 w-2/3 rounded-md" />
        </Sheet>
      </section>
    </div>
  );
}
