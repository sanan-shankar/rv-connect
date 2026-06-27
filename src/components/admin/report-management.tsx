"use client";

import { Eye, XCircle, CheckCircle, EyeOff, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminDismissReport, adminResolveReport, adminHidePost } from "@/components/profile/admin-actions";
import { deletePost } from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import Link from "next/link";

interface ReportRow {
  id: string;
  reason: string;
  createdAt: string;
  reporterName: string;
  targetType: string; // "post" | "user"
  postId: string | null;
  postContent: string | null;
  postAuthor: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
}

export function ReportManagement({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending reports.</p>;
  }

  async function handleDismiss(reportId: string) {
    const result = await adminDismissReport(reportId);
    if (result.error) toast.error(result.error);
    else toast.success("Report dismissed");
  }

  async function handleHidePost(postId: string, reportId: string) {
    await adminHidePost(postId);
    await adminResolveReport(reportId);
    toast.success("Post hidden and report resolved");
  }

  async function handleDeletePost(postId: string, reportId: string) {
    await deletePost(postId);
    await adminResolveReport(reportId);
    toast.success("Post deleted and report resolved");
  }

  return (
    <div className="space-y-3">
      {reports.map((report) =>
        report.targetType === "user" ? (
          <Card key={report.id}>
            <CardContent className="pt-4">
              <p className="text-sm">
                <span className="font-medium">{report.reporterName}</span> flagged{" "}
                <span className="font-medium">{report.reportedUserName}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Reason: {report.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.reportedUserId && (
                  <Link href={`/profile/${report.reportedUserId}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      View profile
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDismiss(report.id)}>
                  <XCircle className="mr-1 h-3 w-3" />
                  Dismiss
                </Button>
                <span className="inline-flex items-center text-xs text-muted-foreground">
                  <UserX className="mr-1 h-3 w-3" />
                  Block from the Users list below if needed
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card key={report.id}>
            <CardContent className="pt-4">
              <p className="text-sm">
                <span className="font-medium">{report.reporterName}</span> reported a post by{" "}
                <span className="font-medium">{report.postAuthor}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Reason: {report.reason}</p>
              <p className="mt-2 rounded-lg bg-muted p-2 text-sm text-foreground">
                {report.postContent}
                {(report.postContent?.length ?? 0) >= 200 && "..."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.postId && (
                  <Link href={`/feed#${report.postId}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDismiss(report.id)}>
                  <XCircle className="mr-1 h-3 w-3" />
                  Dismiss
                </Button>
                {report.postId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHidePost(report.postId!, report.id)}
                    >
                      <EyeOff className="mr-1 h-3 w-3" />
                      Hide post
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDeletePost(report.postId!, report.id)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Delete post
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
