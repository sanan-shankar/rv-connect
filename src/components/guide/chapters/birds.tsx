import { Chapter, P } from "../guide-kit";

/* Fifty species, from GALLERY_SPECIES in bird-avatar-v2.tsx. Precedence
   (photo > birdOverride > pin > deterministic) is documented on BirdAvatar.
   Choosing a bird is a supporter's (pick-bird/page.tsx, chooseBird): the
   old chapter told every member "You can pick a different one". Plain
   paragraphs rather than three headings over one paragraph each, which is
   the shape the owner took apart in the other five (2026-09-27). */

export function BirdsChapter() {
  return (
    <Chapter title="The birds">
      <P>
        If you have not put up a photograph, you are a bird. Fifty species live in the valley,
        and every member without a picture is one of them.
      </P>
      <P>
        Your bird is worked out from your account, so it is the same one every time, on every
        device, and it does not change on its own. A photograph always shows in its place, and
        if you take the photograph down, the same bird comes back.
      </P>
      <P>
        Members who support the site can choose a different bird. The Birds page has every
        species with its name.
      </P>
    </Chapter>
  );
}
