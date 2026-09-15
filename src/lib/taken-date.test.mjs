import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { crc32, deflateSync } from "node:zlib";
import { filenameDate, judgeTakenDate } from "./taken-date.ts";
import { takenDateOfFile } from "./file-taken-date.ts";

/* The date offered as a one-press suggestion when a photograph lands, and in
   the review room. The owner, 2026-09-15: "we don't want to suggest something
   wrong and then people might be inclined to just click that instead of think
   actually when it was". So most of these pin a SILENCE: a way a real file
   lies, and the proof that it is not offered. */

const THIS_YEAR = 2026;

const judge = (tags, fileName) =>
  judgeTakenDate({
    tags: tags && {
      original: null,
      digitized: null,
      modified: null,
      make: null,
      model: null,
      software: null,
      ...tags,
    },
    fileName,
    thisYear: THIS_YEAR,
  });

/* ---------------- the judgement ---------------- */

/* A real one from the owner's folder: shot on a Nikon D3000 on 28 December
   2011, touched up in GIMP the next August. */
test("the shutter time wins over a later save", () => {
  assert.deepEqual(
    judge({
      original: "2011:12:28 18:27:46",
      digitized: "2011:12:28 18:27:46",
      modified: "2012:08:31 00:23:03",
      make: "NIKON CORPORATION",
      model: "NIKON D3000",
      software: "GIMP 2.6.11",
    }),
    { year: 2011, month: 12 }
  );
});

test("a scan date or a save date on its own is not offered", () => {
  assert.equal(judge({ digitized: "2019:07:01 11:00:00" }), null);
  assert.equal(judge({ modified: "2020:11:02 08:00:00" }), null);
  assert.equal(judge(null), null);
});

test("nothing a scanner wrote is offered, even as a shutter time", () => {
  assert.equal(judge({ original: "2019:03:14 09:12:00", make: "EPSON", model: "Perfection V600" }), null);
  assert.equal(judge({ original: "2019:03:14 09:12:00", model: "CanoScan LiDE 400" }), null);
  assert.equal(judge({ original: "2019:03:14 09:12:00", software: "VueScan 9.7.50" }), null);
  assert.equal(judge({ original: "2019:03:14 09:12:00", model: "Nikon SUPER COOLSCAN 5000 ED" }), null);
});

test("a camera clock that was never set is not offered", () => {
  assert.equal(judge({ original: "1970:01:01 00:03:12" }), null);
  assert.equal(judge({ original: "1980:01:04 10:00:00" }), null);
});

/* The owner's sidecar-merge tool writes recovered dates into scanned prints,
   so an old year is not suspicious in itself. */
test("an old year that is not a clock epoch is still offered", () => {
  assert.deepEqual(judge({ original: "1978:03:14 09:12:00" }), { year: 1978, month: 3 });
  assert.deepEqual(judge({ original: "1970:06:02 17:00:00" }), { year: 1970, month: 6 });
});

/* Exactly what was written onto the owner's undated 2009 photograph by hand. */
test("1 January at midnight is a year someone knew, not a month", () => {
  assert.deepEqual(judge({ original: "2009:01:01 00:00:00" }), { year: 2009, month: null });
  // A camera on New Year's Day writes a real time, and keeps its month.
  assert.deepEqual(judge({ original: "2009:01:01 00:04:31" }), { year: 2009, month: 1 });
});

test("future and zero stamps are not dates", () => {
  assert.equal(judge({ original: "2031:05:05 00:00:00" }), null);
  assert.equal(judge({ original: "0000:00:00 00:00:00" }), null);
});

test("a file name that agrees with the camera changes nothing", () => {
  assert.deepEqual(
    judge({ original: "2018:12:10 09:07:56" }, "IMG_20181210_090756.jpg"),
    { year: 2018, month: 12 }
  );
  // Either side of midnight across a month, a time zone apart, still agrees.
  assert.deepEqual(
    judge({ original: "2018:12:31 23:30:00" }, "IMG_20190101_053000.jpg"),
    { year: 2018, month: 12 }
  );
});

test("a file name that contradicts the camera silences both", () => {
  assert.equal(judge({ original: "2015:08:08 15:07:36" }, "IMG_20180101_101010.jpg"), null);
});

test("a camera's own file name stands in when the EXIF is gone", () => {
  assert.deepEqual(judge(null, "PXL_20230704_101112345.jpg"), { year: 2023, month: 7 });
  assert.deepEqual(judge(null, "20190314_091200.jpg"), { year: 2019, month: 3 });
  assert.deepEqual(judge(null, "2016-02-27 17.23.52.jpg"), { year: 2016, month: 2 });
});

