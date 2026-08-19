import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = new URL("./tour-mobile-verify.mjs", import.meta.url);

test("authenticated mobile tour launches from admin via the exact hoopoe tour button", async () => {
  const source = await readFile(scriptPath, "utf8");

  assert.match(source, /requireLoopbackBaseUrl\(process\.argv\[2\]/);
  assert.match(source, /assertSameOriginAfterNavigation\(baseUrl, page\.url\(\)\)/);
  assert.match(source, /await fetch\(`\$\{baseUrl\}\/api\/dev-login`/);
  assert.doesNotMatch(source, /page\.evaluate\(async \(email\)/);
  assert.match(source, /page\.goto\(`\$\{baseUrl\}\/admin`/);
  assert.match(source, /b\.textContent\?\.trim\(\) === 'hoopoe tour'/);
  assert.match(source, /Could not find "hoopoe tour" button; retrying\./);
  assert.match(source, /console\.error\('admin nav warning:'/);
  assert.doesNotMatch(source, /Take the tour again/);
  assert.doesNotMatch(source, /about nav warning/);
});

test("authenticated mobile tour retains every tour stop check", async () => {
  const source = await readFile(scriptPath, "utf8");

  for (const stop of [
    "{ label: 'feed', route: '/feed' }",
    "{ label: 'directory', route: '/directory' }",
    "{ label: 'collection', route: '/collection' }",
    "{ label: 'catchups', route: '/catchups' }",
  ]) {
    assert.ok(source.includes(stop), `missing tour stop: ${stop}`);
  }
});
