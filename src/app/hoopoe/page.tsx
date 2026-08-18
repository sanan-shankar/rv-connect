import type { Metadata } from "next";
import { HoopoePlayground } from "@/components/mascot/hoopoe-playground";

/* The public playground for the mascot, deliberately outside (main) and
   outside /lab: it is a link handed to people who have no account and no
   business seeing a dev room, so it needs neither a session nor the lab
   index around it. src/proxy.ts lists it as public and
   scripts/qa/lab-audit.mjs lists it as a real product route. */
export const metadata: Metadata = {
  title: "Meet the hoopoe",
  description:
    "Play with the hoopoe, the Rishi Valley alumni site's mascot. Walk it, fly it, and watch it react.",
};

export default function HoopoePage() {
  return <HoopoePlayground />;
}
