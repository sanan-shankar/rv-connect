import type { Prisma } from "@/generated/prisma/client";
import { AUTHOR_CARD_SELECT } from "@/lib/people-select";

/**
 * The columns a directory row needs, in one place because two files read them.
 *
 * `page.tsx` fetches the first page and the map pins; `actions.ts` fetches
 * every page after that. Both had this list written out, identically, and a
 * column added to one and not the other would produce a directory whose second
 * page renders slightly differently from its first -- the kind of bug nobody
 * reports because it looks like a rendering glitch.
 *
 * It cannot live in `actions.ts`: that file is `"use server"`, where every
 * export must be an async function.
 */
export const PERSON_SELECT = {
  ...AUTHOR_CARD_SELECT,
  // The card's meta line: `shortPlaceLabel(user.currentCity)` beside the batch
  // and the job title. `workplace` used to ride along here and was read by
  // nothing -- 60 columns a page for a type, not a pixel. It is still a
  // SEARCHED column (`where.ts`), which is a WHERE clause and not a select.
  currentCity: true,
  jobTitle: true,
} as const;

/**
 * One person, as the directory fetches them. Derived from the select above
 * rather than hand-written, because it was hand-written four times -- in the
 * action, in the client, in the card and (as `PinRow`) in the page -- and a
 * column added to the select and to three of the four is a second page that
 * renders differently from its first. `import type` erases, so a client
 * component may name it.
 */
export type DirectoryPerson = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;

/**
 * The same person, on the map. No `currentCity` or `workplace` -- a pin's card
 * shows neither -- and `places` instead, because a person plots in EVERY city
 * they list rather than one primary one (owner override).
 *
 * lat/lng ride along because the LocationPicker already wrote exact GeoNames
 * coordinates onto every picked row. An older select dropped them, and the map
 * then re-geocoded the bare city string against the small curated table --
 * which is how "Gurgaon" and "Northfield, Minnesota" fell off the map while
 * their rows held perfectly good coordinates.
 */
export const PIN_SELECT = {
  ...AUTHOR_CARD_SELECT,
  jobTitle: true,
  places: {
    select: { city: true, lat: true, lng: true },
    orderBy: { position: "asc" as const },
  },
} as const;

/** The same, for the map. */
export type PinRow = Prisma.UserGetPayload<{ select: typeof PIN_SELECT }>;
