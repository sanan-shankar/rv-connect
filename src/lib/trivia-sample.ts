import { TRIVIA_QUESTIONS, judge, questionById } from "./trivia-bank.ts";
import type { TriviaMember, TriviaRow } from "./trivia-report.ts";

/* ------------------------------------------------------------------ *
 *  An invented month at the trivia gate, for /lab/trivia-gate only.
 *
 *  The real room is empty until people reach the question, and a design
 *  cannot be judged on zeros. So this plays ~220 made-up visitors through
 *  the gate over thirty days, with the Centenary's two busy days near the
 *  end, and the lab hands the rows to the SAME buildGateReport the admin
 *  room uses. Nothing here touches a database; every name is invented.
 *
 *  Deterministic (a seeded generator), so the room looks the same on every
 *  open and a change to the room is the only thing that changes it.
 * ------------------------------------------------------------------ */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* How likely an alumnus is to know each one. Invented, but shaped like a
   guess at the truth: everyone knows the tree, fewer the dinner. */
const KNOW: Record<string, number> = {
  banyan: 0.93,
  cauvery: 0.72,
  caverock: 0.7,
  auditorium: 0.62,
  thursdaydinner: 0.55,
  tuckshop: 0.84,
  raavi: 0.6,
  roundhut: 0.66,
  folkie: 0.68,
  asthachal: 0.5,
};

/* What a person who knows types. Spellings the bank already takes, plus a
   few one letter off, so the "let in one letter off" line has something. */
const RIGHT: Record<string, string[]> = {
  banyan: ["Banyan", "banyan tree", "The Banyan Tree", "BBT", "banyan", "Banyon", "the big banyan"],
  cauvery: ["Cauvery", "Kaveri", "cauvery house", "Cauvary", "Kavery"],
  caverock: ["Cave Rock", "cave rock", "Caverock hill", "Cave Rok"],
  auditorium: ["Auditorium", "the auditorium", "Senior audi", "Audi", "Auditoreum"],
  thursdaydinner: ["Egg curry", "egg curry and tomato rice", "Paneer", "tomato rice", "egg"],
  tuckshop: ["Tuck shop", "tuckshop", "Grub tuck", "tuck", "Tuck Shopp"],
  raavi: ["Raavi", "Ravi", "Raavi valley"],
  roundhut: ["Round hut", "the round hut", "Round"],
  folkie: ["Folkie", "folkie", "Fokie", "Folky"],
  asthachal: ["Asthachal", "Astachal", "Ashtachal", "astha"],
};

/* What a person who does not quite know types. A few of these recur on
   purpose, so "Answers that look right" has its work to do. */
const WRONG: Record<string, string[]> = {
  banyan: ["Peepal", "Neem", "mango tree"],
  cauvery: ["Ganga", "Godavari", "Yamuna", "Tungabhadra"],
  caverock: ["Rishikonda", "Rishikonda", "Bodikonda", "the big hill"],
  auditorium: ["Assembly hall", "assembly hall", "the hall", "Pavilion"],
  thursdaydinner: ["Pulao", "chapati and dal", "Puri", "khichdi"],
  tuckshop: ["Grub", "grub", "canteen", "the store"],
  raavi: ["Ganga", "Banyan", "Peepal"],
  roundhut: ["Dining hut", "the art hut", "Pottery hut"],
  folkie: ["Folk", "folk dance", "Kolattam"],
  asthachal: ["Asthachal walk", "asthachal walk", "Sunset walk", "Meditation"],
};

const FIRST = [
  "Meera", "Arjun", "Kavya", "Rohan", "Ananya", "Vikram", "Lakshmi", "Siddharth", "Nandini", "Karthik",
  "Priya", "Aditya", "Divya", "Rahul", "Shalini", "Varun", "Gita", "Nikhil", "Revathi", "Suresh",
  "Ira", "Dev", "Tara", "Kabir", "Malini", "Ashok", "Uma", "Ramesh", "Sunita", "Vivek",
];
const LAST = [
  "Iyer", "Rao", "Menon", "Reddy", "Krishnan", "Nair", "Shetty", "Pillai", "Murthy", "Bhat",
  "Kulkarni", "Sharma", "Chandran", "Varma", "Naidu", "Hegde",
];

