import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { formatBillingMonth } from "@/lib/centman-store";

type RegistrationInput = {
  name: string; phone: string; whatsapp?: string; status: string;
  enrollmentDate?: string; enrollmentFee: number; subscriptionYear?: number;
  courseIds: number[];
  paidAmounts: { annual: number; courses: Record<number, number>; discounts: Record<number, number> };
  date: string;
};

export function parseRegistrationInput(body: unknown): RegistrationInput | null {
  const value = body as Record<string, unknown> | null;
  const student = value?.student as Record<string, unknown> | undefined;
  const paid = value?.paidAmounts as Record<string, unknown> | undefined;
  const courseIds = Array.isArray(value?.courseIds) ? [...new Set(value.courseIds.map(Number))] : [];
  const annual = Number(paid?.annual || 0);
  const courses = numericRecord(paid?.courses);
  const discounts = numericRecord(paid?.discounts);
  const input = {
    name: String(student?.name || "").trim(), phone: String(student?.phone || "").trim(),
    whatsapp: String(student?.whatsapp || "").trim() || undefined,
    status: String(student?.status || "نشط"), enrollmentDate: String(student?.enrollmentDate || "") || undefined,
    enrollmentFee: Number(student?.enrollmentFee || 0), subscriptionYear: student?.subscriptionYear ? Number(student.subscriptionYear) : undefined,
    courseIds, paidAmounts: { annual, courses, discounts }, date: String(value?.date || ""),
  };
  if (!input.name || !input.phone || !courseIds.length || courseIds.some((id) => !Number.isInteger(id) || id <= 0) || !Number.isInteger(input.enrollmentFee) || input.enrollmentFee < 0 || !Number.isFinite(annual) || annual < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  return input;
}

function numericRecord(value: unknown): Record<number, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, raw]) => {
      const id = Number(key);
      const amount = Number(raw);
      return Number.isInteger(id) && id > 0 && Number.isFinite(amount) && amount >= 0
        ? [[id, amount]]
        : [];
    }),
  );
}

export async function saveStudentRegistration(tx: Prisma.TransactionClient, input: RegistrationInput, studentId?: number) {
  const courses = await tx.course.findMany({ where: { id: { in: input.courseIds } } });
  if (courses.length !== input.courseIds.length) return null;
  const existing = studentId ? await tx.student.findUnique({ where: { id: studentId } }) : null;
  if (studentId && !existing) return null;
  const studentData = { name: input.name, phone: input.phone, whatsapp: input.whatsapp, status: input.status, enrollmentDate: input.enrollmentDate, enrollmentFee: input.enrollmentFee, subscriptionYear: input.subscriptionYear };
  const student = existing ? await tx.student.update({ where: { id: studentId }, data: studentData }) : await tx.student.create({ data: studentData });
  const active = await tx.enrollment.findMany({ where: { studentId: student.id, status: "نشط" } });
  for (const enrollment of active) {
    if (!input.courseIds.includes(enrollment.courseId)) await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: "منتهية", removedAt: input.date } });
    else {
      const course = courses.find((item) => item.id === enrollment.courseId)!;
      const discount = Math.max(0, Math.min(Number(input.paidAmounts.discounts[course.id] || 0), course.price));
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { discount } });
      await tx.payment.updateMany({ where: { enrollmentId: enrollment.id, status: "مسودة" }, data: { totalAmount: Math.max(0, course.price - discount) } });
    }
  }
  const enrollmentByCourse = new Map(active.map((item) => [item.courseId, item]));
  for (const course of courses) {
    if (!enrollmentByCourse.has(course.id)) {
      const discount = Math.max(0, Math.min(Number(input.paidAmounts.discounts[course.id] || 0), course.price));
      const enrollment = await tx.enrollment.create({ data: { studentId: student.id, courseId: course.id, enrolledAt: input.date, status: "نشط", source: existing ? "إضافة" : "اشتراك أول", discount } });
      enrollmentByCourse.set(course.id, enrollment);
    }
  }
  const yearChanged = Boolean(existing && input.subscriptionYear && existing.subscriptionYear !== input.subscriptionYear);
  if (!existing || yearChanged) await createCharge(tx, student.id, null, null, `رسوم الاشتراك ${input.subscriptionYear || new Date(input.date).getFullYear()}`, input.enrollmentFee, input.paidAmounts.annual, input.date);
  if (!existing) for (const course of courses) {
    const enrollment = enrollmentByCourse.get(course.id)!;
    const total = Math.max(0, course.price - enrollment.discount);
    await createCharge(tx, student.id, course.id, enrollment.id, formatBillingMonth(input.date.slice(0, 7)), total, Number(input.paidAmounts.courses[course.id] || 0), input.date, input.date.slice(0, 7));
  }
  const payments = await tx.payment.findMany({ where: { studentId: student.id, status: { not: "ملغاة" } } });
  const due = payments.reduce((sum, payment) => sum + Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount), 0);
  const paid = payments.some((payment) => payment.date === input.date && payment.amount > 0);
  return tx.student.update({ where: { id: student.id }, data: { due, ...(paid ? { lastPayment: input.date } : {}) } });
}

async function createCharge(tx: Prisma.TransactionClient, studentId: number, courseId: number | null, enrollmentId: number | null, month: string, total: number, requested: number, date: string, billingMonth?: string) {
  if (total <= 0) return;
  const amount = Math.max(0, Math.min(requested, total));
  const receiptNumber = amount ? `REC-${date.replaceAll("-", "")}-${randomUUID().slice(0, 10)}` : null;
  const payment = await tx.payment.create({ data: { studentId, courseId, enrollmentId, billingMonth, amount, totalAmount: total, month, status: amount >= total ? "مدفوع" : amount > 0 ? "جزئي" : "متأخر", date: amount ? date : "", receiptNumber } });
  if (amount) await tx.paymentCollection.create({ data: { paymentId: payment.id, amount, date, receiptNumber } });
}
