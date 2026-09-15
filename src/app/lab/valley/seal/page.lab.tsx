/* /lab/valley/seal: the member's own bird pressed into wax, lit by the valley's sun. */

import { auth } from "@/lib/auth";
import { requestTime } from "../_weather";
import { SealRoom } from "./_seal-room";

export const dynamic = "force-dynamic";

export default async function SealPage() {
  const session = await auth();
  return <SealRoom seed={session?.user?.id ?? "valley"} name={session?.user?.name ?? ""} serverNow={requestTime()} />;
}
