-- Для существующих организаций: воскресенье (0) и суббота (6), 9:00–18:00, как у рабочих дней по умолчанию (540–1080 мин)
-- Только если у организации ещё нет ни одного окна в этот день

INSERT INTO "WeeklySlot" ("id", "organizationId", "dayOfWeek", "startMinutes", "endMinutes")
SELECT
  lower(hex(randomblob(16))),
  "o"."id",
  0,
  540,
  1080
FROM "Organization" AS "o"
WHERE NOT EXISTS (
  SELECT 1 FROM "WeeklySlot" AS "w"
  WHERE "w"."organizationId" = "o"."id" AND "w"."dayOfWeek" = 0
);

INSERT INTO "WeeklySlot" ("id", "organizationId", "dayOfWeek", "startMinutes", "endMinutes")
SELECT
  lower(hex(randomblob(16))),
  "o"."id",
  6,
  540,
  1080
FROM "Organization" AS "o"
WHERE NOT EXISTS (
  SELECT 1 FROM "WeeklySlot" AS "w"
  WHERE "w"."organizationId" = "o"."id" AND "w"."dayOfWeek" = 6
);
