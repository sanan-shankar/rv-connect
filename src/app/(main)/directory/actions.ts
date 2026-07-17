"use server";

import { prisma } from "@/lib/prisma";
import { buildDirectoryWhere, directoryOrderBy, type DirectoryFilters } from "./where";

const PAGE_SIZE = 60;

const PERSON_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
  photoUrl: true,
  birdOverride: true,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  currentCity: true,
  jobTitle: true,
  workplace: true,
} as const;

export type DirectoryUser = {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  verifyState: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
  workplace: string | null;
};

/** Fetch one more page of directory results after `cursor` (keyset pagination). */
export async function loadDirectoryPage({
  filters,
  cursor,
}: {
  filters: DirectoryFilters;
  cursor: string | null;
}): Promise<{ users: DirectoryUser[]; nextCursor: string | null }> {
  const where = buildDirectoryWhere(filters);
  const orderBy = directoryOrderBy(filters.sort);

  const rows = await prisma.user.findMany({
    where,
    select: PERSON_SELECT,
    orderBy,
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const users = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? users[users.length - 1].id : null;
  return { users, nextCursor };
}
