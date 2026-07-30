import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getViewerCities } from "@/lib/city-scope";
import { parseJsonArray } from "@/lib/utils";
import { LetterDesk } from "@/components/letters/letter-desk";

export const metadata: Metadata = {
  title: "Continue your letter",
};

/* Resume a DRAFT at the writing desk. Author-only, draft-only: anyone else
 * (and any published letter) gets the same 404 as a row that does not exist,
 * mirroring the visibility rule the reading page already enforces. Published
 * edits stay in the small edit dialog - a quick fix is a short interaction. */
export default async function EditLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const letter = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      status: true,
      authorId: true,
      title: true,
      content: true,
      images: true,
      isHidden: true,
    },
  });

  if (
    !letter ||
    letter.kind !== "letter" ||
    letter.isHidden ||
    letter.status !== "draft" ||
    letter.authorId !== session.user.id
  ) {
    notFound();
  }

  const cities = await getViewerCities(session.user.id);

  return (
    <LetterDesk
      userPlaces={cities}
      postId={letter.id}
      initialTitle={letter.title ?? undefined}
      initialContent={letter.content}
      initialImages={parseJsonArray(letter.images)}
    />
  );
}
