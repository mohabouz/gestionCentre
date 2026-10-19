import type { Enrollment } from "@/lib/centman-store";

export function enrollmentAppliesToMonth(enrollment: Enrollment, month: string) {
  const enrolledMonth = enrollment.enrolledAt.slice(0, 7);
  const removedMonth = enrollment.removedAt?.slice(0, 7);
  if (enrolledMonth > month) return false;
  if (removedMonth) return removedMonth >= month;
  return enrollment.status === "نشط";
}

const billingMonthNames: Record<string, string> = {
  يناير: "01", فبراير: "02", مارس: "03", أبريل: "04", ابريل: "04", أفريل: "04",
  ماي: "05", مايو: "05", يونيو: "06", يوليو: "07", غشت: "08", أغسطس: "08",
  شتنبر: "09", سبتمبر: "09", أكتوبر: "10", اكتوبر: "10", نونبر: "11", نوفمبر: "11",
  دجنبر: "12", ديسمبر: "12",
};

export function paymentBillingMonth(payment: { billingMonth?: string | null; month?: string; date: string }) {
  if (payment.billingMonth) return payment.billingMonth;
  const normalizedLabel = (payment.month || "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const labeledMonth = normalizedLabel.match(/([\p{L}]+)\s+(\d{4})/u);
  if (labeledMonth) {
    const monthNumber = billingMonthNames[labeledMonth[1]];
    if (monthNumber) return `${labeledMonth[2]}-${monthNumber}`;
  }
  const numericMonth = normalizedLabel.match(/^(\d{4})[-/](\d{1,2})$/);
  if (numericMonth) return `${numericMonth[1]}-${numericMonth[2].padStart(2, "0")}`;
  return /^\d{4}-\d{2}/.test(payment.date) ? payment.date.slice(0, 7) : "";
}

export function discountedPrice(price: number, discount = 0) {
  return Math.max(0, price - Math.max(0, Math.min(discount, price)));
}

export function recordedPaymentAmount(payment: { amount: number; totalAmount?: number | null; status?: string }) {
  if (payment.totalAmount == null && (payment.status === "متأخر" || payment.status === "مسودة")) return 0;
  return payment.amount;
}

export function remainingPaymentAmount(payment: { amount: number; totalAmount?: number | null; status?: string }) {
  if (payment.totalAmount == null && (payment.status === "متأخر" || payment.status === "مسودة")) return Math.max(0, payment.amount);
  return Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount);
}

export function shouldCancelPaymentForOptOut(
  payment: { billingMonth?: string | null; month?: string; date: string; amount: number; totalAmount?: number | null; status: string },
  effectiveMonth: string,
) {
  if (payment.status === "ملغاة" || recordedPaymentAmount(payment) > 0) return false;
  const billingMonth = paymentBillingMonth(payment);
  return Boolean(billingMonth && billingMonth >= effectiveMonth);
}
