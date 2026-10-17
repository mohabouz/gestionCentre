"use client";

import { CalendarDays, Phone, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/centman-shell";
import { Modal } from "@/components/sections/shared-ui";
import type {
  Course,
  Enrollment,
  Level,
  Payment,
  Student,
} from "@/lib/centman-store";
import { money } from "@/lib/centman-store";
import { courseLevelLabel } from "@/lib/course-level";
import {
  recordedPaymentAmount,
  remainingPaymentAmount,
} from "@/lib/monthly-billing";
import {
  paymentMonthLabel,
  resolvePaymentCourse,
} from "@/lib/payment-display";

export function LatePaymentDetails({
  student,
  payments,
  courses,
  enrollments,
  levels,
  onClose,
  onPay,
}: {
  student: Student;
  payments: Payment[];
  courses: Course[];
  enrollments: Enrollment[];
  levels: Level[];
  onClose: () => void;
  onPay: () => void;
}) {
  const total = payments.reduce(
    (sum, payment) => sum + (payment.totalAmount ?? payment.amount),
    0,
  );
  const paid = payments.reduce(
    (sum, payment) => sum + recordedPaymentAmount(payment),
    0,
  );
  const remaining = payments.reduce(
    (sum, payment) => sum + remainingPaymentAmount(payment),
    0,
  );

  return (
    <Modal
      title={`تفاصيل المستحقات: ${student.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={onPay}>تسجيل دفعة</Button>
        </>
      }
    >
      <div className="mb-4 grid gap-2 rounded-2xl bg-[#f5f8f6] p-4 text-xs sm:grid-cols-2">
        <span className="flex items-center gap-2 text-[#61766b]">
          <Phone size={15} className="text-[#00a060]" />
          {student.phone || "بدون رقم هاتف"}
        </span>
        <span className="flex items-center gap-2 text-[#61766b]">
          <ReceiptText size={15} className="text-[#00a060]" />
          {payments.length} فواتير غير مسددة
        </span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#eef4ff] p-3">
          <span className="block text-[10px] text-[#7c899e]">الإجمالي</span>
          <strong className="mt-1 block text-sm text-[#4c65a8]">
            {money(total)}
          </strong>
        </div>
        <div className="rounded-xl bg-[#e9f8ef] p-3">
          <span className="block text-[10px] text-[#71867a]">المدفوع</span>
          <strong className="mt-1 block text-sm text-[#008a55]">
            {money(paid)}
          </strong>
        </div>
        <div className="rounded-xl bg-[#fff0ee] p-3">
          <span className="block text-[10px] text-[#8f7774]">المتبقي</span>
          <strong className="mt-1 block text-sm text-[#c4584e]">
            {money(remaining)}
          </strong>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black text-[#30483d]">
          الفواتير غير المسددة ({payments.length})
        </p>
        {payments.map((payment) => {
          const course = resolvePaymentCourse(
            payment,
            courses,
            enrollments,
            student.course,
          );
          const courseLabel = course
            ? course.name
            : student.course || "اشتراك غير محدد";
          const levelLabel = course
            ? courseLevelLabel(course, levels) || "بدون مستوى"
            : "بدون مستوى";
          const invoiceTotal = payment.totalAmount ?? payment.amount;
          const invoicePaid = recordedPaymentAmount(payment);
          const invoiceRemaining = remainingPaymentAmount(payment);

          return (
            <div
              key={payment.id}
              className="rounded-xl border border-[#e1e9e4] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs font-black text-[#2c4338]">
                    <span>{courseLabel}</span>
                    <span className="text-[#a5b2ab]">-</span>
                    <span className="rounded-md bg-[#e4f2eb] px-2 py-0.5 text-[10px] text-[#087849]">
                      {levelLabel}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[#83928a]">
                    <CalendarDays size={12} />
                    {paymentMonthLabel(payment)}
                  </p>
                </div>
                <span className="rounded-full bg-[#fff0ee] px-2 py-1 text-[10px] font-black text-[#bd4e45]">
                  متبقي {money(invoiceRemaining)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-[#eef2ef] pt-2.5 text-[10px] text-[#778980]">
                <WalletCards size={13} />
                <span>الإجمالي {money(invoiceTotal)}</span>
                <span className="text-[#b4beb8]">•</span>
                <span className="font-bold text-[#008a55]">
                  المدفوع {money(invoicePaid)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
