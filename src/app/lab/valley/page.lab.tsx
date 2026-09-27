/* /lab/valley: the landing page's opening, a flight over the real valley
   that ends on the three hills. docs/planning/valley/storyboard.md. */

import type { Metadata } from "next";
import { ValleyFilm } from "./_film";

export const metadata: Metadata = { title: "The valley, flown into" };

export default function ValleyPage() {
  return <ValleyFilm />;
}
