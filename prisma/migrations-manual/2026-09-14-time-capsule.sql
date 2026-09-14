-- A time capsule (build phase 14, spec.md 3.12).
--
-- His, 2026-09-09: "we should have maybe like a time capsule mode ... where it
-- will release the addition only one year later." And 2026-09-14: "33 time
-- capsule is just for one edition. 34b. 35 yes an edition can."
--
-- TWO COLUMNS, ONE REUSED, ONE CHECK, AND A NEW STATUS VALUE.
--
--   CatchupEdition.timeCapsule   marked while collecting; the close seals
--                                instead of publishing
--   CatchupEdition.sealedAt      when answering closed and it sealed
--   CatchupEdition.publishAt     when a sealed Edition opens. ALREADY IN BOTH
--                                DATABASES: it held the deleted `preparing`
--                                hold's time, and phase 11 kept it for this.
--                                The ADD below is a no-op there and a backstop
--                                anywhere it is missing.
--   status = 'sealed'            `status` is a free string, so the value needs
--                                no DDL. It sits between answering and
--                                published, and every reader in the app asks
--                                for 'published', so a sealed row is refused by
--                                all of them unchanged (his 34b: nothing in it
--                                is readable until it opens, your own answer
--                                included).
--
-- THE CHECK: a sealed row must be a capsule and carry both dates. A sealed row
-- with no opening date would sit sealed for ever, and one with the flag false
-- is a state no code path writes. Prisma cannot express a CHECK;
-- time-capsule-rule.test.mjs pins it.
--
-- NO INDEX for the nightly "which capsules are due" read: the table holds five
-- rows, the read is folded into a query already filtered by Catch-up, and an
-- index nobody needs is one more thing `migrate diff` cannot see.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. A column with a false default, a
-- nullable column, and a CHECK that every existing row passes (nothing is
-- sealed). Purely additive, nothing dropped.
--
-- IDEMPOTENT: IF NOT EXISTS on the columns, the CHECK added only when missing.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects, and the demo's clock reads CatchupEdition too.
--   node scripts/dev/export-catchups.mjs --write        (spec 3.1, first)
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-14-time-capsule.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-14-time-capsule.sql

ALTER TABLE "CatchupEdition" ADD COLUMN IF NOT EXISTS "timeCapsule" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CatchupEdition" ADD COLUMN IF NOT EXISTS "sealedAt" TIMESTAMP(3);
ALTER TABLE "CatchupEdition" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'CatchupEdition_sealed_is_a_capsule'
       AND conrelid = '"CatchupEdition"'::regclass
  ) THEN
    ALTER TABLE "CatchupEdition"
      ADD CONSTRAINT "CatchupEdition_sealed_is_a_capsule"
      CHECK (
        "status" <> 'sealed'
        OR ("timeCapsule" AND "sealedAt" IS NOT NULL AND "publishAt" IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'CatchupEdition' AND column_name = 'timeCapsule'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'CatchupEdition' AND column_name = 'sealedAt'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'CatchupEdition' AND column_name = 'publishAt'
  ) THEN
    RAISE EXCEPTION 'A time capsule column is missing; refusing to report success.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'CatchupEdition_sealed_is_a_capsule'
       AND conrelid = '"CatchupEdition"'::regclass
  ) THEN
    RAISE EXCEPTION 'CatchupEdition_sealed_is_a_capsule was not added; refusing to report success.';
  END IF;
END $$;

SELECT (SELECT count(*) FROM "CatchupEdition")                         AS editions,
       (SELECT count(*) FROM "CatchupEdition" WHERE "timeCapsule")       AS capsules,
       (SELECT count(*) FROM "CatchupEdition" WHERE "status" = 'sealed') AS sealed;
