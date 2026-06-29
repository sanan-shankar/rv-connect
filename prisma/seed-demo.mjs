/**
 * Dev-only demo seed for RV Alumni.
 *
 * Creates ~12 varied demo alumni (all emails end @demo.valley.test) plus ~16 warm,
 * Rishi-Valley-flavoured posts authored across them. Idempotent: every user is
 * upserted by email and posts for the demo users are reset on each run, so
 * re-running never duplicates rows.
 *
 * All demo accounts share one dev password (DEV_PASSWORD below), bcrypt-hashed.
 * avatarColor is left null so each demo user renders a deterministic valley bird.
 * verifyState is set to "verified" so they appear as real members.
 *
 * It talks to the local SQLite file through @libsql/client directly (the same
 * driver the app's Prisma libSQL adapter uses) and mints cuids with
 * @paralleldrive/cuid2, so it does not depend on the bundler-only generated
 * Prisma client. It NEVER changes the schema and only writes rows whose email
 * ends @demo.valley.test, so it is safe against a dev DB that holds real data.
 *
 * RUN:    node prisma/seed-demo.mjs
 *
 * WIPE (one line; deletes every demo user, cascading to their posts/likes/etc.):
 *   node --input-type=module -e "import {createClient} from '@libsql/client'; const db=createClient({url:'file:dev.db'}); const r=await db.execute(\"DELETE FROM User WHERE email LIKE '%@demo.valley.test'\"); console.log('deleted', r.rowsAffected, 'demo users');"
 */

import { createClient } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcryptjs";

const DOMAIN = "@demo.valley.test";
const DEV_PASSWORD = "valley-demo-2026";

// The local dev owner account. Seeded demo groups add this user as a member so
// they surface in the "Your groups" rail when you browse as the owner.
const OWNER_ID = process.env.SEED_OWNER_ID ?? "cmmz0vvws0000ynsg3ueb9scp";

// Three plausibly-named demo groups (replaces the old junk "asdfasdf" test
// group). Each id is fixed so re-running the seed is idempotent (we delete and
// recreate these exact ids, never the user's real groups). Members are demo
// users by key, and the owner is added to all of them.
const GROUPS = [
  {
    id: "seed-grp-bengaluru",
    name: "Bengaluru Alumni",
    description: "Valley folk now in Bengaluru. Meetups, chai, and the occasional trek.",
    members: ["rohan", "meera", "priya", "nikhil", "lakshmi"],
  },
  {
    id: "seed-grp-class09",
    name: "Class of '09",
    description: "The batch that planted the south orchard. Keeping the thread alive.",
    members: ["ananya", "arjun", "kabir", "george"],
  },
  {
    id: "seed-grp-birders",
    name: "Birders of RV",
    description: "Sightings, photos and dawn-walk notes from the valley and beyond.",
    members: ["meera", "fatima", "sneha", "wei", "zara", "david"],
  },
];

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const iso = (d) => d.toISOString();

