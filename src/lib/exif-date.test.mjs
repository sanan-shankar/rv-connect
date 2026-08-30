import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { exifDate, parseExifStamp } from "./exif-date.ts";

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

test("digitisation is the second choice", async () => {
  const exif = await exifBlock({ IFD2: { DateTimeDigitized: "2019:07:01 11:00:00" } });
  assert.deepEqual(exifDate(exif, THIS_YEAR), { year: 2019, month: 7 });
});

/* Last, and only last. Anything that re-saves a file rewrites IFD0's DateTime,
   so a photograph someone rotated last week claims last week. */
test("the file's own timestamp is the last resort", async () => {
  const exif = await exifBlock({ IFD0: { DateTime: "2020:11:02 08:00:00" } });
  assert.deepEqual(exifDate(exif, THIS_YEAR), { year: 2020, month: 11 });
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
