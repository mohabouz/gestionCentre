import { NextResponse } from "next/server";
import { formatBillingMonth } from "@/lib/centman-store";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const studentId = Number(body?.studentId);
    const courseId = Number(body?.courseId);
    const enrolledAt = String(body?.enrolledAt || "");
    const requestedDiscount = Number(body?.discount || 0);
    if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(courseId) || courseId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(enrolledAt) || !Number.isFinite(requestedDiscount) || requestedDiscount < 0) {
      return NextResponse.json({ error: "Invalid enrollment information" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const [student, course, duplicate] = await Promise.all([
        tx.student.findUnique({ where: { id: studentId } }),
        tx.course.findUnique({ where: { id: courseId } }),
        tx.enrollment.findFirst({ where: { studentId, courseId, status: "نشط" } }),
      ]);
      if (!student || !course) return { missing: true };
      if (duplicate) return { duplicate: true };
      const discount = Math.max(0, Math.min(Math.round(requestedDiscount), course.price));
      const enrollment = await tx.enrollment.create({
        data: { studentId, courseId, enrolledAt, status: "نشط", source: "إضافة", discount },
      });
      const billingMonth = enrolledAt.slice(0, 7);
      const totalAmount = Math.max(0, course.price - discount);
      if (totalAmount > 0) {
        await tx.payment.create({
          data: {
            studentId,
            courseId,
            enrollmentId: enrollment.id,
            billingMonth,
            amount: 0,
            totalAmount,
            month: formatBillingMonth(billingMonth),
            status: "مسودة",
            date: "",
          },
        });
      }
      const payments = await tx.payment.findMany({ where: { studentId, status: { not: "ملغاة" } } });
      const due = payments.reduce((sum, payment) => sum + Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount), 0);
      await tx.student.update({ where: { id: studentId }, data: { due } });
      return { enrollment };
    });
    if ("missing" in result) return NextResponse.json({ error: "Student or course not found" }, { status: 404 });
    if ("duplicate" in result) return NextResponse.json({ error: "Student is already enrolled in this course" }, { status: 409 });
    return NextResponse.json(result.enrollment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create enrollment" }, { status: 500 });
  }
}
