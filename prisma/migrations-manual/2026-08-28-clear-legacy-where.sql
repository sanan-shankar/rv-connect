-- ------------------------------------------------------------------
-- Clearing the two legacy "Where in the valley?" answers.
--
-- The owner, twice: "firstly remove all tags in the current photos if
-- there are", then "i'm quite sure the banyan tree photo has a Banyan
-- Tree tag". He is right, and it is not a tag: it is `Photo.area`, the
-- answer to the "Where in the valley?" box he deleted from the contribute
-- form in the same round (handover D43). The viewer prints it above the
-- caption, where it reads exactly like a tag, and it is now the only
-- thing that can put one there -- nothing writes `area` any more.
--
-- Scoped to two ids on purpose rather than `WHERE area IS NOT NULL`.
-- These are the only two rows in the archive and they were both read
-- before this was written; naming them means this file cannot grow teeth
-- if it is ever re-run against a database that has since filled up.
--
-- THE OLD VALUES, so nothing is lost that cannot be typed back:
--   cmtacxnvd000004l78kflpwfr  area = 'asdf'             (caption 'asdf')
--   cmrwdkz4b000004ladkfu3jc6  area = 'Big Banyan Tree'  (caption "Standing in all it's glory")
--
-- The column itself stays. Search still reads it, the viewer still prints
-- it where a row has one, and an admin edit could still set it; it is
-- deprecated for new contributions, not deleted.
--
-- Apply with `node scripts/dev/run-sql.mjs`.
-- ------------------------------------------------------------------

UPDATE "Photo"
   SET "area" = NULL
 WHERE "id" IN (
   'cmtacxnvd000004l78kflpwfr',
   'cmrwdkz4b000004ladkfu3jc6'
 );
