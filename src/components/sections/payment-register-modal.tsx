"use client";

import { useState } from "react";
import { Button } from "@/components/centman-shell";
import { Payment, money } from "@/lib/centman-store";
import { recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";


import { Input, Modal } from "@/components/sections/shared-ui";

export function PaymentRegisterModal({
  payment,
  onClose,
  onSave,
}: {
  payment: Payment;
  onClose: () => void;
  onSave: (amount: number, method: NonNullable<Payment["method"]>) => void;
}) {
  const remainingDue = remainingPaymentAmount(payment);
  const [amount, setAmount] = useState(String(remainingDue));
  const [method, setMethod] = useState<NonNullable<Payment["method"]>>(payment.method || "نقدي");
  const paidNow = Math.max(0, Math.min(Number(amount) || 0, remainingDue));
  const leftAfterPayment = remainingDue - paidNow;
  return (
    <Modal title={`تسجيل دفعة: ${payment.student}`} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSave(paidNow, method); }} className="space-y-4">
        <div className="rounded-xl bg-[#f5f7ff] p-3 text-xs text-[#5054c0]">
          <p className="font-black">{payment.month}</p>
          <p className="mt-1">الإجمالي: {money(payment.totalAmount ?? payment.amount)} • سبق دفعه: {money(recordedPaymentAmount(payment))}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#fff0ee] p-3"><span className="block text-[10px] text-[#8a8a8a]">المتبقي</span><b className="mt-1 block text-sm text-[#d56558]">{money(remainingDue)}</b></div>
          <div className="rounded-xl bg-[#eef4ff] p-3"><span className="block text-[10px] text-[#8a8a8a]">المدفوع الآن</span><b className="mt-1 block text-sm text-[#5054c0]">{money(paidNow)}</b></div>
          <div className="rounded-xl bg-[#faf4de] p-3"><span className="block text-[10px] text-[#8a8a8a]">سيبقى</span><b className="mt-1 block text-sm text-[#a08500]">{money(leftAfterPayment)}</b></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={`مبلغ الدفعة (الحد الأقصى ${money(remainingDue)})`} type="number" value={amount} onChange={setAmount} />
          <label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#6c6c6c]">طريقة الدفع</span><select value={method} onChange={(event) => setMethod(event.target.value as NonNullable<Payment["method"]>)} className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-sm outline-none focus:border-[#5054c0]"><option value="نقدي">نقدي</option><option value="تحويل بنكي">تحويل بنكي</option><option value="بطاقة">بطاقة</option></select></label>
        </div>
        <p className={`rounded-xl p-3 text-center text-xs font-bold ${leftAfterPayment > 0 ? "bg-[#faf4de] text-[#8a7000]" : "bg-[#e6f5ee] text-[#008a55]"}`}>
          {leftAfterPayment > 0 ? `ستبقى الفاتورة جزئية وبها ${money(leftAfterPayment)} غير مدفوعة` : "سيتم إغلاق الفاتورة بالكامل"}
        </p>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!paidNow}>تأكيد الدفعة</Button></div>
      </form>
    </Modal>
  );
}
