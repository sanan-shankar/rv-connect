import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";
import { DEFAULT_REMINDER_MODE } from "./catchups-core.ts";

/* ------------------------------------------------------------------ *
 *  Two bells an Edition for anybody not taking part.
 *
 *  His answer, 2026-10-17, to how many notifications an Edition may send
 *  somebody who is not taking part: "Only 'a round started' and 'it's
 *  published'. No reminders unless you've turned them on yourself." Most
 *  batches never touch Catch-ups, and his worry was the bell filling with
 *  them until people stop reading it.
 *
 *  So: started and published reach everyone; answers-open reaches the
 *  people taking part (asked a question, or turned reminders on); the
 *  daily reminder reaches only those who turned it on; the empty-window
 *  extension and the manual nudge reach nobody. Pinned by reading the
 *  source, like catchup-lifecycle.test.mjs, because the only database here
 *  is the live one.
 * ------------------------------------------------------------------ */

const notify = decomment(read("src/lib/catchups-notify.ts"));
const actions = decomment(read("src/app/(main)/catchups/actions.ts"));

test("a member who never chose gets no reminders", () => {
  assert.equal(DEFAULT_REMINDER_MODE, "off");
  const reminder = notify.slice(notify.indexOf("export const notifyReminder"));
  assert.match(reminder, /prefByUser\.get\(id\) \?\? DEFAULT_REMINDER_MODE/, "a missing pref reads as something other than the default");
  assert.doesNotMatch(reminder, /bypassOff/, "a reminder that ignores the member's own setting is back");
  // The column agrees, so a row made without naming a mode is off too.
  assert.match(read("prisma/schema.prisma"), /reminderMode String @default\("off"\)/);
  assert.match(
    read("prisma/migrations-manual/2026-10-17-reminders-default-off.sql"),
    /ALTER COLUMN "reminderMode" SET DEFAULT 'off'/
  );
  // And archiving, which makes a pref row, writes off explicitly.
  const upsert = balancedBody(actions, "async function upsertCatchupPref(");
  assert.match(upsert, /reminderMode: DEFAULT_REMINDER_MODE/, "archiving a Catch-up can turn its reminders on");
});

test("answers-open reaches only the people taking part", () => {
  const answers = notify.slice(notify.indexOf("export const notifyAnswersOpen"), notify.indexOf("export const notifyReminder"));
  assert.match(answers, /takingPartIds\(db, ctx\)/, "answers-open goes to the whole group again");
  assert.doesNotMatch(answers, /groupMemberIds\(/, "answers-open reaches past the people taking part");
  const taking = notify.slice(notify.indexOf("async function takingPartIds"), notify.indexOf("async function answeredUserIds"));
  assert.match(taking, /catchupPrompt\.findMany/, "asking a question no longer counts as taking part");
  assert.match(taking, /reminderMode: \{ in: \["all", "last"\] \}/, "turning reminders on no longer counts as taking part");
});

test("the empty-window extension and the nudge ring nobody", () => {
  const core = decomment(read("src/lib/catchups.ts"));
  const apply = balancedBody(core, "async function applyEditionAction(");
  const extend = apply.slice(apply.indexOf('action.kind === "extend-questions"'));
  assert.doesNotMatch(extend.slice(0, extend.indexOf("return cas.count > 0;")), /notify\./, "the empty-window extension rings a bell again");
  assert.doesNotMatch(actions, /export async function nudgeGroup\b/, "the nudge is back; it reached every non-answerer whatever they chose");
});

test("started and published still reach everyone", () => {
  for (const name of ["notifyQuestionsOpen", "notifyPublished"]) {
    const body = notify.slice(notify.indexOf(`export const ${name}`));
    const head = body.slice(0, body.indexOf("};"));
    assert.match(head, /groupMemberIds\(db, ctx\.groupId\)/, `${name} no longer reaches the whole group`);
  }
});
