/**
 * One function's body, extracted by balancing braces.
 *
 * Every shape test in this repo works by slicing a function out of a source
 * file and asserting on what is inside it, and the slicing is where they go
 * wrong. Two ways, both of which have shipped here:
 *
 *  - `src.indexOf("\n  }", i)` — the first two-space-indented closing brace.
 *    Correct for a component's inner function, wrong for a top-level server
 *    action, whose body is indented two spaces throughout, so it stops at the
 *    first nested block and every assertion after it reads four lines and
 *    passes against nothing.
 *  - the whole TAIL of the file from the declaration onward, which is what
 *    composer-rule.test.mjs fell back to when the above truncated. That is not
 *    a scope at all: the B-048 pin asserted `/cityScope/` against everything
 *    below `editPost`, and `cityScope` appears six more times in `loadPosts`
 *    further down, so deleting editPost's entire audience block left the test
 *    green (audit C-188).
 *
 * So: balance the parameter parens, step over a `: Promise<{ ... }>` return
 * annotation (whose braces are NOT the body — the naive `indexOf("{")` landed
 * inside one and reported a gated action as ungated), then balance the body's
 * own braces.
 *
 * Lives in a plain .mjs with no imports because the unit gate runs each test
 * with bare `node` and no resolver: no `@/` alias, no extensionless imports.
 * Not named `*.test.mjs`, so the runner does not try to execute it.
 *
 * @param {string} text  the source file
 * @param {string|RegExp} decl  the declaration, e.g. "export async function editPost"
 * @returns {string|null} the body including its braces, or null if not found
 */
export function balancedBody(text, decl) {
  const at =
    typeof decl === "string" ? text.indexOf(decl) : (text.match(decl)?.index ?? -1);
  if (at < 0) return null;

  let i = text.indexOf("(", at);
  if (i < 0) return null;
  for (let depth = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }

  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] === ":") {
    let angle = 0;
    for (i++; i < text.length; i++) {
      const c = text[i];
      if (c === "<") angle++;
      else if (c === ">") angle--;
      else if (c === "{" && angle === 0) break;
    }
  }

  i = text.indexOf("{", i);
  if (i < 0) return null;

  /* One more brace that is not the body: a return type written as a bare
     object rather than wrapped in a generic.
     `): Promise<{ users }> {` is handled by the angle depth above, but
     `): { AND?: ...; OR: ... } {` has no angles at all, so the loop stopped
     at the type's own opening brace and this function returned the TYPE.
     Found on `audienceWhere` (src/lib/posts.ts) while adopting this helper
     in place of four hand-rolled slicers, and it is the same failure the
     docblock above describes: a shape test that reads the wrong region and
     quietly asserts against nothing.
     How the two are told apart: match the brace, then look past it. If the
     next thing is another brace, the one just matched was a type and the
     body is the next one. */
  const close = matchBrace(text, i);
  if (close > 0) {
    const after = text.slice(close + 1).search(/\S/);
    if (after >= 0 && text[close + 1 + after] === "{") i = close + 1 + after;
  }
  const end = matchBrace(text, i);
  return end < 0 ? text.slice(i) : text.slice(i, end + 1);
}

/** The index of the `}` closing the `{` at `open`, or -1 if it never closes. */
function matchBrace(text, open) {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}