// Twelve varied alumni + two teachers. avatarColor null on purpose (deterministic bird).
const PEOPLE = [
  {
    key: "ananya",
    name: "Ananya Krishnan",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2008,
    yearJoined: 2001,
    yearLeft: 2008,
    currentCity: "Bengaluru",
    jobTitle: "Product Designer",
    workplace: "Freshworks",
    instagram: "ananya.draws",
    bio: "ISC '08. Spend my days designing software and my weekends sketching the kingfishers near my parents' place. Still owe the library three books.",
  },
  {
    key: "rohan",
    name: "Rohan Mehta",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 1996,
    yearJoined: 1989,
    yearLeft: 1996,
    currentCity: "London",
    jobTitle: "Civil Engineer",
    workplace: "Arup",
    linkedin: "rohan-mehta-arup",
    bio: "Left the valley in '96, been building bridges ever since. Nothing I have designed is as quiet as the walk up to Rishi Konda at dawn.",
  },
  {
    key: "meera",
    name: "Meera Iyer",
    accountType: "alumnus",
    batchType: "ICSE",
    batchYear: 2014,
    yearJoined: 2009,
    yearLeft: 2016,
    currentCity: "Berlin",
    jobTitle: "Research Scientist",
    workplace: "Max Planck Institute",
    bio: "Studying soil microbes in Berlin, which feels like a roundabout way of staying close to the valley's red earth. ICSE '14, ISC '16.",
  },
  {
    key: "arjun",
    name: "Arjun Reddy",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2002,
    yearJoined: 1995,
    yearLeft: 2002,
    currentCity: "Chennai",
    jobTitle: "Documentary Filmmaker",
    workplace: "Independent",
    instagram: "arjun.films",
    bio: "Telling stories with a camera. Half of them somehow circle back to a hillside school I once knew. ISC 2002.",
  },
  {
    key: "fatima",
    name: "Fatima Sheikh",
    accountType: "alumnus",
    batchType: "ICSE",
    batchYear: 2011,
    yearJoined: 2004,
    yearLeft: 2013,
    currentCity: "Mumbai",
    jobTitle: "Paediatrician",
    workplace: "KEM Hospital",
    bio: "Children's doctor in Mumbai. The patience I learned under the tamarind tree turns out to be the most useful thing I carry to work.",
  },
  {
    key: "david",
    name: "David Thomas",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 1999,
    yearJoined: 1992,
    yearLeft: 1999,
    currentCity: "New York",
    jobTitle: "Jazz Pianist",
    workplace: "The New School",
    bio: "Playing and teaching piano in New York. First learned to read music in the old assembly hall. ISC '99.",
  },
  {
    key: "priya",
    name: "Priya Nair",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2017,
    yearJoined: 2010,
    yearLeft: 2017,
    currentCity: "San Francisco",
    jobTitle: "Software Engineer",
    workplace: "Stripe",
    linkedin: "priya-nair-sf",
    bio: "Building payments infrastructure by day. Trying to grow a balcony herb garden that survives the fog. ISC 2017.",
  },
  {
    key: "kabir",
    name: "Kabir Singh",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2005,
    yearJoined: 1998,
    yearLeft: 2005,
    currentCity: "Delhi",
    jobTitle: "Environmental Lawyer",
    workplace: "Centre for Policy Research",
    bio: "Arguing for rivers and forests in Delhi courtrooms. The seven years on a hillside were not lost on me. ISC 2005.",
  },
  {
    key: "sneha",
    name: "Sneha Pillai",
    accountType: "alumnus",
    batchType: "ICSE",
    batchYear: 2013,
    yearJoined: 2006,
    yearLeft: 2015,
    currentCity: "Pune",
    jobTitle: "Architect",
    workplace: "Studio Lotus",
    instagram: "sneha.builds",
    bio: "Designing buildings that try to breathe the way the dorms did. ICSE '13, ISC '15.",
  },
  {
    key: "wei",
    name: "Lim Wei Sheng",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2009,
    yearJoined: 2002,
    yearLeft: 2009,
    currentCity: "Singapore",
    jobTitle: "Marine Biologist",
    workplace: "National University of Singapore",
    bio: "Studying coral reefs out of Singapore. Funny how a landlocked hill school taught me to pay attention to small living things. ISC 2009.",
  },
  {
    key: "zara",
    name: "Zara Hussain",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 2019,
    yearJoined: 2012,
    yearLeft: 2019,
    currentCity: "Dubai",
    jobTitle: "Journalist",
    workplace: "The National",
    instagram: "zara.writes",
    bio: "Reporting from Dubai. Learned to ask questions during long walks and longer silences in the valley. ISC 2019.",
  },
  {
    key: "nikhil",
    name: "Nikhil Joshi",
    accountType: "alumnus",
    batchType: "ISC",
    batchYear: 1993,
    yearJoined: 1986,
    yearLeft: 1993,
    currentCity: "Toronto",
    jobTitle: "Retired Schoolteacher",
    workplace: "Retired",
    bio: "Taught geography in Toronto for thirty years, shamelessly stealing every method I first met as a student in the valley. ISC '93.",
  },
  // Two teachers (no batch; tenure recorded instead).
  {
    key: "lakshmi",
    name: "Lakshmi Subramaniam",
    accountType: "ex_teacher",
    taughtFrom: 1988,
    taughtUntil: 2012,
    subjects: "Biology, Nature Club",
    currentCity: "Bengaluru",
    jobTitle: "Retired Biology Teacher",
    workplace: "Retired",
    bio: "Taught Biology and ran the Nature Club for twenty-four years. If you ever knew the names of the morning birds, some of that may be my fault.",
  },
  {
    key: "george",
    name: "George Abraham",
    accountType: "teacher",
    taughtFrom: 2003,
    subjects: "Mathematics, Astronomy",
    currentCity: "Chennai",
    jobTitle: "Mathematics Teacher",
    workplace: "Rishi Valley School",
    bio: "Still here, still teaching Mathematics, still dragging students out at midnight to look at Saturn through the old telescope.",
  },
];

