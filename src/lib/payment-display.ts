import type { Course, Enrollment, Payment } from "@/lib/centman-store";
import { paymentBillingMonth } from "@/lib/monthly-billing";

export function resolvePaymentCourse(
  payment: Payment,
  courses: Course[],
  enrollments: Enrollment[],
  fallbackName?: string,
) {
  const courseId =
    payment.courseId ??
    enrollments.find((enrollment) => enrollment.id === payment.enrollmentId)
      ?.courseId;
  const legacyName = payment.month.match(/^(?:مادة|باقة):\s*(.+)$/)?.[1];

  return (
    courses.find((course) => course.id === courseId) ||
    courses.find(
      (course) => course.name === legacyName || course.name === fallbackName,
    )
  );
}

export function paymentMonthLabel(payment: Payment) {
  const month = paymentBillingMonth(payment);
  if (month) {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("ar-MA", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, monthNumber - 1, 1));
  }

  return /^(?:مادة|باقة):/.test(payment.month) ? payment.date : payment.month;
}
