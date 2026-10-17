import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const methods = new Set(["نقدي", "تحويل بنكي", "بطاقة"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const paymentId = Number(value);
    const body = await request.json().catch(() => null);
    const requestedAmount = Number(body?.amount);
    const method = String(body?.method || "");
    const date = String(body?.date || "");
    if (!Number.isInteger(paymentId) || paymentId <= 0 || !Number.isInteger(requestedAmount) || requestedAmount <= 0 || !methods.has(method) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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
      await tx.paymentCollection.create({ data: { paymentId, amount, date, method, receiptNumber } });
      await tx.payment.update({ where: { id: paymentId }, data: { amount: nextAmount, totalAmount: total, status: nextAmount >= total ? "مدفوع" : "جزئي", date, method, receiptNumber } });
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

async function refreshDraftPayouts(month: string) {
  const courseInclude = {
    teacher: { select: { id: true } },
    packSubjects: {
      include: { subject: { include: { teacher: { select: { id: true } } } } },
    },
  } as const;
  const [payouts, collections] = await Promise.all([
    prisma.payout.findMany({ where: { month, status: "مسودة" } }),
    prisma.paymentCollection.findMany({
      where: { date: { startsWith: month } },
      include: {
        payment: {
          include: {
            course: { include: courseInclude },
            enrollment: { include: { course: { include: courseInclude } } },
          },
        },
      },
    }),
  ]);

  for (const payout of payouts) {
    const studentIds = new Set<number>();
    let revenue = 0;
    for (const collection of collections) {
      const payment = collection.payment;
      if (payment.status !== "مدفوع" && payment.status !== "جزئي") continue;
      const course = payment.course || payment.enrollment?.course;
      if (!course) continue;
      const subjects = course.type === "باقة"
        ? course.packSubjects.map((link) => link.subject)
        : [course];
      if (!subjects.length) continue;
      const teacherSubjects = subjects.filter((subject) => subject.teacher?.id === payout.teacherId);
      if (!teacherSubjects.length) continue;
      studentIds.add(payment.studentId);
      revenue += collection.amount * teacherSubjects.length / subjects.length;
    }
    const roundedRevenue = Math.round(revenue);
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        studentCount: studentIds.size,
        revenue: roundedRevenue,
        amount: Math.round(roundedRevenue * payout.commission / 100),
      },
    });
  }
}
