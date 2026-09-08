/* ------------------------------------------------------------------ *
 *  The reader's old address, kept alive forever.
 *
 *  The reader moved to /catchups/edition/[editionId] on 2026-09-08, when
 *  Round became Edition everywhere (spec section 2). This file is the other
 *  half of that move, and it is PERMANENT rather than a migration aid.
 *
 *  Two kinds of link point here and neither is ours to fix:
 *   - every `Notification.link` written before the rename. The dated
 *     migration rewrites the rows that exist, but the deployed build keeps
 *     writing the old path until this commit ships, so there is always a
 *     window;
 *   - anything a member has already shared, bookmarked or been emailed. A
 *     Catch-up is a keepsake people come back to, so a dead link here is a
 *     dead link years from now.
 *
 *  308, not 307: the path is gone for good and every crawler and browser
 *  should stop asking for it.
 * ------------------------------------------------------------------ */

import { permanentRedirect } from "next/navigation";

export default async function RoundRedirect({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  permanentRedirect(`/catchups/edition/${editionId}`);
}
