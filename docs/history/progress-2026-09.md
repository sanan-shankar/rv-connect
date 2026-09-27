


## 2026-09-27 (collection) — the drop box names all three ways in, and paste reads the clipboard the reliable way

Owner: "we should say add your photographs. We should say drag and drop, [...] paste or click to
browse [...] Because right now, I just click on it." The drop box now reads "Add your photographs",
then "Drag and drop, paste, or click to browse" with a cursor, "Tap to choose from your photos" on a
phone. This reverses the 2026-08-29 trim that left paste unsaid; DESIGN-SYSTEM's dialog rule records
the one exception. Paste read `clipboardData.files`, which not every browser fills; it now uses the
composer's `imagesFromDataTransfer` (`.items`), exported for it. Verified at 1440 and 390, and a
synthetic paste of a generated PNG was staged. Note: staging starts a direct upload, so that test
square may sit under `staging/` in R2 until the lifecycle rule clears it; it was never added. check green.
