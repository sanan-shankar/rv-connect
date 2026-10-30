/**
 * What the audit log says beside an erasure about the account's stored files
 * (bug audit 3, B3b's follow-up; the owner keeps what the panel showed).
 *
 * The erasure's own line is written before a single byte goes (T7a-05), so it
 * can only say how many files it QUEUED. It used to say how many storage had
 * removed, because the purge deleted them first. The drain removes them after:
 * seconds later for an admin's delete, that night for the sweep, the next
 * night for anything storage refused. So the panel reads the worklist, where a
 * row leaves only once storage has confirmed its object gone, and every row
 * the purge queues names its account (`PendingImagePurge.accountId`).
 *
 * `stillQueued` is that account's rows; `untaggedQueued` the purge rows queued
 * before the rows were named. While any of those wait, an erasure with no rows
 * of its own cannot be told apart from one whose rows are among them, so the
 * page says nothing rather than claim its files are gone.
 *
 * Pure, so the unit tests hold the exact wording the page shows; the page
 * (src/app/(main)/admin/audit/page.tsx) reads the two counts.
 */
export function erasedFilesState(
  stillQueued: number,
  untaggedQueued: number
): { tone: "good" | "warn"; label: string } | null {
  if (stillQueued > 0) {
    return { tone: "warn", label: `${stillQueued} ${stillQueued === 1 ? "file" : "files"} still queued` };
  }
  return untaggedQueued > 0 ? null : { tone: "good", label: "All files deleted" };
}
