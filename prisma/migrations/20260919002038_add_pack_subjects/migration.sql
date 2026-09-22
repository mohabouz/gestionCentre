-- CreateTable
CREATE TABLE "PackSubject" (
    "packId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,

    PRIMARY KEY ("packId", "subjectId"),
    CONSTRAINT "PackSubject_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PackSubject_subjectId_idx" ON "PackSubject"("subjectId");
