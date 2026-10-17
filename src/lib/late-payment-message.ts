import { courseLevelLabel } from "@/lib/course-level";
import type {
  Course,
  Enrollment,
  Level,
  Payment,
  Student,
} from "@/lib/centman-store";
import { money } from "@/lib/centman-store";
import { remainingPaymentAmount } from "@/lib/monthly-billing";
import {
  paymentMonthLabel,
  resolvePaymentCourse,
} from "@/lib/payment-display";

export function latePaymentMessage({
  student,
  payments,
  courses,
  enrollments,
  levels,
}: {
  student: Student;
  payments: Payment[];
  courses: Course[];
  enrollments: Enrollment[];
  levels: Level[];
}) {
  const details = payments.flatMap((payment) => {
    const specialCharge = /رسوم|اشتراك سنوي/.test(payment.month)
      ? payment.month
      : "";
    const course = specialCharge
      ? undefined
      : resolvePaymentCourse(
          payment,
          courses,
          enrollments,
          student.course,
        );
    const level = course ? courseLevelLabel(course, levels) : "";
    const item = specialCharge
      ? specialCharge
      : course
        ? `${course.type}: ${course.name}${level ? ` - ${level}` : ""}`
        : student.course || "اشتراك الطالب";

    return [
      `- *الشهر:* ${paymentMonthLabel(payment)}`,
      `  *المستحق:* ${item}`,
      `  *المبلغ المتبقي:* ${money(remainingPaymentAmount(payment))}`,
      "",
    ];
  });
  const totalDue = payments.reduce(
    (sum, payment) => sum + remainingPaymentAmount(payment),
    0,
  );

  return [
    "السلام عليكم،",
    "",
    `*التلميذ(ة):* ${student.name}`,
    "",
    "*تفاصيل المستحقات:*",
    "",
    ...details,
    `*الإجمالي المتبقي:* ${money(totalDue)}`,
    "",
    "المرجو تسوية المستحقات.",
    "شكراً لكم.",
  ].join("\r\n");
}

export function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  return digits;
}
