/* ------------------------------------------------------------------ *
 *  Mock data for the profile-page redesign exploration
 *  (src/app/preview/delight/profiles). One realistic alumnus payload,
 *  shaped close to the real `User` + `Post` Prisma models (see
 *  prisma/schema.prisma) but framework-free so every variant can import
 *  it without pulling in Prisma types.
 *
 *  A few fields go beyond what the schema stores today, called out
 *  below, because the brief asks the concepts to design the *slot* for
 *  data the product wants but does not persist yet (house-per-year is
 *  the clearest example — there is no UserHouse table, see
 *  docs/spec/profile.md sec 4.1). Treat those as illustrative, not a
 *  claim that the real profile already has this data.
 * ------------------------------------------------------------------ */

export type MockLinkKind = "instagram" | "linkedin";

export interface MockLink {
  kind: MockLinkKind;
  /** Human label of where it goes, e.g. "Instagram" — see docs/spec/profile.md sec 5. */
  label: string;
  /** What's shown, e.g. "@sanan.shankar" or "linkedin.com/in/sananshankar". */
  handle: string;
  href: string;
}

/**
 * Illustrative only — "houses per year" data does not exist in the schema
 * yet (no UserHouse table). Included so variants can design the slot
 * gracefully rather than invent their own shape; a variant is equally free
 * to omit it entirely if it decides the slot isn't earning its place.
 */
export interface MockHouseYear {
  house: string;
  fromYear: number;
  toYear: number;
}

