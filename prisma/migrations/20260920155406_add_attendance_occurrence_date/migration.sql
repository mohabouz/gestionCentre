/*
  Warnings:

  - Added the required column `occurrenceDate` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "occurrenceDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("id", "sessionId", "status", "studentId") SELECT "id", "sessionId", "status", "studentId" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE INDEX "Attendance_occurrenceDate_idx" ON "Attendance"("occurrenceDate");
CREATE UNIQUE INDEX "Attendance_sessionId_studentId_occurrenceDate_key" ON "Attendance"("sessionId", "studentId", "occurrenceDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
