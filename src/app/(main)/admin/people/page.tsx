import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { peopleWhere, readPeopleFilters } from "@/lib/admin-people";
import { loadPeoplePage } from "@/lib/admin-people-query";
import { PeopleList } from "@/components/admin/people/people-list";

export const metadata: Metadata = {
  title: "People",
};

/**
 * One list of every member, replacing three sections of the old panel.
 *
 * Two queries: the page of rows (plus one scoped mail lookup inside it) and
 * the count the sentence line reports. The surface this replaces ran three
 * separate scans of this same table on every render, one of them for a
 * section whose filter was literally labelled "Everyone".
 */
export default async function AdminPeoplePage({
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
  const filters = readPeopleFilters(sp);

  const [page, total] = await Promise.all([
    loadPeoplePage(filters),
    prisma.user.count({ where: peopleWhere(filters) }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="People" />
      <PeopleList
        // Keyed on the filters so a navigation resets the accumulated
        // "show more" rows. Without this, filtering after paging would show
        // the new first page appended to the old list's tail.
        key={`${filters.q}|${filters.state}|${filters.kind}`}
        initial={page.rows}
        initialCursor={page.nextCursor}
        total={total}
      />
    </div>
  );
}
