/**
 * Rishi Valley house names.
 *
 * CANONICAL LIST — supplied by the owner on 2026-07-18, exactly 22 houses,
 * these exact spellings, in this order. Every call site reads from here.
 * The house pickers must also offer an "Other" option with a free-text box
 * (owner instruction), stored as the typed string.
 */
export const HOUSES = [
  "Golden",
  "Silver",
  "Neem",
  "Raavi",
  "Palm",
  "Trishul",
  "Kailash",
  "Meru",
  "Nilgiri",
  "Red",
  "Green",
  "White",
  "Blue",
  "Malli",
  "Takshila",
  "Amaltash",
  "Gulmohar",
  "Alamanda",
  "Duranta",
  "Jacaranda",
  "Krishna",
  "Cauvery",
] as const;

export type HouseName = (typeof HOUSES)[number];

export interface HouseYearEntry {
  year: number;
  house: string;
}

/**
 * Common alternate spellings -> canonical name (lowercased keys).
 * Used to normalize free-typed input; a trailing "house" is stripped first.
 */
const HOUSE_ALIASES: Record<string, HouseName> = {
  kaveri: "Cauvery",
  kavery: "Cauvery",
  kauveri: "Cauvery",
  cauveri: "Cauvery",
  ravi: "Raavi",
  raavee: "Raavi",
  amaltas: "Amaltash",
  amaltaas: "Amaltash",
  allamanda: "Alamanda",
  almanda: "Alamanda",
  taxila: "Takshila",
  takshashila: "Takshila",
  taksheela: "Takshila",
  trishula: "Trishul",
  trisul: "Trishul",
  kailas: "Kailash",
  kailasa: "Kailash",
  nilgiris: "Nilgiri",
  neelgiri: "Nilgiri",
  nilagiri: "Nilgiri",
  gulmohur: "Gulmohar",
  gulmohor: "Gulmohar",
  "gul mohar": "Gulmohar",
  jakaranda: "Jacaranda",
  jacranda: "Jacaranda",
  mali: "Malli",
  mallee: "Malli",
  durantha: "Duranta",
  krisna: "Krishna",
  neam: "Neem",
};

/**
 * Normalize free-typed house input to a canonical house name when possible.
 * Strips a trailing "house", trims, and resolves known alternate spellings.
 * Unrecognized input is returned title-cased as-is (the "Other" path keeps
 * whatever the person typed).
 */
export function normalizeHouse(input: string): string {
  const cleaned = input.trim().replace(/\s+house$/i, "").trim();
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  const canonical = HOUSES.find((h) => h.toLowerCase() === lower);
  if (canonical) return canonical;
  if (HOUSE_ALIASES[lower]) return HOUSE_ALIASES[lower];
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
