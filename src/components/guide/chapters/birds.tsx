import { GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";
import { Chapter, P, type ChapterProps } from "../guide-kit";

/* The count is GALLERY_SPECIES.length (bird-avatar-v2.tsx), the list /birds renders, so the
   sentence cannot go stale when a species is added. Precedence
   (photo > birdOverride > pin > deterministic) is documented on BirdAvatar.
   Choosing a bird is a supporter's (pick-bird/page.tsx, chooseBird): the
   old chapter told every member "You can pick a different one". Plain
   paragraphs rather than three headings over one paragraph each, which is
   the shape the owner took apart in the other five (2026-09-27). */

export function BirdsChapter({ bare }: ChapterProps) {
  return (
    <Chapter title="The birds" bare={bare}>
      <P>
        If you have not put up a photograph, you are a bird. There are {GALLERY_SPECIES.length}{" "}
        species, all from the valley, and every member without a picture is one of them.
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
