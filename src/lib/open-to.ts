/**
 * "Open to" tags: a curated starter set for the Directory filter, matched
 * against the comma list stored in `User.openTo` with a `contains`. Free
 * typed tags outside this set (if any exist) stay on the profile but are not
 * offered as filter options, same rationale as the Profession fixed list.
 */
export const OPEN_TO_OPTIONS = [
  "Open to mentoring",
  "Hosting visitors",
  "Career chats",
  "Hiring",
  "Looking for work",
  "Campus walks",
] as const;
