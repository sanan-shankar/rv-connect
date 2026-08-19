/* The guest list for the prank in ./stray-hair.tsx, kept in a plain module
   rather than in that file for one hard reason: exports from a "use client"
   module are replaced by client REFERENCES across the RSC boundary, so a
   server component importing an array from there gets a proxy object and
   `.includes` is not a function. It has to live somewhere server-safe.

   The happy consequence is that the gate stays on the server, so the hair's
   JS chunk is only ever sent to the people listed here. Everyone else's
   bundle never learns this exists.

   TO END THE JOKE: empty this array. That is the whole kill switch. */
export const STRAY_HAIR_USER_IDS = [
  "cmr1uahuj000004jx4dc4p8co", // Sanan Shankar (owner — self-inflicted, for review)
  "cmseun9s0000004l735aog2kw", // Srivar Janna
];
