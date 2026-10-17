-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER,
    "enrollmentId" INTEGER,
    "amount" INTEGER NOT NULL,
    "totalAmount" INTEGER,
    "month" TEXT NOT NULL,
    "billingMonth" TEXT,
    "status" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "method" TEXT,
    "receiptNumber" TEXT,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "date", "id", "method", "month", "receiptNumber", "status", "studentId", "totalAmount") SELECT "amount", "date", "id", "method", "month", "receiptNumber", "status", "studentId", "totalAmount" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
CREATE INDEX "Payment_studentId_status_idx" ON "Payment"("studentId", "status");
CREATE INDEX "Payment_date_idx" ON "Payment"("date");
CREATE INDEX "Payment_courseId_idx" ON "Payment"("courseId");
CREATE UNIQUE INDEX "Payment_enrollmentId_billingMonth_key" ON "Payment"("enrollmentId", "billingMonth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
