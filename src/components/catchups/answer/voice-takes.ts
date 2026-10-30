/* ------------------------------------------------------------------ *
 *  Which of the recorder's late arrivals still count.
 *
 *  Answering out loud is a chain of things that finish later than the
 *  press that started them: the browser's permission prompt, the
 *  recorder's last chunk, an upload of three round trips. Each used to
 *  act on whatever the box held when it finished, and three things went
 *  wrong (bug audit 3, L7-09):
 *
 *   - a recording removed while it was still saving came back: the box
 *     told the answer "no recording", then the upload landed and told it
 *     the recording, so the batch could play what the member took back;
 *   - "Record again" while the first was saving could end with the FIRST
 *     on the answer and the second's bytes purged;
 *   - a second tap on the microphone during the permission prompt started
 *     two recorders into one file and left a microphone open for the life
 *     of the tab, and a prompt answered after the question was left
 *     started a recording nobody could see.
 *
 *  So every late arrival names the TAKE it belongs to, and only the
 *  current take's count. A new take and a removal each move the take on.
 *  Leaving the question does not: a recording the member finished and
 *  moved on from still saves, as it always did.
 *
 *  Pure and import-free, so voice-takes.test.mjs runs it with bare node.
 * ------------------------------------------------------------------ */

export type TakeState = {
  /** The take the box is on. */
  take: number;
  /** What the box is doing with it. */
  phase: "idle" | "asking" | "recording";
  /** Whether the answer holds a recording, as far as this box has said. */
  onAnswer: boolean;
};

export type TakeEvent =
  /** The microphone, or Record again. */
  | { type: "start" }
  /** The browser handed over a microphone for `take`. `mounted` is false
   *  when the question was left while the browser was still asking. */
  | { type: "granted"; take: number; mounted: boolean }
  /** No microphone for `take`: refused, missing, or unsupported. */
  | { type: "refused"; take: number }
  /** The recorder for `take` stopped. `long`: a second or more, a take
   *  worth keeping; under that it was a tap, not an answer. */
  | { type: "stopped"; take: number; long: boolean }
  /** An upload for `take` reached the bucket. */
  | { type: "uploaded"; take: number }
  /** The bin. */
  | { type: "remove" };

/**
 * What the hook does about an event:
 *  - `ask`: request a microphone for the new take;
 *  - `record`: start recording on the stream that just arrived;
 *  - `release`: stop that stream's tracks, because nothing will record on it;
 *  - `upload`: send the take;
 *  - `store`: hand the upload's result to the answer;
 *  - `clear`: tell the answer it has no recording.
 */
export type TakeEffect = "ask" | "record" | "release" | "upload" | "store" | "clear";

export function startTakes(onAnswer: boolean): TakeState {
  return { take: 0, phase: "idle", onAnswer };
}

export function takeStep(s: TakeState, e: TakeEvent): { state: TakeState; effects: TakeEffect[] } {
  switch (e.type) {
    case "start":
      /* A second tap while the browser is still asking, or while recording,
         changes nothing: one microphone, one recorder, one file. */
      if (s.phase !== "idle") return { state: s, effects: [] };
      return { state: { ...s, take: s.take + 1, phase: "asking" }, effects: ["ask"] };

    case "granted":
      if (e.take !== s.take || s.phase !== "asking") return { state: s, effects: ["release"] };
      /* Left while the browser asked: a recording now would have no box to
         show it, and its words and sound would land on an answer the member
         is no longer looking at. */
      if (!e.mounted) return { state: { ...s, phase: "idle" }, effects: ["release"] };
      return { state: { ...s, phase: "recording" }, effects: ["record"] };

    case "refused":
      if (e.take !== s.take || s.phase !== "asking") return { state: s, effects: [] };
      return { state: { ...s, phase: "idle" }, effects: [] };

    case "stopped":
      if (e.take !== s.take) return { state: s, effects: [] };
      if (e.long) return { state: { ...s, phase: "idle" }, effects: ["upload"] };
      /* Too short to keep. The box took the earlier recording away the
         moment this take began, so the answer drops it too, rather than
         keeping a recording the box no longer shows. */
      return { state: { ...s, phase: "idle", onAnswer: false }, effects: s.onAnswer ? ["clear"] : [] };

    case "uploaded":
      /* A removed or superseded take's upload is never handed over. */
      if (e.take !== s.take) return { state: s, effects: [] };
      return { state: { ...s, onAnswer: true }, effects: ["store"] };

    case "remove":
      /* Unconditional: the answer may hold an earlier recording from this
         visit even when this take never finished uploading. */
      return { state: { ...s, take: s.take + 1, phase: "idle", onAnswer: false }, effects: ["clear"] };
  }
}
