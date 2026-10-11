/* ------------------------------------------------------------------ *
 *  Stitching a browser's speech results into a sentence.
 *
 *  `SpeechRecognition` does not hand over a transcript. It hands over a
 *  list of RESULTS, each one a phrase it has settled on, and it is the
 *  caller's job to put them together. The recorder used to do it with
 *  `heard += result[0].transcript`, which is the whole of the owner's
 *  2026-10-09 complaint:
 *
 *    "the transcription was a bit shaky not great sometimes it just
 *     didn't put a space between different words um, the
 *     capitalizations were kind of weird"
 *
 *  Both faults are here, not in the recogniser. Chrome's results carry no
 *  separator of their own, so concatenation welds the last word of one
 *  phrase to the first of the next ("Hello thereThe banyan"). And every
 *  final result arrives capitalised as though it opened a sentence, because
 *  as far as the recogniser is concerned it did -- so a continuing phrase
 *  gets a capital in the middle of a sentence.
 *
 *  No relative VALUE imports and no framework, so `voice-transcript.test.mjs`
 *  runs this with bare `node` (docs/TRAPS.md, "A testable module must have no
 *  relative VALUE imports").
 * ------------------------------------------------------------------ */

/**
 * The words a continuing phrase may have its capital taken off.
 *
 * THE HARD PART IS NOT LOWER-CASING, IT IS KNOWING WHEN NOT TO. "Hello
 * there" + "The banyan" wants "the"; "Hello there" + "Rishi Valley is still
 * standing" must keep "Rishi". A recogniser capitalises both the same way, so
 * nothing in the text itself tells them apart.
 *
 * What does tell them apart is that English function words are a CLOSED
 * class. There are a few hundred determiners, pronouns, prepositions,
 * conjunctions, auxiliaries and discourse markers, the language gains no more,
 * and essentially none of them is also a name. So the rule is a whitelist
 * rather than a guess: a continuing phrase is lower-cased only when it opens
 * with a word on this list. Everything else -- a name, an acronym, a place, a
 * verb, a noun -- keeps the capital it arrived with.
 *
 * That is deliberately the conservative half of the trade. It leaves a capital
 * on "Went up for the graduation" (a real miss) in exchange for never
 * destroying "Rishi Valley", "Bhoothi" or a surname, which spec 3.10 says this
 * transcript will meet constantly. A wrong capital reads as a typo; a
 * lower-cased surname reads as the app not knowing who somebody is. And the
 * body stays editable either way, which is the owner's own backstop.
 *
 * "will" and "may" qualify on grammar and are LEFT OUT anyway, because each is
 * also a first name. By the trade above a stray capital on "Will we make it"
 * costs less than lower-casing somebody called Will.
 *
 * "I" and its contractions are NOT here and must never be: they are pronouns,
 * so they would otherwise qualify, and lower-casing them is the one
 * disfigurement every reader notices.
 */
const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  // determiners and quantifiers
  "a", "an", "the", "this", "that", "these", "those", "some", "any", "no",
  "every", "each", "both", "all", "another", "other", "such", "half", "many",
  "much", "more", "most", "few", "fewer", "less", "least", "several", "enough",
  // pronouns, minus "I" and its contractions, on purpose
  "we", "us", "our", "ours", "you", "your", "yours", "he", "him", "his",
  "she", "her", "hers", "it", "its", "they", "them", "their", "theirs", "me",
  "my", "mine", "myself", "ourselves", "yourself", "yourselves", "himself",
  "herself", "itself", "themselves", "who", "whom", "whose", "which", "what",
  "whatever", "whoever", "whichever", "someone", "somebody", "something",
  "anyone", "anybody", "anything", "everyone", "everybody", "everything",
  "nobody", "nothing", "one", "ones",
  // prepositions and particles
  "about", "above", "across", "after", "against", "along", "among", "around",
  "as", "at", "before", "behind", "below", "beneath", "beside", "besides",
  "between", "beyond", "by", "despite", "down", "during", "except", "for",
  "from", "in", "inside", "into", "like", "near", "of", "off", "on", "onto",
  "out", "outside", "over", "past", "per", "since", "through", "throughout",
  "till", "to", "toward", "towards", "under", "underneath", "until", "up",
  "upon", "with", "within", "without",
  // conjunctions and subordinators
  "and", "but", "or", "nor", "so", "yet", "because", "although", "though",
  "if", "unless", "whether", "while", "whilst", "whereas", "when", "whenever",
  "where", "wherever", "why", "how", "however", "than", "that's", "once",
  // auxiliaries, modals and the copula, including the common contractions a
  // recogniser writes out
  "am", "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "would", "shall", "should", "can",
  "could", "might", "must", "ought", "isn't", "aren't", "wasn't",
  "weren't", "haven't", "hasn't", "hadn't", "don't", "doesn't", "didn't",
  "won't", "wouldn't", "shouldn't", "couldn't", "can't", "cannot", "we're",
  "we've", "we'd", "we'll", "you're", "you've", "you'd", "you'll", "he's",
  "she's", "it's", "they're", "they've", "they'd", "they'll", "there's",
  "that'll", "let's",
  // discourse markers and common adverbs, which is what speech actually
  // starts a continuing phrase with
  "also", "actually", "again", "almost", "already", "always", "anyway",
  "basically", "even", "ever", "here", "honestly", "instead", "just",
  "maybe", "mostly", "never", "not", "now", "obviously", "often", "only",
  "perhaps", "probably", "quite", "rather", "really", "right", "still",
  "then", "there", "therefore", "too", "usually", "very", "well", "yes",
  "yeah", "okay", "ok", "um", "uh", "er", "hmm", "oh", "plus", "anyhow",
  "meanwhile", "otherwise", "sometimes", "somewhere", "anywhere",
  "everywhere", "nowhere", "together", "alone", "away", "back", "far",
  "later", "soon", "today", "tonight", "yesterday", "tomorrow",
]);

