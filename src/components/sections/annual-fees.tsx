"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, PageTitle } from "@/components/centman-shell";
import { PaymentRegisterModal } from "@/components/sections/payment-register-modal";
import { EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { currentYear, money, type Payment } from "@/lib/centman-store";
import { recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";
import { registerPaymentCollection } from "@/lib/payment-registration";

export function AnnualFees({ data, update }: Props) {
  const [year, setYear] = useState(currentYear);
  const [query, setQuery] = useState("");
  const [registering, setRegistering] = useState<Payment | null>(null);
  const annualPayments = data.students
    .filter(
      (student) =>
        student.subscriptionYear === year &&
        (student.enrollmentFee || 0) > 0 &&
        student.name.includes(query),
    )
    .map((student) => {
      const existing = data.payments.find(
        (payment) =>
          payment.studentId === student.id &&
          payment.month === `رسوم الاشتراك ${year}`,
      );
      return (
        existing || {
          id: -student.id,
          studentId: student.id,
          student: student.name,
          amount: 0,
          totalAmount: student.enrollmentFee || 0,
          month: `رسوم الاشتراك ${year}`,
          status: "متأخر" as const,
          date: "",
        }
      );
    });
  const total = annualPayments.reduce(
    (sum, payment) => sum + (payment.totalAmount ?? payment.amount),
    0,
  );
  const paid = annualPayments.reduce(
    (sum, payment) => sum + recordedPaymentAmount(payment),
    0,
  );

  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="رسوم الاشتراك السنوية"
        action={
          <label className="rounded-xl border border-[#dce7df] bg-white px-3 py-2 text-xs font-bold text-[#60766b]">
            <span className="ml-2">السنة</span>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || currentYear)}
              className="w-20 bg-transparent outline-none"
            />
          </label>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card><p className="text-xs text-[#899a90]">إجمالي رسوم {year}</p><b className="mt-2 block text-xl">{money(total)}</b></Card>
        <Card><p className="text-xs text-[#899a90]">المحصل</p><b className="mt-2 block text-xl text-[#00a060]">{money(paid)}</b></Card>
        <Card><p className="text-xs text-[#899a90]">المتبقي</p><b className="mt-2 block text-xl text-[#d56558]">{money(total - paid)}</b></Card>
      </div>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-black text-[#17251f]">اشتراكات سنة {year}</h3>
            <p className="mt-1 text-[11px] text-[#84938b]">صف مستقل لكل تلميذ، بعيداً عن الدفوعات الشهرية.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-[#f8faf9] px-3 text-[#9aaba1]">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none sm:w-44" placeholder="ابحث عن تلميذ..." />
          </div>
        </div>
        <Table>
          <Th>التلميذ</Th><Th>السنة</Th><Th>المطلوب</Th><Th>المدفوع</Th><Th>المتبقي</Th><Th>الحالة</Th><Th>إجراء</Th>
          {annualPayments.map((payment) => {
            const remaining = remainingPaymentAmount(payment);
            return (
              <tr key={payment.id}>
                <Td><b>{payment.student}</b></Td>
                <Td>{year}</Td>
                <Td>{money(payment.totalAmount ?? payment.amount)}</Td>
                <Td className="font-bold text-[#008a55]">{money(recordedPaymentAmount(payment))}</Td>
                <Td className={remaining ? "font-bold text-[#d56558]" : "text-[#84938b]"}>{money(remaining)}</Td>
                <Td><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${remaining ? "bg-[#fff0ee] text-[#d56558]" : "bg-[#e9f8ef] text-[#008a55]"}`}>{remaining ? payment.amount > 0 ? "جزئي" : "غير مدفوع" : "مدفوع"}</span></Td>
                <Td>{remaining ? <button type="button" onClick={() => setRegistering(payment)} className="rounded-xl bg-[#00a060] px-4 py-2 text-xs font-bold text-white">تسجيل الدفع</button> : <span className="text-xs text-[#84938b]">مكتمل</span>}</Td>
              </tr>
            );
          })}
        </Table>
        {!annualPayments.length && <EmptyState text={`لا توجد اشتراكات سنوية مسجلة لسنة ${year}`} />}
      </Card>

      {registering && (
        <PaymentRegisterModal
          payment={registering}
          onClose={() => setRegistering(null)}
          onSave={(amount, method) => {
            update(
              registerPaymentCollection(data, registering, amount, method),
              "تم تسجيل دفعة الاشتراك السنوي",
            );
            setRegistering(null);
          }}
        />
      )}
    </>
  );
}
