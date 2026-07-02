/**
 * Dev-only demo seed for Catch-ups. Creates three "[Demo]" groups, each with a Catch-up in a
 * different lifecycle state (collecting / answering / published), so every surface can be
 * screenshotted. Idempotent: it deletes and recreates any "[Demo]" groups each run (cascades to
 * their catch-ups, issues, questions, answers). Talks to Supabase Postgres via `pg`.
 *
 * RUN:  node scripts/dev/seed-catchup.mjs
 */
import pg from "pg";
import dotenv from "dotenv";
import { createId } from "@paralleldrive/cuid2";

dotenv.config({ path: ".env.local" });
dotenv.config();

const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No DATABASE_URL / DIRECT_URL");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: conn });
const q = (text, params) => pool.query(text, params);

const now = new Date();
const days = (n) => new Date(now.getTime() + n * 864e5);

async function resolveSong(url) {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return { url, title: null, art: null };
    const d = await res.json();
    return { url, title: d.title ?? null, art: d.thumbnail_url ?? null };
  } catch {
    return { url, title: null, art: null };
  }
}

async function main() {
  const admin = (await q(`SELECT id, name FROM "User" WHERE role='admin' ORDER BY "createdAt" ASC LIMIT 1`)).rows[0];
  if (!admin) throw new Error("No admin user found");

  // Ensure a few demo members exist (Postgres may be nearly empty in dev).
  const demoPeople = [
    { name: "Ananya Krishnan", email: "ananya@demo.valley.test", batchYear: 2008 },
    { name: "Rohan Mehta", email: "rohan@demo.valley.test", batchYear: 1996 },
    { name: "Meera Iyer", email: "meera@demo.valley.test", batchYear: 2016 },
    { name: "Arjun Reddy", email: "arjun@demo.valley.test", batchYear: 2002 },
    { name: "David Thomas", email: "david@demo.valley.test", batchYear: 1999 },
  ];
  for (const p of demoPeople) {
    await q(
      `INSERT INTO "User"(id,name,email,"accountType","batchType","batchYear","verifyState","updatedAt","createdAt")
       VALUES($1,$2,$3,'alumnus','ISC',$4,'verified',$5,$5) ON CONFLICT(email) DO NOTHING`,
      [createId(), p.name, p.email, p.batchYear, now]
    );
  }
  const others = (
    await q(
      `SELECT id, name FROM "User" WHERE email LIKE '%@demo.valley.test' ORDER BY "batchYear" ASC LIMIT 5`
    )
  ).rows;
  console.log(`Admin: ${admin.name} (${admin.id}); ${others.length} demo members`);

  await q(`DELETE FROM "Group" WHERE name LIKE '[Demo]%'`);

  const songs = await Promise.all([
    resolveSong("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8"),
    resolveSong("https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b"),
    resolveSong("https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3"),
  ]);

  async function makeGroup(name, description) {
    const id = createId();
    await q(
      `INSERT INTO "Group"(id,name,description,visibility,"creatorId","createdAt","updatedAt") VALUES($1,$2,$3,'private',$4,$5,$5)`,
      [id, name, description, admin.id, now]
    );
    await q(
      `INSERT INTO "GroupMember"(id,"groupId","userId",role,"joinedAt") VALUES($1,$2,$3,'admin',$4)`,
      [createId(), id, admin.id, now]
    );
    for (const m of others) {
      await q(
        `INSERT INTO "GroupMember"(id,"groupId","userId",role,"joinedAt") VALUES($1,$2,$3,'member',$4)`,
        [createId(), id, m.id, now]
      );
    }
    return id;
  }

  async function makeCatchup(groupId, title, intro, cadence, status = "active") {
    const id = createId();
    await q(
      `INSERT INTO "Catchup"(id,"groupId","creatorId",title,intro,cadence,status,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [id, groupId, admin.id, title, intro, cadence, status, now]
    );
    return id;
  }

  async function makeIssue(catchupId, number, status, { qClose, aClose, published } = {}) {
    const id = createId();
    await q(
      `INSERT INTO "CatchupIssue"(id,"catchupId",number,status,"questionsCloseAt","answersCloseAt","publishedAt","remindersSent","createdAt","updatedAt")
       VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,$8)`,
      [id, catchupId, number, status, qClose ?? null, aClose ?? null, published ?? null, now]
    );
    return id;
  }

  async function makeQuestion(issueId, authorId, text, type, opts, showAsker, position) {
    const id = createId();
    await q(
      `INSERT INTO "CatchupQuestion"(id,"issueId","authorId",text,type,options,"showAsker",position,"createdAt")
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, issueId, authorId, text, type, opts ? JSON.stringify(opts) : null, showAsker, position, now]
    );
    return id;
  }

  async function makeAnswer(questionId, authorId, a) {
    const id = createId();
    await q(
      `INSERT INTO "CatchupAnswer"(id,"questionId","authorId",body,images,"songUrl","songTitle","songArt",choice,"createdAt","updatedAt")
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [id, questionId, authorId, a.body ?? null, a.images ? JSON.stringify(a.images) : null,
       a.songUrl ?? null, a.songTitle ?? null, a.songArt ?? null, a.choice ?? null, now]
    );
    return id;
  }

  // ── A. Collecting ──
  {
    const g = await makeGroup("[Demo] Collecting", "Members are adding questions for the first round.");
    const c = await makeCatchup(g, "[Demo] Class of Whenever", "A season of catching up, wherever we all landed.", "monthly");
    const i = await makeIssue(c, 1, "collecting", { qClose: days(2), aClose: days(9) });
    await makeQuestion(i, admin.id, "What are you up to these days?", "text", null, false, 0);
    if (others[0]) await makeQuestion(i, others[0].id, "A photo from your week.", "photo", null, true, 1);
    if (others[1]) await makeQuestion(i, others[1].id, "The song you have on repeat.", "song", null, true, 2);
    console.log("Collecting demo:", `/catchups/${c}`);
  }

  // ── B. Answering ──
  {
    const g = await makeGroup("[Demo] Answering", "Answers are open right now.");
    const c = await makeCatchup(g, "[Demo] Birders of RV", "A gentle check-in for the dawn-walk crowd.", "quarterly");
    const i = await makeIssue(c, 1, "answering", { qClose: days(-1), aClose: days(5) });
    const q1 = await makeQuestion(i, admin.id, "Where are you reading this from?", "text", null, false, 0);
    const q2 = others[0] ? await makeQuestion(i, others[0].id, "A photo from your week.", "photo", null, true, 1) : null;
    const q3 = await makeQuestion(i, admin.id, "Tea or coffee, right now?", "poll", ["Tea", "Coffee"], false, 2);
    // A couple of members have answered; admin has NOT (so the admin sees "Answer now").
    if (others[0]) await makeAnswer(q1, others[0].id, { body: "A balcony in Bengaluru, fog just lifting off the trees." });
    if (others[1] && q2) await makeAnswer(q2, others[1].id, { images: ["/images/landing.jpeg"], body: "The view on my morning walk." });
    if (others[0]) await makeAnswer(q3, others[0].id, { choice: "Coffee" });
    if (others[1]) await makeAnswer(q3, others[1].id, { choice: "Tea" });
    console.log("Answering demo:", `/catchups/${c}`);
  }

  // ── C. Published Roundup ──
  {
    const g = await makeGroup("[Demo] Roundup", "The compiled issue, ready to read.");
    const c = await makeCatchup(g, "[Demo] The Valley, Wherever We Are", "Four gentle check-ins a year.", "quarterly");
    const i = await makeIssue(c, 3, "published", { qClose: days(-9), aClose: days(-2), published: days(-1) });
    const q1 = await makeQuestion(i, admin.id, "What are you up to these days?", "text", null, false, 0);
    const q2 = others[0] ? await makeQuestion(i, others[0].id, "A photo from your week.", "photo", null, true, 1) : null;
    const q3 = others[1] ? await makeQuestion(i, others[1].id, "The song you have on repeat.", "song", null, true, 2) : null;
    const q4 = await makeQuestion(i, admin.id, "Dawn walk or late-night study?", "poll", ["Dawn walk", "Late-night study"], false, 3);

    const bodies = [
      "Teaching again, and re-learning patience one classroom at a time. The valley trained me for exactly this and I did not know it then.",
      "Building bridges in Pune, growing chillies on the balcony, and losing to my daughter at chess most evenings.",
      "Back in Berlin with a jar of red valley earth on my desk. Colleagues think it is decorative. It is not.",
      "Quiet year, on purpose. Reading a lot, walking more, saying yes to less.",
      "Just moved cities again. The boxes are still half-unpacked but the plants made it, so we are home.",
    ];
    const roster = [admin, ...others];
    roster.forEach((u, idx) => makeAnswerSafe(q1, u.id, { body: bodies[idx % bodies.length] }));
    if (q2 && others[0]) makeAnswerSafe(q2, others[0].id, { images: ["/images/landing.jpeg"], body: "First light over the ridge." });
    if (q2 && others[2]) makeAnswerSafe(q2, others[2].id, { images: ["/images/landing.jpeg"] });
    if (q3) {
      if (others[1]) makeAnswerSafe(q3, others[1].id, { songUrl: songs[0].url, songTitle: songs[0].title, songArt: songs[0].art, body: "On repeat all monsoon." });
      if (others[2]) makeAnswerSafe(q3, others[2].id, { songUrl: songs[1].url, songTitle: songs[1].title, songArt: songs[1].art });
      if (others[3]) makeAnswerSafe(q3, others[3].id, { songUrl: songs[2].url, songTitle: songs[2].title, songArt: songs[2].art });
    }
    roster.forEach((u, idx) => makeAnswerSafe(q4, u.id, { choice: idx % 3 === 0 ? "Late-night study" : "Dawn walk" }));

    // flush the queued answer inserts
    await Promise.all(pending);
    console.log("Roundup demo:", `/catchups/issue/${i}`);
  }

  console.log("Done.");
}

// answers are fire-and-forget queued so we can await them together per scenario
const pending = [];
function makeAnswerSafe(questionId, authorId, a) {
  const id = createId();
  pending.push(
    pool.query(
      `INSERT INTO "CatchupAnswer"(id,"questionId","authorId",body,images,"songUrl","songTitle","songArt",choice,"createdAt","updatedAt")
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [id, questionId, authorId, a.body ?? null, a.images ? JSON.stringify(a.images) : null,
       a.songUrl ?? null, a.songTitle ?? null, a.songArt ?? null, a.choice ?? null, now]
    )
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());
