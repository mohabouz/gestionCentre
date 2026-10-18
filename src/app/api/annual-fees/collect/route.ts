import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
    const body = await request.json().catch(() => null);
    const studentId = Number(body?.studentId);
    const year = Number(body?.year);
    const requestedAmount = Number(body?.amount);
    const date = String(body?.date || "");
    if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(year) || year < 2000 || year > 2200 || !Number.isInteger(requestedAmount) || requestedAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid annual fee information" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.subscriptionYear !== year || student.enrollmentFee <= 0) return null;
      const label = `رسوم الاشتراك ${year}`;
      let payment = await tx.payment.findFirst({ where: { studentId, month: label } });
      if (!payment) {
        payment = await tx.payment.create({ data: { studentId, amount: 0, totalAmount: student.enrollmentFee, month: label, status: "متأخر", date: "" } });
      }
      if (payment.status === "ملغاة") return null;
      const total = payment.totalAmount ?? student.enrollmentFee;
      const recorded = payment.totalAmount == null && payment.status === "متأخر" ? 0 : payment.amount;
      const amount = Math.min(requestedAmount, Math.max(0, total - recorded));
      if (!amount) return null;
      const nextAmount = recorded + amount;
      const receiptNumber = `REC-${date.replaceAll("-", "")}-${payment.id}-${randomUUID().slice(0, 8)}`;
      await tx.paymentCollection.create({ data: { paymentId: payment.id, amount, date, receiptNumber } });
      await tx.payment.update({ where: { id: payment.id }, data: { amount: nextAmount, totalAmount: total, status: nextAmount >= total ? "مدفوع" : "جزئي", date, method: null, receiptNumber } });
      const payments = await tx.payment.findMany({ where: { studentId, status: { not: "ملغاة" } } });
      const due = payments.reduce((sum, item) => {
        const paid = item.totalAmount == null && (item.status === "متأخر" || item.status === "مسودة") ? 0 : item.amount;
        return sum + Math.max(0, (item.totalAmount ?? item.amount) - paid);
      }, 0);
      await tx.student.update({ where: { id: studentId }, data: { due, lastPayment: date } });
      return { partial: nextAmount < total };
    });
    if (!result) return NextResponse.json({ error: "Annual fee is unavailable or already paid" }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to collect annual fee" }, { status: 500 });
  }
}
