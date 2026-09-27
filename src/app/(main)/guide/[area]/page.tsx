import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { findGuideArea, guideChain, nextGuideArea } from "@/lib/guide-areas";
import { CHAPTERS } from "@/components/guide/chapters";
import { Button } from "@/components/ui/button";

/* The chapter as a page: what a mailed link, a refresh or the /guide index
   opens. Pressing a title inside the app shows the same chapter in a sheet
   instead (guide-open.ts). It ends the way the sheet does, with the next
   chapter, here as a link to its page. Rendered per request, not prerendered
   -- `generateStaticParams` used to sit here and could never do anything,
   because the root layout reads the theme cookie in both `generateViewport`
   and its body, which opts every route in the app into dynamic rendering. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const found = findGuideArea(area);
  if (!found) return { title: "Guide" };
  return { title: found.title, description: found.blurb };
}

export default async function GuideChapterPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const found = findGuideArea(area);
  const Chapter = found ? CHAPTERS[found.slug] : undefined;
  /* An area with no component is a link to nowhere, so it 404s
     loudly here rather than rendering an empty page. */
  if (!found || !Chapter) notFound();

  const session = await auth();
  const type = session?.user?.accountType;
  const next = nextGuideArea(found.slug, guideChain(type === "teacher" || type === "ex_teacher"));

  /* No ContentColumn here: AppShell already puts every (main) child inside the
     one spine (app-shell.tsx:74). The chapter itself keeps the sheet's measure,
     max-w-xl, so a line is ~68 characters here too rather than ~95 at the
     spine's full width. */
  return (
    <div className="max-w-xl">
      <Link
        href="/guide"
        className="state-layer -ms-2 mb-6 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Guide
      </Link>
      <Chapter />
      {next && (
        <div className="mt-10">
          <Button variant="outline" nativeButton={false} render={<Link href={`/guide/${next.slug}`} />}>
            Next: {next.short}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
