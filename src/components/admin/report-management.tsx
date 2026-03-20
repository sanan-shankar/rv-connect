"use client";

import { Eye, XCircle, CheckCircle, EyeOff } from "lucide-react";
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
  postId: string;
  postContent: string;
  postAuthor: string;
}

export function ReportManagement({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending reports.</p>
    );
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
      {reports.map((report) => (
        <Card key={report.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{report.reporterName}</span>{" "}
                  reported a post by{" "}
                  <span className="font-medium">{report.postAuthor}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reason: {report.reason}
                </p>
                <p className="mt-2 rounded-lg bg-muted p-2 text-sm text-foreground">
                  {report.postContent}
                  {report.postContent.length >= 200 && "..."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/feed#${report.postId}`}>
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismiss(report.id)}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Dismiss
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHidePost(report.postId, report.id)}
              >
                <EyeOff className="mr-1 h-3 w-3" />
                Hide post
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => handleDeletePost(report.postId, report.id)}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Delete post
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
