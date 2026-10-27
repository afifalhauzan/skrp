-- Special accounts (e.g. VALIDATOR001) have no attendance number.
ALTER TABLE "students" ALTER COLUMN "attendanceNumber" DROP NOT NULL;
