import { BirdAvatar } from "@/components/common/bird-avatar";
import { Chapter, Section, P, Scale, Compare, BlankMark, Doorway } from "../guide-kit";

/* True to docs/spec/catchups.md sections 1, 2.2, 2.3, 2.5, 2.6 and 7.
   "Keeper" and "Edition" are the shipped UI's own words, so they are used
   here rather than explained around. */

export function CatchupsChapter() {
  return (
    <Chapter
      title="Catch-ups"
      lede="A Catch-up is a group newsletter that comes round on a schedule. Everyone answers the same questions while the window is open. When it shuts, the answers are collected into one Edition the whole group reads."
    >
      <Section title="Who is in one">
        <P>
          You choose. A house, a batch, six people from your year. There is no minimum, and
          nobody is added without being asked first. Whoever starts a Catch-up is its Keeper
          and tends it from then on.
        </P>
      </Section>

      <Section title="How an Edition runs">
        <P>One cycle is called an Edition. It runs in one direction and does not go back.</P>
        <Scale
          steps={[
            { key: "ask", weight: 3, tone: "soft", label: "Questions", amount: "3 days", note: "Anyone can add one" },
            { key: "answer", weight: 7, tone: "strong", label: "Answers", amount: "7 days", note: "Everyone writes" },
            { key: "hidden", weight: 1, tone: "warn", label: "Hidden", amount: "1 day", note: "Nobody can read it" },
            { key: "out", weight: 0, tone: "end", label: "It publishes", note: "Everyone sees it at once" },
          ]}
        />
        <P>
          Those are the defaults. The Keeper can change any of them before a window opens,
          and can publish early if everyone has already written.
        </P>
      </Section>

      <Section title="The day it is hidden">
        <P>
          When answering closes, the Edition disappears for a day. Nobody can read it, the
          Keeper included. Then it publishes and everyone sees it at the same time. The day
          is there so that publishing is an event rather than a page filling up over a week.
        </P>
      </Section>

      <Section title="Whose name is on what">
        <P>Questions and answers work differently, and this is the part people get wrong.</P>
        <Compare
          rows={[
            {
              key: "question",
              mark: <BlankMark />,
              label: "A question you add",
              note: "Your name, or not. You choose each time.",
            },
            {
              key: "answer",
              mark: <BirdAvatar user={{ photoUrl: null, id: "guide-catchups-answer", name: "A member" }} size={34} />,
              label: "An answer you write",
              note: "Always your name. There is no anonymous answer.",
            },
          ]}
        />
      </Section>

      <Section title="What to write">
        <P>
          Long answers work better here than short ones. Nobody is scrolling past you and
          everyone reading already knows who you are, so you can start in the middle. Write
          about one thing that happened rather than summarising the year.
        </P>
      </Section>

      <Section title="If hardly anyone answers">
        <P>
          A first Edition will not publish empty. If nobody has written by the time answering
          closes, the window reopens for three more days and everyone is reminded. After
          that it publishes with whatever it has.
        </P>
      </Section>

      <Doorway href="/catchups">Go to Catch-ups</Doorway>
    </Chapter>
  );
}
