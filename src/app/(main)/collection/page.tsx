import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionClient } from "@/components/collection/collection-client";
import { myPendingPhotos } from "./actions";

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) return null;

  const pending = await myPendingPhotos();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="The Valley Collection"
        subtitle="A shared picture of the place: the banyan, Rishi Konda, the birds, the light."
      />
      <CollectionClient pending={pending} />
    </div>
  );
}
