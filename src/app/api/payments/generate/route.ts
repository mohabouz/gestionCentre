import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { formatBillingMonth } from "@/lib/centman-store";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
    const body = await request.json().catch(() => null);
    const month = String(body?.month || "");
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid billing month" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const enrollments = await tx.enrollment.findMany({ include: { course: true } });
      const eligible = enrollments.filter((enrollment) => {
        const enrolledMonth = enrollment.enrolledAt.slice(0, 7);
        const removedMonth = enrollment.removedAt?.slice(0, 7);
        return enrolledMonth <= month && (removedMonth ? removedMonth >= month : enrollment.status === "نشط");
      });
      const existing = await tx.payment.findMany({ where: { enrollmentId: { in: eligible.map((item) => item.id) }, billingMonth: month }, select: { enrollmentId: true } });
      const existingIds = new Set(existing.map((payment) => payment.enrollmentId));
      const missing = eligible.filter((enrollment) => !existingIds.has(enrollment.id));
      if (missing.length) {
        await tx.payment.createMany({ data: missing.map((enrollment) => ({
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          enrollmentId: enrollment.id,
          billingMonth: month,
          amount: 0,
          totalAmount: Math.max(0, enrollment.course.price - Math.max(0, Math.min(enrollment.discount, enrollment.course.price))),
          month: formatBillingMonth(month),
          status: "مسودة",
          date: "",
        })) });
      }
      for (const studentId of new Set(missing.map((item) => item.studentId))) {
        const payments = await tx.payment.findMany({ where: { studentId, status: { not: "ملغاة" } } });
        const due = payments.reduce((sum, payment) => sum + Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount), 0);
        await tx.student.update({ where: { id: studentId }, data: { due } });
      }
      return missing.length;
    });
    return NextResponse.json({ created });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate monthly payments" }, { status: 500 });
  }
}
