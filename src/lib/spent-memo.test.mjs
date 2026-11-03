import test from "node:test";
import assert from "node:assert/strict";
import { createSpentMemo, MEMO_MAX_MS, MEMO_MAX_KEYS } from "./spent-memo.ts";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A refused sign-in costs no Upstash command the second time (bug
 *  audit 3, L5-02).
 *
 *  A flood the meters had already refused still spent two to four of
 *  the month's 500,000 commands on every attempt, so one machine at ten
 *  a second emptied the month in hours and every limiter in the app then
 *  failed open. The memo answers a key already seen spent, and the
 *  sign-in door asks it, and the free bot check, before anything that
 *  costs a command. These pin both halves: what the memo may and may not
 *  remember, and the order the door asks in.
 * ------------------------------------------------------------------ */

const T0 = 1_800_000_000_000;

test("a key seen spent is answered from memory until its window turns", () => {
  const memo = createSpentMemo();
  assert.equal(memo.known("login-ip:203.0.113.9", T0), false, "an unseen key is never refused from memory");
  memo.remember("login-ip:203.0.113.9", T0 + 60_000, T0);
  assert.equal(memo.known("login-ip:203.0.113.9", T0 + 59_999), true);
  assert.equal(memo.known("login-ip:203.0.113.9", T0 + 60_000), false, "held past the window's reset");
  assert.equal(memo.size(), 0, "an expired key is dropped when it is read");
});

test("no key is held longer than the cap, whatever its window", () => {
  /* emailMoves is a 30-day window: its bucket can end weeks away. A sliding
     window frees tokens before that, so the memo must ask again soon. */
  const memo = createSpentMemo();
  memo.remember("emailMoves:u1", T0 + 30 * 86_400_000, T0);
  assert.equal(memo.known("emailMoves:u1", T0 + MEMO_MAX_MS - 1), true);
  assert.equal(memo.known("emailMoves:u1", T0 + MEMO_MAX_MS), false);
  assert.equal(MEMO_MAX_MS, 15 * 60_000, "the cap is the shortest login window; re-argue it in spent-memo.ts before changing it");
});

test("a reset already past is not remembered at all", () => {
  const memo = createSpentMemo();
  memo.remember("k", T0 - 1, T0);
  memo.remember("k2", T0, T0);
  assert.equal(memo.size(), 0);
});

test("a flood rotating keys cannot grow the memo without end", () => {
  const memo = createSpentMemo();
  for (let i = 0; i < MEMO_MAX_KEYS + 500; i++) memo.remember(`login-account:a${i}@x.test`, T0 + 600_000, T0);
  assert.ok(memo.size() <= MEMO_MAX_KEYS, `${memo.size()} keys held`);
  assert.equal(memo.known(`login-account:a${MEMO_MAX_KEYS + 499}@x.test`, T0), true, "the newest key is kept");
  assert.equal(memo.known("login-account:a0@x.test", T0), false, "the oldest made room");
});

const LIMIT = decomment(read("src/lib/rate-limit.ts"));

test("hasBudget asks the memo first and remembers only a key with none left", () => {
  const body = balancedBody(LIMIT, "export async function hasBudget");
  assert.ok(body, "hasBudget moved; re-point this test");
  const asked = body.indexOf("spent.known(");
  const upstash = body.indexOf("getRemaining(");
  assert.ok(asked !== -1 && upstash !== -1 && asked < upstash, "hasBudget reads Upstash before the memo");
  assert.match(
    body,
    /if \(remaining <= 0\) spent\.remember\(/,
    "hasBudget remembers a key that still had some budget (not enough for 50 is not none)",
  );
  const known = balancedBody(LIMIT, "export function knownSpent");
  assert.match(known ?? "", /spent\.known\(/, "knownSpent no longer reads the memo");
});

test("the sign-in door asks what is free before what costs", () => {
  const auth = decomment(read("src/lib/auth.ts"));
  const door = auth.slice(auth.indexOf("async authorize("), auth.indexOf("const fail = () =>"));
  assert.ok(door.length > 0, "authorize moved; re-point this test");
  const at = (needle) => {
    const i = door.indexOf(needle);
    assert.ok(i !== -1, `authorize no longer contains ${needle}`);
    return i;
  };
  const memoDoor = at('knownSpent("login-ip", ip) || knownSpent("login-account", acctKey)');
  const botCheck = at("await checkTurnstile(");
  const memoUnverified = at('!verdict.ok && knownSpent("login-unverified", ip)');
  const meters = at('hasBudget("login-ip", ip)');
  const unverified = at('hasBudget("login-unverified", ip)');
  assert.ok(memoDoor < botCheck, "the memo must refuse a known flood before Cloudflare is asked");
  assert.ok(botCheck < memoUnverified, "the unverified memo needs the bot verdict");
  assert.ok(memoUnverified < meters, "a tokenless flood reads the door's two meters before its own known refusal");
  assert.ok(meters < unverified, "the order of the paid reads changed; re-argue it in auth.ts");
});
