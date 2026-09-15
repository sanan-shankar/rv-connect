import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { exifDate, exifFromPng, exifStamp, parseExifStamp } from "./exif-date.ts";
import { dateOnlyExif } from "./collection-image.ts";
import { crc32, deflateSync } from "node:zlib";

/* The date a photograph's own file claims is the only thing standing between
   this archive and the owner's 2026-08-30 arithmetic: 21 photographs, 3 with a
   year. So it is pinned against BYTES SHARP ACTUALLY WROTE rather than against
   a buffer this test hand-rolled to match the parser -- the interface being
   tested is "what comes back from sharp's metadata()", and a fixture built by
   the same reasoning as the reader would agree with a wrong reader. */

const THIS_YEAR = 2026;

/** A tiny JPEG carrying whatever EXIF was asked for, as its raw EXIF block.
 *  `IFD2` is sharp's name for the Exif sub-IFD. */
async function exifBlock(tags) {
  const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#234455" } })
    .withExif(tags)
    .jpeg()
    .toBuffer();
  return (await sharp(jpeg).metadata()).exif;
}

test("the shutter time is preferred to everything else", async () => {
  const exif = await exifBlock({
    IFD0: { DateTime: "2020:11:02 08:00:00" },
    IFD2: { DateTimeOriginal: "1998:03:14 09:12:00", DateTimeDigitized: "2019:07:01 11:00:00" },
  });
  assert.deepEqual(exifDate(exif, THIS_YEAR), { year: 1998, month: 3 });
});

/* On a camera Digitized equals Original, so alone it is a scanner's scan date.
   The write-back still keeps it (it preserves what the file said); the
   suggestion does not offer it (owner, 2026-09-15: "we don't want to suggest
   something wrong"). taken-date.test.mjs pins the full judgement. */
test("digitisation alone is kept in the file but not offered", async () => {
  const exif = await exifBlock({ IFD2: { DateTimeDigitized: "2019:07:01 11:00:00" } });
  assert.equal(exifStamp(exif, THIS_YEAR), "2019:07:01 11:00:00");
  assert.equal(exifDate(exif, THIS_YEAR), null);
});

/* Anything that re-saves a file rewrites IFD0's DateTime, so a photograph
   someone rotated last week claims last week. */
test("the file's own timestamp alone is kept in the file but not offered", async () => {
  const exif = await exifBlock({ IFD0: { DateTime: "2020:11:02 08:00:00" } });
  assert.equal(exifStamp(exif, THIS_YEAR), "2020:11:02 08:00:00");
  assert.equal(exifDate(exif, THIS_YEAR), null);
});

test("a photograph with no EXIF at all claims nothing", async () => {
  const plain = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#234455" },
  })
    .jpeg()
    .toBuffer();
  assert.equal(exifDate((await sharp(plain).metadata()).exif, THIS_YEAR), null);
});

/* THE ONE THAT MATTERS FOR THIS ARCHIVE. The owner's sidecar-merge tool writes
   recovered Google Takeout timestamps back into DateTimeOriginal, so a scanned
   print legitimately carries a year long before any camera wrote EXIF. A floor
   of "when digital cameras existed" would throw away the best dates here. */
test("a year older than any digital camera is still taken", async () => {
  const exif = await exifBlock({ IFD2: { DateTimeOriginal: "1963:08:09 00:00:00" } });
  assert.deepEqual(exifDate(exif, THIS_YEAR), { year: 1963, month: 8 });
});

test("a big-endian block reads the same as a little-endian one", () => {
  /* sharp only ever writes "II". Motorola order is half the spec and every
     scanner that emits it would otherwise be silently dateless, so it is built
     by hand here -- the one fixture that has to be. */
  const stamp = Buffer.from("2001:04:05 06:07:08\0", "ascii"); // 20 bytes
  const tiff = Buffer.alloc(8 + 2 + 12 + 4 + 2 + 12 + 4 + stamp.length);
  tiff.write("MM", 0, "ascii");
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4); // IFD0 begins straight after the header

  const sub = 8 + 2 + 12 + 4; // where the Exif sub-IFD begins
  tiff.writeUInt16BE(1, 8); // IFD0: one entry
  tiff.writeUInt16BE(0x8769, 10); // ExifIFDPointer
  tiff.writeUInt16BE(4, 12); // LONG
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt32BE(sub, 18);
  tiff.writeUInt32BE(0, 22); // no IFD1

  const at = sub + 2 + 12 + 4; // where the stamp's bytes sit
  tiff.writeUInt16BE(1, sub); // Exif IFD: one entry
  tiff.writeUInt16BE(0x9003, sub + 2); // DateTimeOriginal
  tiff.writeUInt16BE(2, sub + 4); // ASCII
  tiff.writeUInt32BE(stamp.length, sub + 6);
  tiff.writeUInt32BE(at, sub + 10);
  tiff.writeUInt32BE(0, sub + 14);
  stamp.copy(tiff, at);

  assert.deepEqual(exifDate(tiff, THIS_YEAR), { year: 2001, month: 4 });
  // And again behind the "Exif\0\0" marker a JPEG puts in front of it.
  assert.deepEqual(
    exifDate(Buffer.concat([Buffer.from("Exif\0\0", "ascii"), tiff]), THIS_YEAR),
    { year: 2001, month: 4 }
  );
});

