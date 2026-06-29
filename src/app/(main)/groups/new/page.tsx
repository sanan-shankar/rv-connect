import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewGroupPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get all batch years with user counts for selection
  const batchYearCounts = await prisma.user.groupBy({
    by: ["batchYear"],
    where: { isBlocked: false },
    _count: { id: true },
    orderBy: { batchYear: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create a group"
        subtitle="Give it a name and decide who can join. You can invite people anytime."
      />
      <CreateGroupForm
        batchYears={batchYearCounts
          .filter((b): b is { batchYear: number; _count: { id: number } } => b.batchYear != null)
          .map((b) => ({ year: b.batchYear, count: b._count.id }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
