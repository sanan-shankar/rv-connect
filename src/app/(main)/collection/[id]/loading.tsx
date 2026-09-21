import { CollectionSkeleton } from "@/components/collection/collection-skeleton";

/* A photograph's address IS the Collection, with the viewer already open on
   that photograph (see page.tsx), so it waits behind the same page. Not the
   viewer's dark stage, though that is what the address ends on: the viewer is
   a lazy chunk that fades in over the Collection once the page is there, so a
   dark skeleton would flash the river between two dark frames. */
export default function PhotoLoading() {
  return <CollectionSkeleton />;
}
