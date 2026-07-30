import { permanentRedirect } from "next/navigation";

/* ------------------------------------------------------------------ *
 *  Old delight index. Folded into /lab (2026-07-30): delight and second
 *  look were two separate, drifting indexes that between them still
 *  missed rooms and routes elsewhere in the app. /lab is the one place
 *  now; see src/app/lab/_registry.ts for the full list. The rooms this
 *  page used to list keep their own URLs and are unchanged.
 * ------------------------------------------------------------------ */
export default function DelightIndex() {
  permanentRedirect("/lab");
}
