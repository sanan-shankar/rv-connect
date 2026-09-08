import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Nothing imports the image viewer directly. Everything goes through
 *  `lazy-image-viewer.tsx`.
 *
 *  WHY IT IS A TEST AND NOT A COMMENT. It already was a comment.
 *  `image-viewer.tsx` says, beside the reason its caption effect can run
 *  on the first render, that "nothing renders this on a server any more
 *  (every caller, the three lab rooms included, comes through
 *  common/lazy-image-viewer.tsx with `ssr: false`)". On 2026-09-07 the
 *  Catch-ups sketch room imported `ImageViewer` straight, and the last
 *  line of that component is
 *
 *      return createPortal(..., document.body)
 *
 *  with no early return in front of it. So every server render of a page
 *  holding a photograph threw `document is not defined`, React caught it,
 *  called the render RECOVERABLE, threw the server's whole tree away and
 *  started again on the client. Nothing turned red. The page looked
 *  right, the gates stayed green, and the only trace was one console line
 *  saying "Switched to client rendering because the server rendering
 *  errored" -- on an Edition thirty-four thousand pixels tall, rendered
 *  twice. It was found by driving a pressure fixture through the room,
 *  which is not a thing that happens on a schedule.
 *
 *  A `import type { ViewerImage }` is fine and four files use one: a type
 *  import is erased before the bundler sees it, so it pulls in no module
 *  and can render nothing.
 * ------------------------------------------------------------------ */

const VIEWER = "@/components/common/image-viewer";
const WRAPPER = join(ROOT, "src/components/common/lazy-image-viewer.tsx");

const files = walk(join(ROOT, "src"), {
  skip: (name) => SKIP_DIRS.includes(name),
}).filter((f) => /\.(ts|tsx)$/.test(f) && f !== WRAPPER);

test("only lazy-image-viewer imports the image viewer for its value", () => {
  /* Anti-vacuity: a moved directory or a changed matcher would make every
     assertion below pass over nothing. */
  assert.ok(
    files.length > 400,
    `the sweep found only ${files.length} source files; it is no longer reading the tree`,
  );

  const offenders = [];
  let typeImports = 0;
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    const src = decomment(read(rel));
    if (!src.includes(VIEWER)) continue;
    /* Every import statement that names the module, whatever its shape:
       `import X from`, `import { X } from`, `import type { X } from`. */
    /* `[^;]` rather than `[\s\S]`: an import statement ends at its
       semicolon, so this cannot start at an earlier `import` and swallow
       the three statements between it and this one, which the first cut
       did -- and which made every match look like a value import. */
    const statements = src.match(
      new RegExp(`import\\s[^;]{0,200}?from\\s+["']${VIEWER}["']`, "g"),
    );
    if (!statements) continue;
    for (const statement of statements) {
      if (/^import\s+type\b/.test(statement)) {
        typeImports += 1;
        continue;
      }
      offenders.push(`${rel}: ${statement.replace(/\s+/g, " ").slice(0, 90)}`);
    }
  }

  /* The second guard, and the one that would actually bite: if the module
     were renamed, the loop above would find nothing at all and say so by
     being silent. The four type imports are the sweep proving it looked. */
  assert.ok(
    typeImports >= 3,
    `only ${typeImports} files import a TYPE from the viewer; the sweep is reading the wrong path`,
  );

  assert.deepEqual(
    offenders,
    [],
    "these import the image viewer directly; use LazyImageViewer from " +
      "@/components/common/lazy-image-viewer, which is `ssr: false`, or the " +
      "portal will throw during server rendering and the page will silently " +
      "render twice:\n  " + offenders.join("\n  "),
  );
});
