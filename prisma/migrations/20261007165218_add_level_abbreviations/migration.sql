-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Level" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL DEFAULT '',
    "curriculum" TEXT NOT NULL DEFAULT 'MOROCCAN',
    "cycle" TEXT NOT NULL DEFAULT 'تأهيلي',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Level" ("code", "createdAt", "curriculum", "cycle", "id", "nameAr", "nameFr", "sortOrder") SELECT "code", "createdAt", "curriculum", "cycle", "id", "nameAr", "nameFr", "sortOrder" FROM "Level";
DROP TABLE "Level";
ALTER TABLE "new_Level" RENAME TO "Level";
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");
CREATE INDEX "Level_sortOrder_idx" ON "Level"("sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