export interface MockPost {
  id: string;
  kind: "post" | "letter";
  /** Letters only. */
  title?: string;
  content: string;
  /** ISO date string. */
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export interface MockProfile {
  id: string;
  name: string;
  /** Null here — this concept set uses the bird avatar, not a photo override. */
  photoUrl: string | null;
  /**
   * The one picture a member uploads for their own profile (the real column
   * is `User.coverPhoto`). Source frames are 3:2 or 1:1, so a concept must
   * give this a frame with a SANE aspect. The shipped page crops it into a
   * 6.4:1 band, which shows about a quarter of a 3:2 source and reads as a
   * ~5x magnified sliver. Portrait plates, squares, and 21:9 heroes are all
   * fine; a letterbox strip is not.
   */
  coverPhoto: string | null;
  /** Index into ARCHETYPES (src/components/common/bird-avatar-v2.tsx); 3 = Indian Roller. */
  avatarSpecies: number;
  /** Common name for display; the internal glyph's short label is "Roller". */
  speciesName: string;
  accountType: "alumnus" | "teacher" | "ex_teacher";
  verifyState: "unverified" | "pending" | "verified" | "flagged";
  batchType: string | null;
  batchYear: number | null;
  currentCity: string;
  secondaryCity: string | null;
  /**
   * Every city this person is in, all of equal weight (owner, 2026-07-30:
   * "I want to make sure that it's not like a primary city and a secondary
   * city and all. You can just list as many cities as you're in and they're
   * all equally important"). `currentCity`/`secondaryCity` above are the older
   * ranked pair, kept only because the earlier concepts read them.
   */
  cities: string[];
  jobTitle: string | null;
  workplace: string | null;
  yearJoined: number | null;
  yearLeft: number | null;
  gradeJoined: number | null;
  /** Public per the brief, styled like an heirloom detail — never with a "#". */
  admissionNumber: number | null;
  about: string;
  houses: MockHouseYear[];
  links: MockLink[];
  postCount: number;
  letterCount: number;
  posts: MockPost[];
}

export interface ProfileVariantProps {
  profile: MockProfile;
}

/** Mirrors the real letter page's word-count formula (see (main)/letters/[id]/page.tsx). */
export function readMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * The header meta line every concept needs (batch, city, profession), built
 * the same "filter(Boolean).join" way the real profile does so no variant
 * reinvents a dot-separator edge case. Never includes house or admission
 * number — those get their own tasteful slot per the brief.
 */
export function metaParts(profile: MockProfile): string[] {
  const batch = profile.batchYear ? `Batch of ${profile.batchYear}` : null;
  const profession =
    profile.jobTitle && profile.workplace
      ? `${profile.jobTitle} at ${profile.workplace}`
      : profile.jobTitle || profile.workplace || null;
  return [batch, profile.currentCity, profession].filter((p): p is string => Boolean(p));
}

export const PROFILE: MockProfile = {
  id: "mock-sanan-shankar",
  name: "Sanan Shankar",
  photoUrl: null,
  coverPhoto: "/images/collection/v3.webp",
  avatarSpecies: 3,
  speciesName: "Indian Roller",
  accountType: "alumnus",
  verifyState: "verified",
  batchType: "ISC",
  batchYear: 2023,
  currentCity: "Chennai",
  secondaryCity: "Bengaluru",
  // Three, deliberately: a single city never exercises the separator and two
  // reads as the old primary/secondary pair the owner rejected.
  cities: ["Chennai", "Bengaluru", "Delhi"],
  jobTitle: "Software Engineer",
  workplace: "Bluepeak Systems",
  yearJoined: 2014,
  yearLeft: 2021,
  gradeJoined: 4,
  admissionNumber: 1385,
  about:
    "Spent seven years in the valley, from a nervous fourth grader to someone who could name most of the campus birds on sound alone. These days he writes software in Chennai and still can't walk past a banyan tree without slowing down a little. Comes back for Founder's Day most years, flights permitting.",
  // A full nine-year career, deliberately long enough to WRAP at every
  // breakpoint. The old two-entry mock fit on one line everywhere, which is
  // exactly why the chain's wrapping behaviour was never designed: the owner
  // has eight houses and reported the trailing arrow pointing into empty
  // space. Concepts must look right at this length, not just at two.
  houses: [
    { house: "Golden", fromYear: 2014, toYear: 2014 },
    { house: "Silver", fromYear: 2015, toYear: 2015 },
    { house: "Neem", fromYear: 2016, toYear: 2016 },
    { house: "Raavi", fromYear: 2017, toYear: 2017 },
    { house: "Aravali", fromYear: 2018, toYear: 2018 },
    { house: "Krishna", fromYear: 2019, toYear: 2020 },
    { house: "Cauvery", fromYear: 2021, toYear: 2021 },
    { house: "Amaltash", fromYear: 2022, toYear: 2022 },
  ],
  links: [
    { kind: "instagram", label: "Instagram", handle: "@sanan.shankar", href: "https://instagram.com/sanan.shankar" },
    { kind: "linkedin", label: "LinkedIn", handle: "linkedin.com/in/sananshankar", href: "https://linkedin.com/in/sananshankar" },
  ],
  postCount: 5,
  letterCount: 1,
  posts: [
    {
      id: "p1",
      kind: "post",
      content:
        "Ran into Kaushik and Deepa at a coffee shop in Indiranagar last weekend, completely by accident. We ended up staying two hours past closing, trading versions of the same Rishikonda trek story until none of us could agree on how many times Mr. Bhushan actually got left behind.",
      createdAt: "2026-06-28T09:15:00.000Z",
      likeCount: 34,
      commentCount: 9,
    },
    {
      id: "p2",
      kind: "post",
      content:
        "Spotted a hoopoe on the balcony railing this morning, first one I've seen since the valley. Stood there with my coffee going cold for a good ten minutes just watching it dig around in the gravel. Some habits from Nature Walk never really leave you.",
      createdAt: "2026-06-19T06:40:00.000Z",
      likeCount: 61,
      commentCount: 14,
    },
    {
      id: "p3",
      kind: "post",
      content:
        "Found an old library card in a box of school papers while cleaning out my parents' place. Two books overdue by four days, fine of eighty paise. I think I still owe the RV library that money, technically.",
      createdAt: "2026-06-08T14:05:00.000Z",
      likeCount: 47,
      commentCount: 11,
    },
    {
      id: "p4",
      kind: "post",
      content:
        "Drove up for a friend's sister's admission interview and got fifteen minutes to walk around the quad. Same bell, same rasam smell drifting out of the dining hall at eleven, same silence under the banyan that no notice board has ever managed to explain properly.",
      createdAt: "2026-05-22T11:30:00.000Z",
      likeCount: 52,
      commentCount: 8,
    },
    {
      id: "letter1",
      kind: "letter",
      title: "What I Owe the Library",
      content:
        "I joined Rishi Valley in the fourth grade, nine years old and fairly certain the campus was a small country I had been sent to live in without warning. Seven years later I left with an ICSE certificate, one pair of ruined tennis shoes, and a debt to the school library that I am fairly sure has still not been settled.\n\nThe two rupees were for a book on Indian moths that I kept for eleven days past its due date. I remember the exact fine because Mrs. Iyer wrote it on a small yellow slip and slid it across the counter without saying a word, which somehow felt worse than a lecture. I paid it eventually, in coins, and she nodded once like the matter was now closed between us. I think about that transaction more often than I probably should.\n\nWhat I actually think about is everything around it. The walk up to Rishikonda before the heat set in, when the whole hill still smelled like wet stone from the night before. Mr. Bhushan's Nature Walk group, which never once managed to leave on time because someone always spotted something that needed identifying first, usually him. The banyan near the dining hall, wide enough that four of us could sit under it at once and still not run out of shade, and the strange fact that nobody ever seemed to raise their voice under it, as if the tree itself had rules.\n\nI did not understand any of this at fifteen. I understood the timetable, the bell, the queue for lunch that nobody enforced but everyone respected anyway. It took years in Bengaluru, sitting through meetings that could have been emails, to notice how much of my patience, such as it is, got built on that hill.\n\nI am writing this partly because a batchmate asked what I remembered most, and partly because I still owe that library an apology, if not the exact fine. If anyone from the office is reading this, I am good for it. Adjust for inflation as needed.\n\nTo anyone from my batch still following these posts: the moth book was called Common Moths of the Deccan, and I have never once seen a copy since. If you know where one is, I would like to finish reading it. It has been a while.",
      createdAt: "2026-04-30T07:00:00.000Z",
      likeCount: 118,
      commentCount: 26,
    },
    {
      id: "p5",
      kind: "post",
      content:
        "Three years at the same company now, which is apparently rare for people my age. I keep telling people the discipline came from a decade of waking up for 6 AM prayers, not from any productivity book.",
      createdAt: "2026-03-14T16:20:00.000Z",
      likeCount: 39,
      commentCount: 6,
    },
  ],
};
