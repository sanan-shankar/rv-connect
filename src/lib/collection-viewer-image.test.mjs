import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  One mapping from a Collection photograph to the shared viewer.
 *
 *  WHY IT IS A TEST AND NOT A LIST. There were three copies, and the two
 *  in the lab rooms were the ones that had drifted -- no alt text, no
 *  free tags, the raw `area` value instead of its label -- in rooms whose
 *  own headers promise that every component on the page is "the REAL
 *  one". A room that draws a photograph the site does not draw is a room
 *  answering a design question about something else.
 *
 *  A LIST OF THE THREE FILES WOULD NOT HAVE CAUGHT THE THIRD. The lab
 *  copy came from the shipped one by paste, so the next one will too.
 *  This walks every .ts/.tsx file under src/ and refuses the shape rather
 *  than the filenames: a `href: \`/collection/${...}\`` inside an object
 *  literal is a viewer mapping, wherever it is written.
 * ------------------------------------------------------------------ */

const HOME = "src/lib/collection-viewer-image.ts";

/** The one line that only a photograph-to-viewer mapping has. */
const MAPPING = /href:\s*`\/collection\/\$\{/;

test("only collection-viewer-image.ts maps a photograph into the viewer", () => {
  const files = walk(join(ROOT, "src"), { skip: (n) => SKIP_DIRS.includes(n) }).filter((f) =>
    /\.tsx?$/.test(f)
  );

  // The guard the sweep needs: a filter or a walk that silently returns
  // nothing would pass this test for ever.
  assert.ok(files.length > 400, `only ${files.length} source files walked; the walk is broken`);

  const offenders = [];
  let found = 0;
  for (const file of files) {
    const rel = file.slice(ROOT.length + 1);
    if (!MAPPING.test(decomment(read(rel)))) continue;
    found += 1;
    if (rel !== HOME) offenders.push(rel);
  }

  assert.equal(found, 1, `expected exactly one viewer mapping, found ${found}`);
  assert.deepEqual(
    offenders,
    [],
    `these files hand-roll the viewer mapping instead of importing toViewerImage ` +
      `from ${HOME}:\n  ${offenders.join("\n  ")}`
  );
});
