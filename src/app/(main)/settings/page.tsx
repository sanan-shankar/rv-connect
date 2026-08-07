import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/* ------------------------------------------------------------------ *
 *  There is no settings page any more.
 *
 *  Owner, 2026-08-07: "now that we already have a really pretty UI for
 *  the profiles, might as well just use that for the settings ... if
 *  they click settings, let it first go to profile and then
 *  automatically trigger the transition to editable."
 *
 *  So this route is a doorway, not a page. It sends you to your own
 *  letterhead with ?edit=1, which is the flag that has the sheet open
 *  with the pen already out. The nav entry, every "Add a few lines"
 *  prompt and every old bookmark keep working and all land in the same
 *  place.
 *
 *  The form that used to live here (src/components/settings/settings-form.tsx)
 *  is not deleted yet: account deletion and the appearance switch still
 *  have no home on the profile, and cutting the file before they do
 *  would strand both.
 * ------------------------------------------------------------------ */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  redirect(`/profile/${session.user.id}?edit=1`);
}