/* This runs inside a contribution. A file that cannot be parsed is a
   photograph with no date, never a contribution that failed. */
test("nonsense never throws", () => {
  for (const bad of [
    undefined,
    Buffer.alloc(0),
    Buffer.from("not an exif block at all"),
    Buffer.from("Exif\0\0II\x2a\0\xff\xff\xff\xff", "latin1"), // IFD offset past the end
    Buffer.from("Exif\0\0II\x99\x99\x08\0\0\0", "latin1"), // wrong magic
  ]) {
    assert.equal(exifDate(bad, THIS_YEAR), null);
  }
});

test("an all-zero stamp is not a date", () => {
  assert.equal(parseExifStamp("0000:00:00 00:00:00", THIS_YEAR), null);
});

test("a year past this one is not a date", () => {
  assert.equal(parseExifStamp("2031:05:05 00:00:00", THIS_YEAR), null);
});

/* A month of 00 alongside a real year happens on scanners that only know the
   year. It is a year, not nothing -- dropping it would lose the exact case
   this whole mechanism exists for. */
test("a year with no usable month is still a year", () => {
  assert.deepEqual(parseExifStamp("1998:00:00 00:00:00", THIS_YEAR), {
    year: 1998,
    month: null,
  });
});

/* ------------------------------------------------------------------ *
 *  `exifStamp`: the same walk, handing back the string.
 *
 *  It exists so the stored copy can carry the date the camera wrote, to
 *  the second, instead of a day reconstructed from a year and a month --
 *  which would mean inventing one. The tests below pin the two things
 *  that makes true: the stamp comes back verbatim, and NOTHING ELSE
 *  travels with it.
 * ------------------------------------------------------------------ */

test("the stamp comes back verbatim, from the same tag exifDate would use", async () => {
  const exif = await exifBlock({
    IFD0: { DateTime: "2020:11:02 08:00:00" },
    IFD2: { DateTimeOriginal: "1998:03:14 09:12:00" },
  });
  assert.equal(exifStamp(exif, THIS_YEAR), "1998:03:14 09:12:00");
  /* And the two agree by construction: exifDate is now built on it. */
  assert.deepEqual(exifDate(exif, THIS_YEAR), { year: 1998, month: 3 });
});

test("a stamp the archive would not file is not handed back either", async () => {
  const exif = await exifBlock({ IFD2: { DateTimeOriginal: "2031:05:05 00:00:00" } });
  assert.equal(exifStamp(exif, THIS_YEAR), null);
  assert.equal(exifStamp(undefined, THIS_YEAR), null);
});

/* THE ONE THAT MATTERS. A phone photograph carries GPS, and publishing a
   member's coordinates is what audit M12 exists to stop. The Collection now
   writes ONE tag back into the stored copy, and this pins that the copy comes
   out with the date and without the latitude -- against bytes sharp actually
   wrote, end to end, rather than against an assertion about the code. */
test("the stored copy keeps the date and loses the coordinates", async () => {
  const original = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#234455" },
  })
    .withExif({
      IFD2: { DateTimeOriginal: "2019:03:14 09:12:00" },
      IFD3: { GPSLatitude: "13/1 38/1 0/1", GPSLatitudeRef: "N" },
    })
    .jpeg()
    .toBuffer();

  /* THE REAL `dateOnlyExif`, not a hand-built stand-in of its shape. This
     test used to compose the allow-list itself, because the function lived in
     collection-photo.ts and that file imports through the `@/lib` alias a
     plain .test.mjs cannot resolve; it has moved to collection-image.ts,
     which is alias-free for exactly this reason. So what is pinned below is
     now the block the app actually writes. */
  const keepDate = await dateOnlyExif(original);
  assert.deepEqual(keepDate, { IFD2: { DateTimeOriginal: "2019:03:14 09:12:00" } });

  const stored = await sharp(original)
    .rotate()
    .webp({ quality: 90 })
    .withExif(keepDate)
    .toBuffer();

  assert.equal(
    exifStamp((await sharp(stored).metadata()).exif, THIS_YEAR),
    "2019:03:14 09:12:00"
  );

  /* The GPS tag numbers, spelled out rather than imported, because the reader
     under test deliberately does not know they exist. 0x8825 is IFD0's pointer
     to the GPS IFD and 0x0002 is the latitude inside it. */
  const block = (await sharp(stored).metadata()).exif;
  assert.ok(block, "the stored copy has no EXIF block at all");
  assert.equal(block.includes(Buffer.from([0x25, 0x88])), false, "a GPS IFD pointer survived the re-encode");

  /* And the whole block is small enough that it cannot be carrying a GPS IFD:
     one ASCII date tag plus its IFD headers is under 200 bytes, while the
     original's block above is larger. A size assertion is the honest form of
     "nothing else came along" for a reader that cannot enumerate tags. */
  assert.ok(block.length < 200, `stored EXIF block is ${block.length} bytes, expected only a date`);
});

