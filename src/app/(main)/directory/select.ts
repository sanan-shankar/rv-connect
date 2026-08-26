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
  // BirdAvatar ignores this (see its banner) but DirectoryUser still declares
  // it, so the column is fetched to satisfy a type rather than a pixel.
  avatarColor: true,
  currentCity: true,
  jobTitle: true,
  workplace: true,
} as const;

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
  avatarColor: true,
  jobTitle: true,
  places: {
    select: { city: true, lat: true, lng: true },
    orderBy: { position: "asc" as const },
  },
} as const;
