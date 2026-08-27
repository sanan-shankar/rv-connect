import { Chapter, Section, P, Doorway } from "../guide-kit";

export function LettersChapter() {
  return (
    <Chapter
      title="Letters"
      lede="A letter is a long piece of writing to the valley. It keeps its own index instead of going into the feed, so it is not sitting underneath a photograph from this morning."
    >
      <Section title="When to write one instead of a post">
        <P>
          When the thing takes paragraphs. An account of a year, what somebody was like,
          what happened after school, a piece about a teacher. Anything you would want read
          properly rather than scrolled past.
        </P>
      </Section>

      <Section title="It waits for you">
        <P>
          The letters desk saves a draft as you write, on the device you are writing on, so
          you can stop in the middle and come back. Nothing is published until you publish
          it.
        </P>
      </Section>

      <Section title="Who reads it">
        <P>
          Every member. Letters are not addressed to one person; they sit in the index for
          anyone to find, and they stay there. People can leave a comment or a heart the same
          way they would on a post.
        </P>
      </Section>

      <Doorway href="/letters">Go to Letters</Doorway>
    </Chapter>
  );
}
