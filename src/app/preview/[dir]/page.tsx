import { notFound } from "next/navigation";
import { DIRECTIONS, FeedShell, type DirKey } from "../_shared";

export default async function PreviewFeed({
  params,
}: {
  params: Promise<{ dir: string }>;
}) {
  const { dir } = await params;
  const t = DIRECTIONS[dir as DirKey];
  if (!t) notFound();
  return <FeedShell t={t} />;
}
