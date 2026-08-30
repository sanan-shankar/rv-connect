import { CollectionSkeleton } from "@/components/collection/collection-skeleton";

/* A photograph's address IS the Collection, with the viewer already open on
   that photograph (see page.tsx), so it waits behind the same grid. */
export default function PhotoLoading() {
  return <CollectionSkeleton />;
}
