import type { Metadata } from "next";
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
  const sp = await searchParams;
  const filters = readPeopleFilters(sp);

  const [page, total] = await Promise.all([
    loadPeoplePage(filters),
    prisma.user.count({ where: peopleWhere(filters) }),
  ]);

  return (
    <div className="flex flex-col gap-4">
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
