import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDraftPayouts } from "@/lib/payout-refresh";

type PaymentAction = "revise" | "draft" | "cancel";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const paymentId = Number(id);
    const body = await request.json().catch(() => null);
    const action = String(body?.action || "") as PaymentAction;
    const date = String(body?.date || "");
    const requestedAmount = Number(body?.amount);
    if (!Number.isInteger(paymentId) || paymentId <= 0 || !["revise", "draft", "cancel"].includes(action) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid payment adjustment" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { collections: true } });
      if (!payment) return null;
      const affectedMonths = new Set(payment.collections.map((collection) => collection.date.slice(0, 7)));
      const total = payment.totalAmount ?? payment.amount;

      if (action === "cancel") {
        if (payment.collections.length || payment.amount > 0 || payment.status !== "مسودة") return { conflict: true, affectedMonths: [] as string[] };
        await tx.payment.update({ where: { id: paymentId }, data: { amount: 0, status: "ملغاة", date: "", method: null, receiptNumber: null } });
      } else if (action === "draft") {
        await tx.paymentCollection.deleteMany({ where: { paymentId } });
        await tx.payment.update({ where: { id: paymentId }, data: { amount: 0, totalAmount: total, status: "مسودة", date: "", method: null, receiptNumber: null } });
      } else {
        if (!Number.isInteger(requestedAmount) || requestedAmount < 0 || requestedAmount > total) return { invalidAmount: true, affectedMonths: [] as string[] };
        const revisionDate = payment.collections
          .map((collection) => collection.date)
          .sort((left, right) => right.localeCompare(left))[0] || payment.date || date;
        await tx.paymentCollection.deleteMany({ where: { paymentId } });
        const receiptNumber = requestedAmount > 0
          ? payment.receiptNumber || `REC-${revisionDate.replaceAll("-", "")}-${paymentId}-${randomUUID().slice(0, 8)}`
          : null;
        if (requestedAmount > 0) {
          await tx.paymentCollection.create({ data: { paymentId, amount: requestedAmount, date: revisionDate, receiptNumber } });
          affectedMonths.add(revisionDate.slice(0, 7));
        }
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            amount: requestedAmount,
            totalAmount: total,
            status: requestedAmount >= total ? "مدفوع" : requestedAmount > 0 ? "جزئي" : "مسودة",
            date: requestedAmount > 0 ? revisionDate : "",
            method: null,
            receiptNumber,
          },
        });
      }

      const payments = await tx.payment.findMany({ where: { studentId: payment.studentId, status: { not: "ملغاة" } } });
      const due = payments.reduce((sum, item) => sum + Math.max(0, (item.totalAmount ?? item.amount) - item.amount), 0);
      const latestCollection = await tx.paymentCollection.findFirst({ where: { payment: { studentId: payment.studentId } }, orderBy: [{ date: "desc" }, { id: "desc" }] });
      await tx.student.update({ where: { id: payment.studentId }, data: { due, lastPayment: latestCollection?.date || "" } });
      return { affectedMonths: [...affectedMonths] };
    });

    if (!result) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if ("conflict" in result) return NextResponse.json({ error: "Only an unpaid draft can be cancelled" }, { status: 409 });
    if ("invalidAmount" in result) return NextResponse.json({ error: "Invalid revised amount" }, { status: 400 });
    await Promise.all(result.affectedMonths.filter(Boolean).map(refreshDraftPayouts));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to adjust payment" }, { status: 500 });
  }
}
