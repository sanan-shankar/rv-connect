import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { readContentFilters, CONTENT_PAGE_SIZE } from "@/lib/admin-content";
import { loadContent } from "@/lib/admin-content-query";
import { ADMIN_MEASURE } from "@/components/admin/admin-chrome";
import { ContentList } from "@/components/admin/content/content-list";

export const metadata: Metadata = {
  title: "Content",
};

/**
 * Find something a member made, and take it down if it needs taking down.
 *
 * The photo review queue lives here as a filter rather than as its own
 * section, which is what it always was.
 */
export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();
  const sp = await searchParams;
  const filters = readContentFilters(sp);

  const [items, pending, author] = await Promise.all([
    loadContent(filters),
    prisma.photo.count({ where: { approved: false, isHidden: false } }),
    filters.authorId
      ? prisma.user.findUnique({
          where: { id: filters.authorId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className={`flex flex-col gap-5 ${ADMIN_MEASURE}`}>
      <PageHeader title="Content" />
      <ContentList
        key={`${filters.q}|${filters.type}|${filters.authorId}|${filters.includeHidden}`}
        items={items}
        pendingPhotos={pending}
        author={author}
        // No silent cap: if the page is full there may be more behind it, and
        // the list says so rather than looking complete.
        capped={items.length >= CONTENT_PAGE_SIZE}
      />
    </div>
  );
}
