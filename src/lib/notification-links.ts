/**
 * Where a notification actually takes you.
 *
 * Every like/comment/reply notification used to hard-code `/feed#<postId>`,
 * which was wrong three ways (audit B-046): a letter's comments are not
 * rendered in the feed at all (the thread lives at /letters/<id>, and the feed
 * shows only a compact card), the fragment never scrolled anywhere because
 * PostFeed fetches its posts after mount so no element with that id exists when
 * the router commits, and a group post is not in the main feed either. Four
 * admin writers likewise still pointed at `/admin?thread=`, a route retired
 * when the moderation inbox moved to its own page.
 *
 * Collected in one module so the answer is given once.
 *
 * `PostFeed` handles the scrolling half of the feed case: it reads the
 * fragment once its posts have rendered -- and again on `hashchange`, for a
 * bell tapped while already on the feed -- then scrolls that card into view
 * and rings it. That sentence was in this comment for months before it was
 * true of any code (bug-report-2 C-052): nothing read the hash, and the
 * member landed at the top of the feed with no idea which post was meant. It
 * reaches posts on the pages that are loaded; anything older still lands on
 * the feed, unscrolled, because the card has not been fetched.
 */

/** A post's own reading surface. */
export function postNotificationLink(post: {
  id: string;
  kind?: string | null;
}): string {
  // A letter is read at its own page, where its comment thread lives.
  if (post.kind === "letter") return `/letters/${post.id}`;
  // Everything else is a feed post. `groupId` is deliberately not a case here:
  // the Groups feature was removed, there is no route that renders a group
  // post, and createPost now refuses a groupId rather than minting content
  // nobody can reach. Linking to /groups/<id> would be a link to a 404.
  return `/feed#${post.id}`;
}

/** The moderation inbox thread. */
export function adminThreadLink(threadId: string): string {
  return `/admin/messages/${threadId}`;
}

/** How a notification names the thing that was acted on. */
export function postNoun(kind?: string | null): "letter" | "post" {
  return kind === "letter" ? "letter" : "post";
}

/**
 * A member's own profile, which is where their settings live.
 *
 * There is no `/settings` route. The profile IS the settings surface (see the
 * sidebar's own note: "There is no settings page any more: your profile IS
 * it"), and the page was retired without the link that pointed at it moving
 * too -- so the one notification a member gets after cancelling their account
 * deletion, at the exact moment they are most likely to want to check their
 * own details, sent them to a 404 (audit M49).
 */
export function ownProfileLink(userId: string): string {
  return `/profile/${userId}`;
}
