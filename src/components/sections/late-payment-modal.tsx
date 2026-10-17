"use client";

import { useState } from "react";
import { Button } from "@/components/centman-shell";
import { Course, Enrollment, Level, Payment, Student, money } from "@/lib/centman-store";
import { courseLevelLabel } from "@/lib/course-level";
import { remainingPaymentAmount } from "@/lib/monthly-billing";
import { paymentMonthLabel, resolvePaymentCourse } from "@/lib/payment-display";


import { Input, Modal } from "@/components/sections/shared-ui";

export function LatePaymentModal({
  student,
  payments,
  courses,
  enrollments,
  levels,
  onClose,
  onSave,
}: {
  student: Student;
  payments: Payment[];
  courses: Course[];
  enrollments: Enrollment[];
  levels: Level[];
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const totalDue = payments.reduce((sum, payment) => sum + remainingPaymentAmount(payment), 0);
  const [amount, setAmount] = useState(String(totalDue));
  const paidNow = Math.max(0, Math.min(Number(amount) || 0, totalDue));
  const remaining = totalDue - paidNow;
  return (
    <Modal title={`تسجيل دفعة: ${student.name}`} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSave(paidNow); }} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#fff0ee] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">المستحق</span>
            <b className="mt-1 block text-sm text-[#d56558]">{money(totalDue)}</b>
          </div>
          <div className="rounded-xl bg-[#eef4ff] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">المدفوع الآن</span>
            <b className="mt-1 block text-sm text-[#5054c0]">{money(paidNow)}</b>
          </div>
          <div className="rounded-xl bg-[#faf4de] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">المتبقي</span>
            <b className="mt-1 block text-sm text-[#a08500]">{money(remaining)}</b>
          </div>
        </div>
        <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-[#e5e5e5] bg-[#f8faf9] p-3">
          <p className="text-[10px] font-black text-[#60766b]">تفاصيل المستحقات ({payments.length})</p>
          {payments.map((payment) => {
            const course = resolvePaymentCourse(
              payment,
              courses,
              enrollments,
              student.course,
            );
            const level = course
              ? courseLevelLabel(course, levels) || "بدون مستوى"
              : "بدون مستوى";
            return (
              <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1 font-black text-[#2c4338]">
                    <span>{course?.name || student.course || "اشتراك غير محدد"}</span>
                    <span className="text-[#a5b2ab]">-</span>
                    <span className="text-[#087849]">{level}</span>
                  </span>
                  <span className="mt-1 block text-[10px] text-[#87968e]">
                    {paymentMonthLabel(payment)}
                  </span>
                </span>
                <b className="shrink-0 text-[#d56558]">{money(remainingPaymentAmount(payment))}</b>
              </div>
            );
          })}
        </div>
        <Input label={`المبلغ المدفوع (الحد الأقصى ${money(totalDue)})`} type="number" value={amount} onChange={setAmount} />
        <p className={`rounded-xl p-3 text-center text-xs font-bold ${remaining > 0 ? "bg-[#faf4de] text-[#8a7000]" : "bg-[#e6f5ee] text-[#008a55]"}`}>
          {remaining > 0 ? `دفعة جزئية — سيبقى ${money(remaining)}` : "سيتم تسديد جميع المستحقات"}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={!paidNow || !payments.length}>تسجيل الدفعة</Button>
        </div>
      </form>
    </Modal>
  );
}
