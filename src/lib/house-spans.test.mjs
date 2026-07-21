import assert from "node:assert/strict";
import test from "node:test";

import { academicSpanLabel, seedHouseYearRows } from "./house-spans.ts";

test("seedHouseYearRows stops before the leaving year", () => {
  const rows = seedHouseYearRows(null, 2014, 2023);

  assert.deepEqual(
    rows.map((row) => row.year),
    [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022]
  );
});

test("seeded house rows end with the final academic year attended", () => {
  const rows = seedHouseYearRows(null, 2014, 2023);
  const finalRow = rows.at(-1);

  assert.equal(rows.length, 9);
  assert.equal(finalRow && academicSpanLabel(finalRow.year, finalRow.year), "2022-23");
});

test("seedHouseYearRows drops a previously saved entry in the leaving year", () => {
  const raw = JSON.stringify([
    { year: 2022, house: "Aravali" },
    { year: 2023, house: "Aravali" },
  ]);

  const rows = seedHouseYearRows(raw, 2014, 2023);

  assert.equal(rows.length, 9);
  assert.deepEqual(rows.at(-1), { year: 2022, houses: ["Aravali"] });
});