/** Decades weighted toward the generations most likely to sign up first. */
const DECADES = [1960, 1970, 1980, 1980, 1990, 1990, 1990, 2000, 2000, 2010, 2010, 2020];

export function sampleGate(now: Date): { rows: TriviaRow[]; members: TriviaMember[] } {
  const r = rng(20261030);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const rows: TriviaRow[] = [];
  const members: TriviaMember[] = [];
  const ids = TRIVIA_QUESTIONS.map((q) => q.id);
  let n = 0;

  for (let day = 29; day >= 0; day--) {
    /* The Centenary falls three and two days ago in this story. */
    const busy = day === 3 || day === 2;
    const arrivals = busy ? 44 + Math.floor(r() * 12) : Math.floor(r() * 6) + (day < 6 ? 3 : 1);
    for (let a = 0; a < arrivals; a++) {
      const browserId = `sample-${day}-${a}`;
      const kindOf = r();
      const stranger = kindOf < 0.09;
      const looker = !stranger && kindOf < 0.15;
      const decade = pick(DECADES);
      const teacher = !stranger && r() < 0.05;
      const device = r() < 0.64 ? "phone" : r() < 0.93 ? "desktop" : "tablet";
      const country = r() < 0.82 ? "IN" : pick(["US", "GB", "AE", "SG", "AU"]);
      let t = now.getTime() - day * 86_400_000 - Math.floor(r() * 14 * 3_600_000) - 600_000;
      const mine: TriviaRow[] = [];
      const push = (kind: string, questionId: string, answer: string | null = null) => {
        /* Judged by the real judge, exactly as trivia-actions.ts records it,
           so "which rule let it in" and "what gets in" have true counts. */
        const v = answer && (kind === "right" || kind === "wrong") ? judge(questionById(questionId)!, answer) : null;
        mine.push({
          id: `s${++n}`,
          browserId,
          questionId,
          kind: v ? (v.ok ? "right" : "wrong") : kind,
          answer,
          how: v?.how ?? null,
          matched: v?.matched ?? null,
          device,
          country,
          userId: null,
          createdAt: new Date(t),
        });
      };

      let q = pick(ids);
      let passed = false;
      for (let tries = 0; tries < 5 && !passed; tries++) {
        push("shown", q);
        if (looker) break;
        /* Older alumni knew a different school: no folkie by that name, no
           Asthachal walks. The youngest never saw the round hut standing. */
        let p = stranger ? 0.04 : KNOW[q];
        if (!stranger && decade < 1980 && ["folkie", "asthachal", "tuckshop"].includes(q)) p -= 0.3;
        if (!stranger && decade >= 2010 && q === "roundhut") p -= 0.35;
        const knows = r() < p;
        t += (4 + r() * 30) * 1000;
        if (knows) {
          if (r() < 0.14) {
            push("wrong", q, pick(WRONG[q]));
            t += (3 + r() * 12) * 1000;
          }
          push("right", q, pick(RIGHT[q]));
          passed = true;
          break;
        }
        const move = r();
        if (move < 0.38) {
          push("skipped", q);
        } else if (move < 0.52) {
          push("dontknow", q, pick(["idk", "no idea", "I don't know", "dont know"]));
        } else {
          push("wrong", q, pick(WRONG[q]));
          t += (3 + r() * 15) * 1000;
          const then = r();
          if (then < 0.45) push("skipped", q);
          else if (then < 0.75) {
            push("wrong", q, pick(WRONG[q]));
            t += 4000;
            if (r() < 0.5) push("skipped", q);
            else break;
          } else break;
        }
        if (stranger && tries >= 1 && r() < 0.6) break;
        t += 800;
        const next = ids.filter((x) => x !== q);
        q = pick(next);
      }

      if (passed && r() < 0.88) {
        const id = `sample-member-${day}-${a}`;
        members.push({
          id,
          name: `${pick(FIRST)} ${pick(LAST)}`,
          photoUrl: null,
          birdOverride: null,
          accountType: teacher ? "teacher" : "alumnus",
          batchType: teacher ? null : "leaving",
          batchYear: teacher ? null : decade + Math.floor(r() * 10),
          verifyState: "verified",
          createdAt: new Date(t + 120_000),
        });
        for (const row of mine) row.userId = id;
      }
      rows.push(...mine);
    }
  }
  return { rows, members };
}
