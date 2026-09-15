import assert from "node:assert/strict";
import test from "node:test";
import { skyFor, sunPosition, sunTimes, valleyClock, valleyDateAt } from "./_sun.ts";

/* Reference values reasoned from the geometry for 16 September 2026 at the
   school (13.634N 78.454E): solar noon about 12:11 IST, a day of about six
   hours six minutes each side. Ten minutes of slack, which is far tighter
   than anything a sky colour or a shadow could show. */

test("sunrise and sunset at the valley in mid-September", () => {
  const { sunrise, sunset } = sunTimes(new Date(Date.UTC(2026, 8, 16, 6, 0)));
  assert.ok(Math.abs(sunrise - 6.08) < 0.17, `sunrise ${sunrise}`);
  assert.ok(Math.abs(sunset - 18.28) < 0.17, `sunset ${sunset}`);
});

test("noon: high, near due south, and the sun is over the valley's own longitude", () => {
  const noon = sunPosition(valleyDateAt(new Date(Date.UTC(2026, 8, 16, 6, 0)), 12 + 11 / 60));
  assert.ok(noon.elevation > 77 && noon.elevation < 81, `elevation ${noon.elevation}`);
  assert.ok(Math.abs(noon.subsolar.lon - 78.45) < 2, `subsolar lon ${noon.subsolar.lon}`);
  assert.ok(Math.abs(noon.subsolar.lat - noon.declination) < 1e-9);
});

test("midnight is below the horizon and the clock reads IST", () => {
  const utc1830 = new Date(Date.UTC(2026, 8, 15, 18, 30));
  assert.equal(valleyClock(utc1830).label, "00:00");
  assert.ok(sunPosition(utc1830).elevation < -30);
});

test("the sky darkens as the sun drops", () => {
  const day = skyFor(40), dusk = skyFor(-4), night = skyFor(-18);
  assert.ok(day.strength > dusk.strength && dusk.strength > night.strength);
  assert.equal(night.night, 1);
  assert.equal(day.night, 0);
  assert.ok(skyFor(40, 1).strength < day.strength, "cloud dims the sun");
});
