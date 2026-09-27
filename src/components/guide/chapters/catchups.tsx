import { Chapter, Section, P, type ChapterProps } from "../guide-kit";

/* Read off the code on 2026-09-27 (docs/spec/guide.md section 7, and
   docs/spec/catchups.md): three days of questions and seven of answers
   (catchups-core.ts), no hidden day since 2026-09-08; a question can be
   anonymous, an answer never; up to three photographs on an answer; the
   Edition is readable by the Catch-up's members only (edition page). A
   batch Catch-up exists once ten of the batch have joined, starts on hold,
   runs every three months once someone starts it, and cannot be left, only
   put away (batch-catchups.ts). Everyone in a batch runs its cycle, holding
   and resuming included; a group Catch-up's Keeper does that alone
   (catchups/actions.ts, allowBatch). Reminders cover answering only. The window lengths, the no-answers
   extension and the Keeper's early-close are left out on purpose: the
   owner asked for the mechanics without "all the if statements". */

export function CatchupsChapter({ bare }: ChapterProps) {
  return (
    <Chapter title="Catch-ups" bare={bare}>
      <P>
        A Catch-up is a newsletter a group of people write for each other. It is the easiest way
        to keep up with a whole group at once, rather than with one person at a time.
      </P>

      <Section title="How an Edition comes together">
        <P>
          For the first three days, everyone adds questions for the group: &ldquo;What does a
          normal day look like for you?&rdquo;, &ldquo;What song has been stuck in your
          head?&rdquo;, &ldquo;Where do you think AI is going?&rdquo; Write your own or pick one
          from the library, and ask anonymously if you like.
        </P>
        <P>
          Then everyone has a week to answer. Answer the questions you want to and skip the rest,
          and add up to three photographs to an answer. Answers always have your name on them,
          because the point is hearing from each other.
        </P>
        <P>
          When answering closes, the questions and answers are published together as an Edition.
          Everyone in the Catch-up can read it, and like and comment on the answers. Nobody
          outside the Catch-up can see it.
        </P>
      </Section>

      <Section title="Your batch, and anyone else">
        <P>
          Once ten people from your batch have joined, the batch gets a Catch-up of its own and
          everyone in it is added. It starts on hold. Anyone in the batch can start it, choose its
          questions and put it back on hold, and once it has started a new Edition begins every
          three months.
        </P>
        <P>
          You can also start a Catch-up with any group you like: your closest friends from
          school, or everyone who was in Amaltash in 2002. Whoever starts it is its Keeper and
          decides how often it runs: every two weeks, every month or every three months.
        </P>
        <P>
          Each Catch-up has a photograph of the school as its picture, which can be swapped for
          one of your own. In a Catch-up&rsquo;s Settings you can choose how often you are reminded
          to answer, and leave one you no longer want to be part of. Your batch&rsquo;s cannot be
          left, but you can put it away. The Keeper can also put their Catch-up on hold for a while.
        </P>
      </Section>
    </Chapter>
  );
}