/* ------------------------------------------------------------------ *
 *  PNG, where the block is not where sharp looks.
 *
 *  `metadata().exif` comes back empty for a PNG that exiftool reads a
 *  DateTimeOriginal out of without difficulty, and the archive filed
 *  three of the owner's photographs undated because of it. These pin the
 *  container reader that closes it -- against a PNG sharp actually
 *  encoded, carrying a block sharp actually built, so neither half is a
 *  fixture agreeing with the code that produced it.
 * ------------------------------------------------------------------ */

/** One PNG chunk, with a real CRC over type+body. sharp validates it. */
function pngChunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** Splice a chunk in AFTER IHDR, which the spec requires to come first: put it
 *  before and sharp rejects the whole file as a corrupt header, which would
 *  make the premise below untestable rather than true. */
function pngWithChunk(png, chunk) {
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}

/** ImageMagick's hex text profile: a newline, a name, a length, then the hex. */
function rawProfile(block) {
  return Buffer.from(
    `\ngeneric profile\n${String(block.length).padStart(8)}\n${block.toString("hex")}\n`,
    "latin1"
  );
}

/** A zTXt chunk carrying a hex EXIF profile, the way Apple and ImageMagick write it. */
function rawProfileChunk(block, keyword = "Raw profile type APP1") {
  return pngChunk(
    "zTXt",
    Buffer.concat([
      Buffer.from(keyword, "latin1"),
      Buffer.from([0, 0]), // NUL terminator, then the compression method byte
      deflateSync(rawProfile(block)),
    ])
  );
}

async function plainPng() {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: "#234455" } })
    .png()
    .toBuffer();
}

test("a PNG's date is found in a deflated Raw profile chunk", async () => {
  const block = await exifBlock({ IFD2: { DateTimeOriginal: "2020:06:28 19:36:46" } });
  const png = pngWithChunk(await plainPng(), rawProfileChunk(block));

  /* THE PREMISE, ASSERTED RATHER THAN ASSUMED. If sharp ever learns to read
     this chunk, the fallback stops being needed and this line is how anybody
     finds out -- rather than the fallback quietly shadowing it for ever. */
  assert.equal((await sharp(png).metadata()).exif, undefined);

  const found = exifFromPng(png);
  assert.ok(found, "the reader did not find the block sharp missed");
  assert.equal(exifStamp(found, THIS_YEAR), "2020:06:28 19:36:46");
  assert.deepEqual(exifDate(found, THIS_YEAR), { year: 2020, month: 6 });
});

test("the other keyword writers use is read too", async () => {
  const block = await exifBlock({ IFD2: { DateTimeOriginal: "2001:09:11 06:30:00" } });
  const png = pngWithChunk(await plainPng(), rawProfileChunk(block, "Raw profile type exif"));
  assert.deepEqual(exifDate(exifFromPng(png) ?? undefined, THIS_YEAR), { year: 2001, month: 9 });
});

test("a PNG's date is found in the modern eXIf chunk too", async () => {
  const block = await exifBlock({ IFD2: { DateTimeOriginal: "1998:03:14 09:12:00" } });
  const png = pngWithChunk(await plainPng(), pngChunk("eXIf", block));
  assert.deepEqual(exifDate(exifFromPng(png) ?? undefined, THIS_YEAR), { year: 1998, month: 3 });
});

test("a PNG with no profile, and a file that is not a PNG, are simply undated", async () => {
  assert.equal(exifFromPng(await plainPng()), null);
  assert.equal(exifFromPng(Buffer.from("not a png at all")), null);
  assert.equal(exifFromPng(Buffer.alloc(0)), null);
});

/* Truncation and rubbish reach this from an upload, so it must return nothing
   rather than throw out of the middle of a contribution. */
test("a malformed PNG is undated, never an exception", async () => {
  const rubbish = pngChunk(
    "zTXt",
    Buffer.concat([Buffer.from("Raw profile type APP1", "latin1"), Buffer.from([0, 0]), Buffer.from("not deflate data")])
  );
  assert.equal(exifFromPng(pngWithChunk(await plainPng(), rubbish)), null);

  const block = await exifBlock({ IFD2: { DateTimeOriginal: "2020:06:28 19:36:46" } });
  const good = pngWithChunk(await plainPng(), rawProfileChunk(block));
  /* Cut the file off inside the profile chunk: the declared length now runs
     past the end, which is the bounds check the reader exists to survive. */
  assert.equal(exifFromPng(good.subarray(0, 60)), null, "a truncated file should not resolve");
});
