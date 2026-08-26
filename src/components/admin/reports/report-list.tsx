"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, Flag, Inbox, Trash2, XCircle } from "lucide-react";
import { useAdminAct } from "@/components/admin/use-admin-act";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/admin/admin-chip";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
import { formatTimeAgo, metaLine } from "@/lib/utils";
import {
  adminDismissReport,
  adminHidePost,
  adminResolveReport,
} from "@/components/profile/admin-actions";
import { adminRemovePost } from "@/app/(main)/feed/actions";

export interface ReportRow {
  id: string;
  reason: string;
  status: string;
  targetType: string;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  postId: string | null;
  postExcerpt: string | null;
  postTruncated: boolean;
  postHidden: boolean;
  postAuthorId: string | null;
  postAuthorName: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  /** How many reports this PERSON has ever collected, this one included. */
  priorReports: number;
  threadId: string | null;
}

export function ReportList({
  reports,
  settled = false,
}: {
  reports: ReportRow[];
  settled?: boolean;
}) {
  const router = useRouter();
  const { busy, act } = useAdminAct({ refreshOnError: true });
  const [removing, setRemoving] = useState<ReportRow | null>(null);

  return (
    <>
      <div className="flex flex-col gap-2">
        {reports.map((r) => {
          const subjectId = r.targetType === "user" ? r.reportedUserId : r.postAuthorId;
          const subjectName =
            r.targetType === "user" ? r.reportedUserName : r.postAuthorName;

          return (
            <div
              key={r.id}
              className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* One sentence, not a label grid. Who flagged whom is the
                      whole of a report's identity, and reads better as prose. */}
                  <p className="text-[13.5px] leading-snug text-foreground">
                    <Link
                      href={`/admin/people/${r.reporterId}`}
                      className="font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {r.reporterName}
                    </Link>{" "}
                    {r.targetType === "user" ? "flagged" : "reported a post by"}{" "}
                    {subjectId ? (
                      <Link
                        href={`/admin/people/${subjectId}`}
                        className="font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {subjectName}
                      </Link>
                    ) : (
                      <span className="font-semibold">someone since deleted</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {metaLine(r.reason, formatTimeAgo(new Date(r.createdAt)))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {/* The pattern a queue with no history could never show. */}
                  {r.priorReports > 1 && r.targetType === "user" && (
                    <Chip
                      label={`${r.priorReports} reports in all`}
                      tone="bad"
                      icon={Flag}
                    />
                  )}
                  {r.postHidden && <Chip label="Post hidden" tone="idle" icon={EyeOff} />}
                  {settled && <Chip label={r.status} tone="idle" />}
                </div>
              </div>

              {r.postExcerpt && (
                /* The recessed well: one per card, which is the rule, and it
                   is earned here because the reported words are the evidence. */
                <p className="rounded-[var(--radius-md)] bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground">
                  {r.postExcerpt}
                  {r.postTruncated && "..."}
                </p>
              )}

              {!settled && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() =>
                      act(r.id, () => adminDismissReport(r.id), "Dismissed")
                    }
                  >
                    <XCircle className="size-3" strokeWidth={2} />
                    Nothing wrong here
                  </Button>

                  {r.postId && !r.postHidden && (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() =>
                        act(
                          r.id,
                          async () => {
                            await adminHidePost(r.postId!);
                            return adminResolveReport(r.id);
                          },
                          "Post hidden, report settled"
                        )
                      }
                    >
                      <EyeOff className="size-3" strokeWidth={2} />
                      Hide the post
                    </Button>
                  )}

                  {r.postId && (
                    /* Removal goes through the shared ModerationDialog, so the
                       author gets the same optional note here as they would if
                       you took the post down from the feed. */
                    <Button
                      size="xs"
                      variant="destructive"
                      disabled={busy === r.id}
                      onClick={() => setRemoving(r)}
                    >
                      <Trash2 className="size-3" strokeWidth={2} />
                      Remove the post
                    </Button>
                  )}

                  {r.threadId && (
                    <Link
                      href={`/admin/messages/${r.threadId}`}
                      className="inline-flex items-center gap-1 rounded-full px-2 text-[12.5px] font-medium text-canopy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                    >
                      <Inbox className="size-3.5" strokeWidth={2} />
                      Talk to {r.reporterName.split(" ")[0]}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ModerationDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        itemLabel="post"
        onConfirm={async (note) => {
          if (!removing?.postId) return;
          const result = await adminRemovePost(removing.postId, note);
          if (result?.error) return result;
          await adminResolveReport(removing.id);
          router.refresh();
        }}
      />
    </>
  );
}
