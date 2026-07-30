import { fnv1a } from "@/lib/avatar";

/**
 * Word of the day (dark-mode groundwork, 2026-07-30).
 *
 * A deterministic daily pick from a small valley lexicon, for the settings
 * theme-confirmation flow (and anything else that wants a shared daily word).
 * Pure and DB-free: every server and client computing the same IST date gets
 * the same word, so it can render during SSR with no hydration dance.
 */

/**
 * 30 valley words: birds from the avatar roster (bird-avatar-v2), trees and
 * flowers from the house names (src/lib/houses.ts), and the landscape itself.
 * 30 keeps a repeat at least a month apart in the best case while staying
 * short enough that every entry earns its place; all are single words an RV
 * person would recognise on sight. Order is irrelevant (the hash picks), but
 * keep additions in these three groups.
 */
export const WORDS = [
  // Birds of the valley (the avatar species roster)
  "Hoopoe",
  "Drongo",
  "Sunbird",
  "Kingfisher",
  "Bulbul",
  "Barbet",
  "Hornbill",
  "Lapwing",
  "Koel",
  "Parakeet",
  "Owlet",
  "Flameback",
  "Oriole",
  "Treepie",
  "Coucal",
  "Spurfowl",
  // Trees and flowers (the houses are named for them)
  "Banyan",
  "Neem",
  "Tamarind",
  "Amaltash",
  "Gulmohar",
  "Jacaranda",
  "Raavi",
  "Malli",
  "Duranta",
  "Alamanda",
  // The valley itself
  "Rishikonda",
  "Bodikonda",
  "Monsoon",
  "Astachal",
] as const;

export type WordOfDay = (typeof WORDS)[number];

/**
 * The word for the given moment's date in Asia/Kolkata. The valley's day is
 * an IST day, so the word flips at midnight IST for everyone at once instead
 * of rolling around the globe with each visitor's clock. en-CA is the one
 * locale whose short date is ISO YYYY-MM-DD, giving a stable hash key
 * (en-IN would give 30/07/2026 and re-derive different hashes forever after
 * a locale change). fnv1a returns an unsigned 32-bit int, so the modulo is
 * always in range.
 */
export function wordOfDay(date: Date = new Date()): WordOfDay {
  const key = date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return WORDS[fnv1a(key) % WORDS.length];
}
