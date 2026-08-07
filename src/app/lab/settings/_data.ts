"use client";

/* ------------------------------------------------------------------ *
 *  One person, shared by all three takes.
 *
 *  These are the owner's own real values, read off /settings on
 *  2026-08-06. Not invented ones: the takes have to be judged against a
 *  nine-year career with eight houses, a job title that fits and a
 *  workplace that does not, one phone number and no socials at all.
 *  A mock with two tidy houses and every field filled would flatter
 *  every layout equally and settle nothing.
 * ------------------------------------------------------------------ */

import { useCallback, useRef, useState } from "react";
import type { HouseYearEntry } from "@/lib/houses";
import type { PlaceSelection } from "@/components/common/location-picker";

export type ContactKind = "email" | "phone" | "instagram" | "linkedin" | "facebook" | "link";

export interface Contact {
  id: number;
  kind: ContactKind;
  value: string;
  /** only "link" carries one: the short name shown instead of the URL */
  label?: string;
}

export interface Person {
  name: string;
  about: string;
  admissionNumber: string;
  batchYear: string;
  yearJoined: string;
  yearLeft: string;
  jobTitle: string;
  workplace: string;
  cities: PlaceSelection[];
  houses: HouseYearEntry[];
  contacts: Contact[];
}

/** The real picker wants lat/lng it will never use here, so the two seeded
 *  cities are written the short way. */
const place = (label: string, city: string): PlaceSelection => ({
  placeId: null,
  label,
  city,
  lat: null,
  lng: null,
});

const HOUSE_YEARS: [number, string][] = [
  [2014, "Golden"],
  [2015, "Raavi"],
  [2016, "Palm"],
  [2017, "Palm"],
  [2018, "Kailash"],
  [2019, "Krishna"],
  [2020, "Cauvery"],
  [2021, "Alamanda"],
  [2021, "Jacaranda"],
  [2022, "Duranta"],
];

export const PERSON: Person = {
  name: "Sanan Shankar",
  about:
    "Reading physics in London, which is further from the valley than I expected to end up. Still the person who knew every shortcut to the dining hall.",
  admissionNumber: "3430",
  batchYear: "2023",
  yearJoined: "2014",
  yearLeft: "2023",
  jobTitle: "Student",
  workplace: "Imperial College London",
  cities: [
    place("London, England, United Kingdom", "London"),
    place("Chennai, Tamil Nadu", "Chennai"),
  ],
  houses: HOUSE_YEARS.map(([year, house]) => ({ year, house })),
  contacts: [
    { id: 1, kind: "email", value: "sanan.v.shankar@gmail.com" },
    { id: 2, kind: "phone", value: "+91 99400 55940" },
  ],
};

/** The empty-handed case. Every take has to look like something on the day
 *  somebody signs up, not only once it is full. */
export const BLANK: Person = {
  name: "Meera Raghavan",
  about: "",
  admissionNumber: "",
  batchYear: "2019",
  yearJoined: "2012",
  yearLeft: "2019",
  jobTitle: "",
  workplace: "",
  cities: [],
  houses: [],
  contacts: [{ id: 1, kind: "email", value: "meera.r@example.com" }],
};

/* ------------------------------------------------------------------ *
 *  The store.
 *
 *  A field-level save, because every take here drops the sticky "You have
 *  unsaved changes / Discard / Save" bar (owner, 2026-08-06: "I don't
 *  like that behaviour"). `save` stands in for the server action: it sets
 *  a per-field pending flag, waits, then flips it to saved. The delay is
 *  fake but the STATES are the real question, so they are real here.
 * ------------------------------------------------------------------ */

export type FieldState = "idle" | "saving" | "saved";

export function usePerson(initial: Person = PERSON) {
  const [person, setPerson] = useState<Person>(initial);
  const [states, setStates] = useState<Record<string, FieldState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  /** Change a field without announcing anything. Typing is not saving. */
  const set = useCallback(<K extends keyof Person>(key: K, value: Person[K]) => {
    setPerson((p) => ({ ...p, [key]: value }));
  }, []);

  /** Commit one field. Called on blur for text, immediately for anything
   *  picked from a list, where there is no "still typing" state to respect. */
  const save = useCallback((key: string) => {
    for (const t of timers.current[key] ?? []) clearTimeout(t);
    setStates((s) => ({ ...s, [key]: "saving" }));
    timers.current[key] = [
      setTimeout(() => setStates((s) => ({ ...s, [key]: "saved" })), 420),
      setTimeout(() => setStates((s) => ({ ...s, [key]: "idle" })), 2600),
    ];
  }, []);

  const setAndSave = useCallback(
    <K extends keyof Person>(key: K, value: Person[K]) => {
      set(key, value);
      save(key as string);
    },
    [set, save]
  );

  return { person, setPerson, set, save, setAndSave, states };
}

/* ---- contacts ---- */

export const CONTACT_KINDS: { kind: ContactKind; label: string; placeholder: string }[] = [
  { kind: "phone", label: "Phone", placeholder: "+91 ..." },
  { kind: "instagram", label: "Instagram", placeholder: "@handle" },
  { kind: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/..." },
  { kind: "facebook", label: "Facebook", placeholder: "facebook.com/..." },
  { kind: "link", label: "Something else", placeholder: "https://..." },
];

let nextContactId = 100;
export function newContact(kind: ContactKind): Contact {
  return { id: nextContactId++, kind, value: "", label: kind === "link" ? "" : undefined };
}
