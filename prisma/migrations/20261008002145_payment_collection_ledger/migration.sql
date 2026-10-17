-- CreateTable
CREATE TABLE "PaymentCollection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paymentId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "method" TEXT,
    "receiptNumber" TEXT,
    CONSTRAINT "PaymentCollection_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCollection_receiptNumber_key" ON "PaymentCollection"("receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentCollection_paymentId_date_idx" ON "PaymentCollection"("paymentId", "date");

-- CreateIndex
CREATE INDEX "PaymentCollection_date_idx" ON "PaymentCollection"("date");
