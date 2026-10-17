import { today, type Payment } from "@/lib/centman-store";
import { recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";
import type { Data } from "@/lib/section-data";

export function registerPaymentCollection(
  data: Data,
  payment: Payment,
  amount: number,
  method: NonNullable<Payment["method"]>,
): Data {
  const remaining = remainingPaymentAmount(payment);
  const paidNow = Math.max(0, Math.min(amount, remaining));
  if (!paidNow) return data;

  const paymentExists = data.payments.some((item) => item.id === payment.id);
  const paymentId = paymentExists
    ? payment.id
    : Math.max(0, ...data.payments.map((item) => item.id)) + 1;
  const nextAmount = recordedPaymentAmount(payment) + paidNow;
  const totalAmount = payment.totalAmount ?? payment.amount;
  const receiptNumber = `REC-${today.replaceAll("-", "")}-${String(paymentId).padStart(4, "0")}-${String(Date.now()).slice(-4)}`;
  const updatedPayment: Payment = {
    ...payment,
    id: paymentId,
    amount: nextAmount,
    totalAmount,
    status: nextAmount >= totalAmount ? "مدفوع" : "جزئي",
    date: today,
    method,
    receiptNumber,
  };
  const payments = paymentExists
    ? data.payments.map((item) => item.id === paymentId ? updatedPayment : item)
    : [...data.payments, updatedPayment];
  const collections = [...data.collections, {
    id: Date.now(),
    paymentId,
    amount: paidNow,
    date: updatedPayment.date,
    method,
    receiptNumber,
  }];

  return {
    ...data,
    payments,
    collections,
    students: data.students.map((student) => student.id === payment.studentId
      ? {
          ...student,
          due: payments
            .filter((item) => item.studentId === student.id && item.status !== "ملغاة")
            .reduce((sum, item) => sum + remainingPaymentAmount(item), 0),
          lastPayment: updatedPayment.date,
        }
      : student),
  };
}
