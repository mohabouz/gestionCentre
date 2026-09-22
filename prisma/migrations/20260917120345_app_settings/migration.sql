-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'CentMan',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'العربية',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "logo" TEXT
);
