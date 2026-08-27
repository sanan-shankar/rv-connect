import { Chapter, Section, P, Doorway } from "../guide-kit";

/* Fifty species, from GALLERY_SPECIES in bird-avatar-v2.tsx. Precedence
   (photo > birdOverride > pin > deterministic) is documented on BirdAvatar. */

export function BirdsChapter() {
  return (
    <Chapter
      title="The birds"
      lede="If you have not put up a photograph, you are a bird. Fifty species live in the valley and every member without a picture is one of them."
    >
      <Section title="Which one you are">
        <P>
          It is worked out from your account, so it is the same bird every time, on every
          device, and it does not change on its own. Take your photograph down again and the
          same bird comes back rather than a new one.
        </P>
      </Section>

      <Section title="Changing it">
        <P>
          You can pick a different one. A photograph always wins over a bird, so putting one
          up hides the bird until you remove it again.
        </P>
      </Section>

      <Section title="Why birds">
        <P>
          Because they are the valley&apos;s, and because a wall of grey initials is a worse
          answer to the same problem. The gallery has every species with its name, which is
          also the only bird list on the site that cannot drift from the ones people are
          actually wearing.
        </P>
      </Section>

      <Doorway href="/birds">See all fifty</Doorway>
    </Chapter>
  );
}
