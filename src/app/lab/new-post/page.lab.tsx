/* ------------------------------------------------------------------ *
 *  /lab/new-post - the bird in the button.
 *
 *  "I'm thinking of ditching the shrunk composer above the posts since it
 *  serves the same function as new post. But I kinda like showing ones own
 *  bird on the feed. And I'd like the new post cta to be there because it's
 *  more space efficient ... and I want the posts to start right at the top
 *  instead of this dead space. Also will have to work out beautiful
 *  animation for the composer appearing now that it's not exactly appearing
 *  from anything" (owner, 2026-09-13).
 *
 *  Server half only: it reads the session so the bird in the button is the
 *  owner's own, not a stand-in. Everything that moves is in `_room.tsx`.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { NewPostRoom } from "./_room";

export const dynamic = "force-dynamic";

export default async function NewPostRoomPage() {
  const session = await auth();
  const u = session?.user;
  return (
    <NewPostRoom
      you={{
        id: u?.id ?? "lab-you",
        name: u?.name ?? "You",
        photoUrl: u?.photoUrl ?? null,
        birdOverride: u?.birdOverride ?? null,
      }}
    />
  );
}
