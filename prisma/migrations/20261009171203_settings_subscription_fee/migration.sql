-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'CentMan',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'العربية',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionFee" INTEGER NOT NULL DEFAULT 200,
    "logo" TEXT
);
INSERT INTO "new_AppSettings" ("address", "id", "language", "logo", "name", "notifications", "phone") SELECT "address", "id", "language", "logo", "name", "notifications", "phone" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
