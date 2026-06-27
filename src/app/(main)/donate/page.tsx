import { redirect } from "next/navigation";

// The school-donation framing was dropped; supporting the platform's hosting
// now lives at /support. Keep this redirect so old links never break.
export default function DonatePage() {
  redirect("/support");
}