// Posts keyed to author. createdAt set as time-ago so the feed has a natural spread.
const now = Date.now();
const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000);

const POSTS = [
  {
    author: "lakshmi",
    tag: "Nature",
    createdAt: hoursAgo(3),
    content:
      "A hoopoe on the slope below Rishi Konda this morning, working the grass for grubs with that absurd crown going up and down. First one I have seen since the rains. The valley remembers how to surprise you.",
  },
  {
    author: "ananya",
    tag: "Meetup",
    createdAt: hoursAgo(9),
    content:
      "Bengaluru alumni, we are doing a small evening at Cubbon Park next Saturday. Bring a flask of tea and any stories you are willing to part with. Reply here if you are coming so I can count cups.",
  },
  {
    author: "george",
    tag: "Campus",
    createdAt: hoursAgo(20),
    content:
      "Took the senior boys up for Saturn last night. Clear sky, rings tilted just right, and for once nobody complained about the cold. One of them said it looked fake. High praise.",
  },
  {
    author: "kabir",
    tag: "Alumni Fund",
    createdAt: daysAgo(1),
    content:
      "Quick note on the alumni fund: this year's scholarship corpus covered full fees for four students who could not otherwise have come. If you have been meaning to give, even a small amount compounds quietly. Details are on the support page.",
  },
  {
    author: "rohan",
    tag: "Memory",
    createdAt: daysAgo(2),
    content:
      "Thirty years on and I can still draw the floor plan of the old dorm from memory. The creaky third bed by the window was mine. Anyone else from the '96 batch remember the midnight thunderstorm that took out the power for a week?",
  },
  {
    author: "meera",
    tag: "Nature",
    createdAt: daysAgo(2),
    content:
      "From a soil lab in Berlin: the red earth of the valley is doing something I am only now learning to measure. I keep a small jar of it on my desk. Colleagues think it is decorative. It is not.",
  },
  {
    author: "arjun",
    tag: "Update",
    createdAt: daysAgo(3),
    content:
      "Spent a week back on campus filming for a small documentary. The tamarind tree is bigger. The silence at dusk is exactly the same. I will share a cut with this community before anyone else.",
  },
  {
    author: "priya",
    tag: "Meetup",
    createdAt: daysAgo(4),
    content:
      "Bay Area folks: there are more of us out here than I realised. Thinking of a Sunday hike and dosa afterward. Drop your name if a morning walk that is gentler than the trek to Rishi Konda appeals to you.",
  },
  {
    author: "fatima",
    tag: "Memory",
    createdAt: daysAgo(5),
    content:
      "A child in my clinic today would not stop fidgeting until I sat on the floor with her. Somewhere in that was the patience of a hundred quiet mornings under the tamarind tree. Thank you, valley, for that.",
  },
  {
    author: "david",
    tag: "Update",
    createdAt: daysAgo(6),
    content:
      "Playing a set in a small room in the West Village this Friday. The first chords I ever learned were on the assembly hall harmonium, slightly out of tune. Everything since has been an attempt to get back to that feeling.",
  },
  {
    author: "sneha",
    tag: "Campus",
    createdAt: daysAgo(7),
    content:
      "We designed a library this year with deep verandahs and cross ventilation, no air conditioning. The clients were nervous. I kept thinking of the old reading room and how the breeze did all the work. It works.",
  },
  {
    author: "wei",
    tag: "Nature",
    createdAt: daysAgo(8),
    content:
      "Diving a reef off Singapore this week and counting species the way we once counted birds on the morning walk. The attention is the same. Wherever you went, the valley taught you to look slowly.",
  },
  {
    author: "zara",
    tag: "Meetup",
    createdAt: daysAgo(10),
    content:
      "Any alumni passing through Dubai this month? I am here and short of people who will let me ramble about the school for an hour over coffee. The bar is low and the coffee is good.",
  },
  {
    author: "nikhil",
    tag: "Memory",
    createdAt: daysAgo(12),
    content:
      "Class of '93 here, now retired in Toronto after a life of teaching geography. Every map I ever drew on a blackboard started, secretly, from the contour of those hills. To my old batch: I think of you often.",
  },
  {
    author: "lakshmi",
    tag: "Alumni Fund",
    createdAt: daysAgo(14),
    content:
      "The Nature Club needs a modest sum to replace its ageing binoculars and reprint the bird checklist. If any old club members want to chip in, it would mean a generation more of children learning the difference between a bulbul and a babbler.",
  },
  {
    author: "george",
    tag: "Campus",
    createdAt: daysAgo(16),
    content:
      "Exam season ended, so I let the maths class out early to watch the sunset from the rocks. Some lessons are not on the syllabus. The valley grades those ones itself.",
  },
];

