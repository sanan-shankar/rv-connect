/* ------------------------------------------------------------------ *
 *  The answering screen's old address, kept alive forever.
 *
 *  Answering moved ONTO the Catch-up's home in build phase 7, at his word
 *  (N77): "maybe we should just tie in the huge answering UI we had with
 *  our home screen or whatever. Because it doesn't make sense to have the
 *  collecting in the home screen and then the answering takes you away
 *  from it." Only the reader is still an address of its own.
 *
 *  Three kinds of link point here and none of them is ours to fix:
 *   - every `Notification.link` written before this shipped. The dated
 *     migration rewrites the rows that exist, but the deployed build keeps
 *     writing this path until this commit ships, so there is always a
 *     window;
 *   - the reminder emails already in seventy inboxes, which is the whole
 *     point of a nudge and cannot be recalled;
 *   - anything a member has bookmarked.
 *
 *  308, not 307: the path is gone for good.
 *
 *  It lands on the home rather than on /catchups, because the home is
 *  where answering now happens -- somebody following a "you have until
 *  Thursday" nudge arrives at the box they were sent to write in.
 * ------------------------------------------------------------------ */

import { permanentRedirect } from "next/navigation";

export default async function AnswerRedirect({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}) {
  const { catchupId } = await params;
  permanentRedirect(`/catchups/${catchupId}`);
}
