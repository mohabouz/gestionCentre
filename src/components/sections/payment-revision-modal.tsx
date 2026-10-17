"use client";

import { useState } from "react";
import { Button } from "@/components/centman-shell";
import { Payment, money } from "@/lib/centman-store";


import { Input, Modal } from "@/components/sections/shared-ui";

export function PaymentRevisionModal({
  payment,
  onClose,
  onSave,
}: {
  payment: Payment;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  return (
    <Modal title="تعديل الدفعة" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(Number(amount));
        }}
        className="space-y-4"
      >
        <p className="text-xs text-[#6c6c6c]">
          {payment.student} • {payment.month}
        </p>
        <Input
          label={`المبلغ المدفوع (الحد الأقصى ${money(payment.totalAmount ?? payment.amount)})`}
          type="number"
          value={amount}
          onChange={setAmount}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit">حفظ التعديل</Button>
        </div>
      </form>
    </Modal>
  );
}
