/* One length ceiling per kind of post, in one place.
 *
 * These used to disagree between the two ends of a post's life: postSchema was
 * a flat max(20000) for both kinds, so the composer accepted a 6,000-character
 * plain post, while editPost enforced 5,000 for a plain post -- and refused to
 * save it again, even with no changes. The post became permanently uneditable
 * (audit B-047).
 *
 * The spec's numbers are the ones kept (docs/spec/letters.md:253: "content max
 * becomes conditional: 5000 for 'post', 20000 for 'letter'"), rather than
 * raising the edit cap to match what creation happened to allow: a plain post
 * is a short thing, which is why the composer nudges toward a Letter at 600
 * characters. Checked live before choosing: the longest plain post on the site
 * is 2,475 characters and none exceeds 5,000, so no existing post is made
 * uneditable by tightening creation to agree with editing.
 *
 * Its own module, with no imports, so a unit test can reach it: validators.ts
 * imports ./collection extensionless and node:test cannot resolve that.
 */
export const POST_CONTENT_MAX = { post: 5000, letter: 20000 } as const;

/** The ceiling for a post of this kind. Anything not a letter is a plain post. */
export function postContentMax(kind: string | null | undefined): number {
  return kind === "letter" ? POST_CONTENT_MAX.letter : POST_CONTENT_MAX.post;
}

/** The refusal, which points somewhere rather than just saying no. */
export const POST_TOO_LONG = `A post can be up to ${POST_CONTENT_MAX.post} characters. This one would make a lovely Letter.`;