/** The marks that end a sentence, so the next phrase's capital is correct and
 *  is left alone. A comma or a dash does not: the sentence carries on. */
const ENDS_A_SENTENCE = /[.!?…]["')\]]?$/;

/** Every run of whitespace, including the newlines a recogniser never sends
 *  but a pasted phrase might, becomes one space. */
function oneSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * `segment`, tidied and ready to be written after `previous`.
 *
 * Returns the segment ALONE, with no leading space, so a caller that renders
 * the settled words and the still-being-heard words as two separate spans (the
 * recorder does: the second one is lighter and firms up in place) can put them
 * side by side and get the same sentence a join would have produced.
 *
 * The capital comes off only when all three are true: there is something
 * before this, that something did not end a sentence, and the first word is on
 * the closed function-word list above.
 */
export function continueFrom(previous: string, segment: string): string {
  const text = oneSpace(segment);
  if (!text) return "";
  const before = oneSpace(previous);
  if (!before || ENDS_A_SENTENCE.test(before)) return text;

  // The first word, without the punctuation a recogniser sometimes attaches,
  // and only if it looks like a plain Capitalised word. "RV" and "McLeod" have
  // an inner capital, so neither is a sentence-opening capital to remove.
  const first = text.split(" ", 1)[0].replace(/[^A-Za-z']+$/, "");
  if (!/^[A-Z][a-z']*$/.test(first)) return text;
  if (!FUNCTION_WORDS.has(first.toLowerCase())) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/**
 * Every phrase the recogniser has handed over, as one sentence.
 *
 * Empty and whitespace-only segments drop out rather than leaving a double
 * space: a recogniser emits them on a cough.
 */
export function joinHeard(segments: readonly string[]): string {
  let out = "";
  for (const segment of segments) {
    const next = continueFrom(out, segment);
    if (!next) continue;
    out = out ? `${out} ${next}` : next;
  }
  return out;
}

/**
 * The body a composer should hold after a recording stops.
 *
 * A transcript is ADDED to whatever is in the box, never swapped for it: the
 * member may have typed before pressing the microphone, and the lab drawing --
 * where the box held nothing but the transcript -- would have wiped it.
 *
 * `previous` is the transcript this recorder last wrote into the box, so
 * "Record again" replaces its own last transcript instead of stacking a second
 * one under the first. It is matched verbatim at the END of the body and
 * nowhere else: once the member has edited those words they are theirs, and an
 * answer is never rewritten under somebody who is typing in it.
 */
export function bodyWithTranscript(body: string, previous: string, transcript: string): string {
  let kept = body;
  if (previous && kept.trimEnd().endsWith(previous)) {
    kept = kept.trimEnd().slice(0, kept.trimEnd().length - previous.length);
  }
  kept = kept.replace(/\s+$/, "");
  if (!transcript) return kept;
  return kept ? `${kept}\n\n${transcript}` : transcript;
}
