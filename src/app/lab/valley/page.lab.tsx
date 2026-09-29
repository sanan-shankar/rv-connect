/* /lab/valley: the landing page's opening, a flight over the real valley
   that ends on the three hills. docs/planning/valley/storyboard.md. */

import { requireLabAdmin } from "@/app/lab/_gate";
import type { Metadata } from "next";
import { ValleyFilm } from "./_film";

export const metadata: Metadata = { title: "The valley, flown into" };

export default async function ValleyPage() {
  await requireLabAdmin();
  return <ValleyFilm />;
}