async function upsertUser(p, passwordHash) {
  const email = `${p.key}${DOMAIN}`;
  const verifiedAt = iso(new Date());
  const existing = await db.execute({
    sql: "SELECT id FROM User WHERE email = ?",
    args: [email],
  });

  const cols = {
    name: p.name,
    password: passwordHash,
    emailVerified: verifiedAt,
    avatarColor: null,
    bio: p.bio ?? null,
    currentCity: p.currentCity ?? null,
    workplace: p.workplace ?? null,
    jobTitle: p.jobTitle ?? null,
    instagram: p.instagram ?? null,
    linkedin: p.linkedin ?? null,
    accountType: p.accountType,
    batchType: p.batchType ?? null,
    batchYear: p.batchYear ?? null,
    yearJoined: p.yearJoined ?? null,
    yearLeft: p.yearLeft ?? null,
    taughtFrom: p.taughtFrom ?? null,
    taughtUntil: p.taughtUntil ?? null,
    subjects: p.subjects ?? null,
    role: "member",
    verifyState: "verified",
    verifiedAt,
    verifyMethod: "admin_manual",
    updatedAt: iso(new Date()),
  };

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    const keys = Object.keys(cols);
    await db.execute({
      sql: `UPDATE User SET ${keys.map((k) => `"${k}" = ?`).join(", ")} WHERE id = ?`,
      args: [...keys.map((k) => cols[k]), id],
    });
    return id;
  }

  const id = createId();
  const allCols = { id, email, createdAt: iso(new Date()), ...cols };
  const keys = Object.keys(allCols);
  await db.execute({
    sql: `INSERT INTO User (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
    args: keys.map((k) => allCols[k]),
  });
  return id;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const idByKey = {};

  for (const p of PEOPLE) {
    idByKey[p.key] = await upsertUser(p, passwordHash);
  }

  // Reset demo posts so re-running stays idempotent (no duplicate posts).
  const ids = Object.values(idByKey);
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute({
    sql: `DELETE FROM Post WHERE authorId IN (${placeholders})`,
    args: ids,
  });

  for (const post of POSTS) {
    const ts = iso(post.createdAt);
    await db.execute({
      sql: `INSERT INTO Post (id, authorId, kind, content, tag, isHidden, createdAt, updatedAt)
            VALUES (?, ?, 'post', ?, ?, 0, ?, ?)`,
      args: [createId(), idByKey[post.author], post.content, post.tag ?? null, ts, ts],
    });
  }

  // Demo groups. Recreate our fixed seed groups idempotently (delete by id,
  // cascade clears memberships) and add demo + owner members.
  const groupIds = GROUPS.map((g) => g.id);
  await db.execute({
    sql: `DELETE FROM "Group" WHERE id IN (${groupIds.map(() => "?").join(", ")})`,
    args: groupIds,
  });
  const nowIso = iso(new Date());
  for (const g of GROUPS) {
    await db.execute({
      sql: `INSERT INTO "Group" (id, name, description, creatorId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [g.id, g.name, g.description, OWNER_ID, nowIso, nowIso],
    });
    // Owner joins as admin so the group shows in the owner's "Your groups" rail.
    const memberUserIds = [OWNER_ID, ...g.members.map((k) => idByKey[k]).filter(Boolean)];
    for (let i = 0; i < memberUserIds.length; i++) {
      const uid = memberUserIds[i];
      await db.execute({
        sql: `INSERT INTO GroupMember (id, groupId, userId, role, joinedAt)
              VALUES (?, ?, ?, ?, ?)`,
        args: [createId(), g.id, uid, i === 0 ? "admin" : "member", nowIso],
      });
    }
  }

  const uc = await db.execute({
    sql: "SELECT count(*) AS n FROM User WHERE email LIKE ?",
    args: [`%${DOMAIN}`],
  });
  const pc = await db.execute({
    sql: `SELECT count(*) AS n FROM Post WHERE authorId IN (${placeholders})`,
    args: ids,
  });
  console.log(
    `Demo seed complete: ${uc.rows[0].n} users, ${pc.rows[0].n} posts, ${GROUPS.length} groups (all ${DOMAIN}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