test("names whose date is not when the picture was taken say nothing", () => {
  for (const name of [
    "IMG-20181210-WA0001.jpg",
    "Screenshot 2020-03-14 at 09.12.00.png",
    "Screen Shot 2019-03-14 at 9.12.00 AM.png",
    "Scan_20190314.jpg",
  ]) {
    assert.equal(judge(null, name), null, name);
  }
});

/* Every one of these is a real name from the owner's folder or a common camera. */
test("counters and bare years are not dates", () => {
  for (const name of [
    "Astha_Megha_Upadhyaya_ISC_2009.jpg",
    "DSC03783.JPG",
    "IMG_6263.JPG",
    "_VAB0986.JPG",
    "SportsDay14-055.jpg",
    "P1020304.JPG",
    "DSCN7296 (2).JPG",
  ]) {
    assert.equal(filenameDate(name, THIS_YEAR), null, name);
  }
});

/* ---------------- the containers, in the browser's own terms ---------------- */

const pixels = () => sharp({ create: { width: 8, height: 8, channels: 3, background: "#234455" } });

/** A File the way the contribute pop-up receives one, stamped with the COPY
 *  date the owner's folder carried, so every container test also proves that
 *  date is never the one read. */
const COPIED_IN_2020 = Date.UTC(2020, 8, 9);
const asFile = (bytes, name) => new File([bytes], name, { lastModified: COPIED_IN_2020 });

test("a JPEG's shutter time is read, and the copy date never is", async () => {
  const jpeg = await pixels().withExif({ IFD2: { DateTimeOriginal: "2011:12:31 13:40:02" } }).jpeg().toBuffer();
  assert.deepEqual(await takenDateOfFile(asFile(jpeg, "DSC09520.JPG")), { year: 2011, month: 12 });

  const plain = await pixels().jpeg().toBuffer();
  assert.equal(await takenDateOfFile(asFile(plain, "DSC09520.JPG")), null);
});

test("a JPEG whose EXIF sits behind another segment is still read", async () => {
  const jpeg = await pixels().withExif({ IFD2: { DateTimeOriginal: "2014:06:30 17:22:42" } }).jpeg().toBuffer();
  /* A 60KB APP13 straight after SOI, the size a Photoshop block can reach. */
  const segment = Buffer.alloc(4 + 60_000);
  segment[0] = 0xff;
  segment[1] = 0xed;
  segment.writeUInt16BE(60_002, 2);
  const shuffled = Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
  assert.deepEqual(await takenDateOfFile(asFile(shuffled, "DSC08431.JPG")), { year: 2014, month: 6 });
});

test("a WebP's EXIF chunk is read", async () => {
  const webp = await pixels().withExif({ IFD2: { DateTimeOriginal: "2016:02:27 17:23:52" } }).webp().toBuffer();
  assert.deepEqual(await takenDateOfFile(asFile(webp, "IMG_6263.webp")), { year: 2016, month: 2 });
});

function pngChunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** After IHDR, which the spec requires to come first. */
function pngWithChunk(png, chunk) {
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}

test("a PNG's date is read from the hex text profile and from eXIf", async () => {
  const block = (await sharp(
    await pixels().withExif({ IFD2: { DateTimeOriginal: "2020:06:28 19:36:46" } }).jpeg().toBuffer()
  ).metadata()).exif;
  const png = await pixels().png().toBuffer();

  const text = Buffer.from(`\ngeneric profile\n${String(block.length).padStart(8)}\n${block.toString("hex")}\n`, "latin1");
  const zTXt = pngChunk(
    "zTXt",
    Buffer.concat([Buffer.from("Raw profile type APP1", "latin1"), Buffer.from([0, 0]), deflateSync(text)])
  );
  assert.deepEqual(await takenDateOfFile(asFile(pngWithChunk(png, zTXt), "photo.png")), { year: 2020, month: 6 });

  assert.deepEqual(
    await takenDateOfFile(asFile(pngWithChunk(png, pngChunk("eXIf", block)), "photo.png")),
    { year: 2020, month: 6 }
  );
});

test("a file that is not an image, or is cut short, has no suggestion and never throws", async () => {
  const jpeg = await pixels().withExif({ IFD2: { DateTimeOriginal: "2011:12:31 13:40:02" } }).jpeg().toBuffer();
  for (const bytes of [Buffer.from("not a photograph"), Buffer.alloc(0), jpeg.subarray(0, 40)]) {
    assert.equal(await takenDateOfFile(asFile(bytes, "DSC09520.JPG")), null);
  }
  const brokenPng = pngWithChunk(
    await pixels().png().toBuffer(),
    pngChunk("zTXt", Buffer.concat([Buffer.from("Raw profile type APP1", "latin1"), Buffer.from([0, 0]), Buffer.from("not deflate")]))
  );
  assert.equal(await takenDateOfFile(asFile(brokenPng, "photo.png")), null);
});
