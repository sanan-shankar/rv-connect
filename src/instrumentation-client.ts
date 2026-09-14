/* Next calls this the moment an App Router navigation starts. One use: an
   overlay that closes in the same moment is closing BECAUSE the member is
   leaving, and must not rewind history underneath the navigation. See
   src/lib/back-closes.ts, point 4. */

import { noteNavigationStart } from "@/lib/back-closes";

export function onRouterTransitionStart(_url: string, navigationType: "push" | "replace" | "traverse") {
  if (navigationType !== "traverse") noteNavigationStart();
}
