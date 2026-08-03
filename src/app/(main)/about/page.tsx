import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About" />
      <div className="flex min-h-[75vh] items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          indefinitely procrastinated
        </p>
      </div>
    </div>
  );
}
