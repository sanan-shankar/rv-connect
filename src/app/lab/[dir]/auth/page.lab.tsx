import { requireLabAdmin } from "@/app/lab/_gate";
import { notFound } from "next/navigation";
import { DIRECTIONS, LoginView, type DirKey } from "../../_shared";

export default async function PreviewAuth({
  params,
}: {
  params: Promise<{ dir: string }>;
}) {
  await requireLabAdmin();
  const { dir } = await params;
  const t = DIRECTIONS[dir as DirKey];
  if (!t) notFound();
  return <LoginView t={t} />;
}
