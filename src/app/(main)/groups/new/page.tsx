import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "@/components/groups/create-group-form";

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
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-3xl font-bold text-foreground">
        Create a Group
      </h1>
      <CreateGroupForm
        batchYears={batchYearCounts.map((b) => ({
          year: b.batchYear,
          count: b._count.id,
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
