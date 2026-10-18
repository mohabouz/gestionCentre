import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDraftPayouts } from "@/lib/payout-refresh";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const paymentId = Number(value);
    const body = await request.json().catch(() => null);
    const requestedAmount = Number(body?.amount);
    const date = String(body?.date || "");
    if (!Number.isInteger(paymentId) || paymentId <= 0 || !Number.isInteger(requestedAmount) || requestedAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid payment information" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === "ملغاة") return null;
      const recorded = payment.totalAmount == null && (payment.status === "متأخر" || payment.status === "مسودة") ? 0 : payment.amount;
      const total = payment.totalAmount ?? payment.amount;
      const remaining = Math.max(0, total - recorded);
      const amount = Math.min(requestedAmount, remaining);
      if (!amount) return null;
      const nextAmount = recorded + amount;
      const receiptNumber = `REC-${date.replaceAll("-", "")}-${paymentId}-${randomUUID().slice(0, 8)}`;
      await tx.paymentCollection.create({ data: { paymentId, amount, date, receiptNumber } });
      await tx.payment.update({ where: { id: paymentId }, data: { amount: nextAmount, totalAmount: total, status: nextAmount >= total ? "مدفوع" : "جزئي", date, method: null, receiptNumber } });
      const studentPayments = await tx.payment.findMany({ where: { studentId: payment.studentId, status: { not: "ملغاة" } } });
      const due = studentPayments.reduce((sum, item) => {
        const paid = item.totalAmount == null && (item.status === "متأخر" || item.status === "مسودة") ? 0 : item.amount;
        return sum + Math.max(0, (item.totalAmount ?? item.amount) - paid);
      }, 0);
      await tx.student.update({ where: { id: payment.studentId }, data: { due, lastPayment: date } });
      return { partial: nextAmount < total };
    });
    if (!result) return NextResponse.json({ error: "Payment is already complete or unavailable" }, { status: 409 });
    await refreshDraftPayouts(date.slice(0, 7));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to register payment" }, { status: 500 });
  }
}
