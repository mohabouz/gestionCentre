"use client";

import { useState } from "react";
import { Button } from "@/components/centman-shell";
import { Input, Modal } from "@/components/sections/shared-ui";
import { courseLevelLabel } from "@/lib/course-level";
import { money, type Course, type Level, type Payment } from "@/lib/centman-store";
import { recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";

function paymentLabel(payment: Payment, courses: Course[], levels: Level[]) {
  const course = courses.find(
    (item) => Number(item.id) === Number(payment.courseId),
  );
  const level = course ? courseLevelLabel(course, levels) : "";
  return {
    course,
    text: `${course?.name || "اشتراك"}${level ? ` - ${level}` : ""}`,
  };
}

export function MonthlyStudentPaymentModal({
  payments,
  courses,
  levels,
  onClose,
  onSave,
}: {
  payments: Payment[];
  courses: Course[];
  levels: Level[];
  onClose: () => void;
  onSave: (
    amounts: Record<number, number>,
    method: NonNullable<Payment["method"]>,
  ) => void;
}) {
  const [amounts, setAmounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      payments.map((payment) => [payment.id, remainingPaymentAmount(payment)]),
    ),
  );
  const [method, setMethod] =
    useState<NonNullable<Payment["method"]>>("نقدي");
  const totalDue = payments.reduce(
    (sum, payment) => sum + remainingPaymentAmount(payment),
    0,
  );
  const paidNow = payments.reduce(
    (sum, payment) =>
      sum +
      Math.max(
        0,
        Math.min(amounts[payment.id] || 0, remainingPaymentAmount(payment)),
      ),
    0,
  );

  return (
    <Modal
      title={`تسجيل دفعات ${payments[0]?.student || "التلميذ"}`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(amounts, method);
        }}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#fff0ee] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">المطلوب</span>
            <b className="mt-1 block text-sm text-[#d56558]">{money(totalDue)}</b>
          </div>
          <div className="rounded-xl bg-[#eef4ff] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">المدفوع الآن</span>
            <b className="mt-1 block text-sm text-[#5054c0]">{money(paidNow)}</b>
          </div>
          <div className="rounded-xl bg-[#faf4de] p-3">
            <span className="block text-[10px] text-[#8a8a8a]">سيبقى</span>
            <b className="mt-1 block text-sm text-[#a08500]">{money(totalDue - paidNow)}</b>
          </div>
        </div>

        <div className="max-h-[48vh] space-y-3 overflow-y-auto pl-1">
          {payments.map((payment) => {
            const { text } = paymentLabel(payment, courses, levels);
            const remaining = remainingPaymentAmount(payment);
            return (
              <div
                key={payment.id}
                className="rounded-2xl border border-[#e1e8e4] bg-[#fafcfb] p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <b className="block text-sm text-[#263a30]">
                      {text}
                    </b>
                    <span className="mt-1 block text-[10px] text-[#83948b]">
                      الإجمالي {money(payment.totalAmount ?? payment.amount)} • سبق دفعه {money(recordedPaymentAmount(payment))}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff0ee] px-2 py-1 text-[10px] font-bold text-[#c85b50]">
                    متبقي {money(remaining)}
                  </span>
                </div>
                <Input
                  label={`المدفوع الآن (الحد الأقصى ${money(remaining)})`}
                  type="number"
                  value={amounts[payment.id] || 0}
                  onChange={(value) =>
                    setAmounts((current) => ({
                      ...current,
                      [payment.id]: Math.max(
                        0,
                        Math.min(Number(value) || 0, remaining),
                      ),
                    }))
                  }
                />
              </div>
            );
          })}
        </div>

        <label className="block text-right">
          <span className="mb-2 block text-xs font-bold text-[#6c6c6c]">
            طريقة الدفع
          </span>
          <select
            value={method}
            onChange={(event) =>
              setMethod(event.target.value as NonNullable<Payment["method"]>)
            }
            className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-sm outline-none focus:border-[#5054c0]"
          >
            <option value="نقدي">نقدي</option>
            <option value="تحويل بنكي">تحويل بنكي</option>
            <option value="بطاقة">بطاقة</option>
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={!paidNow}>تأكيد الدفعات</Button>
        </div>
      </form>
    </Modal>
  );
}
