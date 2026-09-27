import { prisma } from "@/lib/prisma";
import { insensitive } from "@/lib/db-text";
import { notifyMember } from "@/lib/post-notifications";
import { postNotificationLink, postNoun } from "@/lib/notification-links";
import { decidePostVisibility, type GuardedPost } from "@/lib/post-visibility-rule";

/* ------------------------------------------------------------------ *
 *  "And, also, yeah, obviously, notify the person who is tagged." (owner)
 *
 *  Built on `decidePostVisibility` rather than re-deriving city/batch
 *  audience by hand: that function is already the one answer to "who may
 *  see this post" (post-visibility-rule.ts), and a mention is exactly as
 *  gated as the post it lives in -- nobody hears about being tagged in a
 *  city-scoped letter they do not list, or a batch-targeted post they are
 *  not in. A blocked member is skipped outright, the same way their own
 *  writing already leaves the feed (AUTHOR_IN_GOOD_STANDING, posts.ts):
 *  there is nobody there to tell.
 *
 *  The ids to notify are handed in, not computed here -- a create hands
 *  every id `mentionedUserIds` (rich-text.ts) finds, an edit hands only the
 *  ones a diff against the old body turned up. Deciding which ids count as
 *  "new" is call-site knowledge (what the old body was); deciding who among
 *  them may actually be told is this file's.
 * ------------------------------------------------------------------ */

/**
 * Ceiling on how many mention rows one save writes.
 *
 * A real mention comes from picking a name out of the dropdown, but the
 * stored body is free text in the wire format `@[Name](id)`, so nothing
 * stops a crafted or copy-pasted body carrying hundreds of them. Twenty is
 * comfortably more than an actual "thank you to everyone who came" letter
 * names by hand, so it never clips an honest post while keeping one save
 * from paging half the community.
 */
export const MAX_MENTION_NOTIFICATIONS = 20;

export type MentionSource = "post" | "letter" | "comment";

/**
 * The minimum a mention needs to know about the post it lives on -- its own
 * row for a post/letter, the PARENT post for a comment, since a comment is
 * never more visible than the thread it is on. A plain `Pick` of
 * `GuardedPost` so this can never silently drift from the shape
 * `decidePostVisibility` actually reads.
 */
export type MentionScope = Pick<
  GuardedPost,
  "id" | "authorId" | "cityScope" | "targetBatches" | "isHidden" | "status"
> & {
  kind?: string | null;
};

/**
 * Notify every member a save should tell, once each, type "mention".
 *
 * `ids` is expected pre-filtered to whichever ones are newsworthy for THIS
 * call (every id on a create, only the newly-added ones on an edit) -- this
 * function's own job is narrower: who among them is reachable at all.
 */
export async function notifyMentioned(opts: {
  ids: string[];
  actorId: string;
  actorName: string | null | undefined;
  scope: MentionScope;
  source: MentionSource;
  /**
   * Somebody already being told about this exact save through a different
   * notification -- the post's author on a "commented on your post", the
   * parent's author on a "replied to your comment". A mention is not a
   * second bell for the same event (owner's brief, dedupe rule).
   */
  alsoSkip?: Iterable<string>;
}): Promise<void> {
  const skip = new Set(opts.alsoSkip);
  skip.add(opts.actorId); // never notify yourself for your own mention
  const candidates = [...new Set(opts.ids)]
    .filter((id) => !skip.has(id))
    .slice(0, MAX_MENTION_NOTIFICATIONS);
  if (candidates.length === 0) return;

  const members = await prisma.user.findMany({
    where: { id: { in: candidates }, isBlocked: false },
    select: { id: true, role: true, batchType: true, batchYear: true },
  });
  if (members.length === 0) return;

  // One query for the whole batch, not one per candidate: whether each of
  // THEM lists the post's city, asked only when the post even has one.
  let cityMembers: Set<string> | null = null;
  if (opts.scope.cityScope) {
    const places = await prisma.userPlace.findMany({
      where: {
        userId: { in: members.map((m) => m.id) },
        city: { equals: opts.scope.cityScope, ...insensitive },
      },
      select: { userId: true },
    });
    cityMembers = new Set(places.map((p) => p.userId));
  }

  const link = postNotificationLink(opts.scope);
  const noun = opts.source === "comment" ? "comment" : postNoun(opts.scope.kind);

  for (const member of members) {
    const visible = decidePostVisibility(opts.scope, member, {
      cityMatches: cityMembers ? cityMembers.has(member.id) : true,
    });
    if (!visible.ok) continue; // wrong city, wrong batch, hidden, or a draft
    await notifyMember({
      userId: member.id,
      type: "mention",
      message: `${opts.actorName} mentioned you in a ${noun}`,
      link,
    });
  }
}
