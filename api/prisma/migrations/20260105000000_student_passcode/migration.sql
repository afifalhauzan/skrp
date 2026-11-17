-- 4-character A-Z0-9 passcode, unique per student. Nullable so existing rows survive;
-- `pnpm seed` fills it in. The CHECK keeps hand-edited rows within the format.
ALTER TABLE "students" ADD COLUMN "passcode" TEXT;
ALTER TABLE "students" ADD CONSTRAINT "students_passcode_format" CHECK ("passcode" ~ '^[A-Z0-9]{4}$');
CREATE UNIQUE INDEX "students_passcode_key" ON "students"("passcode");
