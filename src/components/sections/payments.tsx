"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Payment, currentMonth, formatBillingMonth, money, today } from "@/lib/centman-store";
import { discountedPrice, enrollmentAppliesToMonth, paymentBillingMonth, recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";
import { registerPaymentCollection } from "@/lib/payment-registration";


import { EmptyState, ReceiptActions, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { PaymentRegisterModal } from "@/components/sections/payment-register-modal";
import { PaymentRevisionModal } from "@/components/sections/payment-revision-modal";


export function Payments({ data, update, monthly }: Props & { monthly: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [registeringPayment, setRegisteringPayment] = useState<Payment | null>(null);
  const generateMonthlyPayments = () => {
    const eligible = data.enrollments.filter((enrollment) =>
      enrollmentAppliesToMonth(enrollment, selectedMonth),
    );
    const missing = eligible.filter(
      (enrollment) =>
        !data.payments.some(
          (payment) =>
            Number(payment.enrollmentId) === Number(enrollment.id) &&
            paymentBillingMonth(payment) === selectedMonth,
        ),
    );
    if (!missing.length) return;
    const firstId = Math.max(0, ...data.payments.map((payment) => payment.id)) + 1;
    const generated = missing.flatMap((enrollment, index) => {
      const student = data.students.find((item) => item.id === enrollment.studentId);
      const course = data.courses.find((item) => item.id === enrollment.courseId);
      if (!student || !course) return [];
      const totalAmount = discountedPrice(course.price, enrollment.discount);
      return [{
        id: firstId + index,
        studentId: student.id,
        student: student.name,
        courseId: course.id,
        enrollmentId: enrollment.id,
        billingMonth: selectedMonth,
        amount: 0,
        totalAmount,
        month: formatBillingMonth(selectedMonth),
        status: "مسودة" as const,
        date: "",
      }];
    });
    const payments = [...data.payments, ...generated];
    update(
      {
        ...data,
        payments,
        students: data.students.map((student) => ({
          ...student,
          due: payments
            .filter((payment) => payment.studentId === student.id && payment.status !== "ملغاة")
            .reduce((sum, payment) => sum + Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount), 0),
        })),
      },
      `تم توليد ${generated.length} دفعة لشهر ${formatBillingMonth(selectedMonth)}`,
    );
  };
  const record = (payment: Payment, amount: number, method: NonNullable<Payment["method"]>) => {
    const remaining = remainingPaymentAmount(payment);
    const paidNow = Math.max(0, Math.min(amount, remaining));
    if (!paidNow) return;
    update(
      registerPaymentCollection(data, payment, paidNow, method),
      paidNow < remaining ? "تم تسجيل دفعة جزئية" : "تم تسجيل الدفعة وإصدار الوصل",
    );
    setRegisteringPayment(null);
  };
  const returnToDraft = (payment: Payment) => {
    const updatedPayments = data.payments.map((item) =>
      item.id === payment.id
        ? {
          ...item,
          amount: 0,
          status: "مسودة" as const,
          date: "",
          method: undefined,
          receiptNumber: undefined,
        }
        : item,
    );
    update(
      {
        ...data,
        payments: updatedPayments,
        students: data.students.map((student) =>
          student.id === payment.studentId
            ? {
              ...student,
              due: updatedPayments
                .filter((item) => item.studentId === student.id)
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.max(
                      0,
                      (item.totalAmount ?? item.amount) - item.amount,
                    ),
                  0,
                ),
              lastPayment:
                updatedPayments
                  .filter(
                    (item) =>
                      item.studentId === student.id && item.amount > 0,
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
                "",
            }
            : student,
        ),
      },
      "تمت إعادة الدفعة إلى مسودة",
    );
  };
  const revisePayment = (payment: Payment, amount: number) => {
    const paid = Math.max(
      0,
      Math.min(amount, payment.totalAmount ?? payment.amount),
    );
    const updatedPayments = data.payments.map((item) =>
      item.id === payment.id
        ? {
          ...item,
          amount: paid,
          status:
            paid === (item.totalAmount ?? item.amount)
              ? ("مدفوع" as const)
              : paid > 0
                ? ("جزئي" as const)
                : ("مسودة" as const),
          date: paid > 0 ? today : "",
          method: paid > 0 ? item.method || ("نقدي" as const) : undefined,
          receiptNumber:
            paid > 0
              ? item.receiptNumber ||
              `REC-${today.replaceAll("-", "")}-${String(item.id).slice(-4)}`
              : undefined,
        }
        : item,
    );
    update(
      {
        ...data,
        payments: updatedPayments,
        students: data.students.map((student) =>
          student.id === payment.studentId
            ? {
              ...student,
              due: updatedPayments
                .filter(
                  (item) =>
                    item.studentId === student.id && item.status !== "ملغاة",
                )
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.max(
                      0,
                      (item.totalAmount ?? item.amount) - item.amount,
                    ),
                  0,
                ),
              lastPayment:
                updatedPayments
                  .filter(
                    (item) =>
                      item.studentId === student.id && item.amount > 0,
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
                "",
            }
            : student,
        ),
      },
      "تم تعديل الدفعة",
    );
    setEditingPayment(null);
  };
  const cancelDraft = (payment: Payment) =>
    update(
      {
        ...data,
        payments: data.payments.map((item) =>
          item.id === payment.id
            ? {
              ...item,
              amount: 0,
              status: "ملغاة" as const,
              date: "",
              method: undefined,
              receiptNumber: undefined,
            }
            : item,
        ),
      },
      "تم إلغاء مسودة الدفعة",
    );
  const payments = data.payments.filter(
    (payment) =>
      payment.student.includes(query) &&
      (!monthly || paymentBillingMonth(payment) === selectedMonth),
  );
  const activePayments = payments.filter((p) => p.status !== "ملغاة");
  const total = activePayments.reduce(
    (sum, p) => sum + (p.totalAmount ?? p.amount),
    0,
  );
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title={monthly ? "الدفوعات الشهرية" : "التسجيلات والدفوعات"}
        action={
          monthly ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="rounded-xl border border-[#dce7df] bg-white px-3 py-2 text-xs font-bold text-[#60766b]">
                <span className="ml-2">الشهر</span>
                <input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="bg-transparent outline-none" />
              </label>
              <Button onClick={generateMonthlyPayments}>توليد دفعات الشهر</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-3 text-[#9aaba1]">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-44 bg-transparent py-2 text-xs outline-none" placeholder="ابحث..." />
            </div>
          )
        }
      />
      {monthly && (
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#e3eae5] bg-white p-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black text-[#17251f]">دفعات {formatBillingMonth(selectedMonth)}</p>
            <p className="mt-0.5 text-[11px] text-[#84938b]">يتم إنشاء دفعة واحدة لكل تسجيل، ولن تتكرر عند الضغط مرة أخرى.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-[#f8faf9] px-3 text-[#9aaba1]">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none sm:w-44" placeholder="ابحث عن طالب..." />
          </div>
        </div>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-[#899a90]">المبلغ الإجمالي</p>
          <b className="mt-2 block text-xl text-[#17251f]">{money(total)}</b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">المدفوع</p>
          <b className="mt-2 block text-xl text-[#00a060]">
            {money(activePayments.reduce((s, p) => s + recordedPaymentAmount(p), 0))}
          </b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">المتبقي</p>
          <b className="mt-2 block text-xl text-[#d56558]">
            {money(
              activePayments.reduce(
                (sum, p) => sum + remainingPaymentAmount(p),
                0,
              ),
            )}
          </b>
        </Card>
      </div>
      <Card>
        <Table>
          <Th>الطالب</Th>
          <Th>الشهر</Th>
          <Th>المدفوع</Th>
          <Th>المتبقي</Th>
          <Th>الحالة</Th>
          <Th>طريقة الدفع</Th>
          <Th>إجراء</Th>
          {payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <b>{p.student}</b>
              </Td>
              <Td>{p.month}</Td>
              <Td className="font-bold text-[#008a55]">{money(recordedPaymentAmount(p))}</Td>
              <Td className={remainingPaymentAmount(p) ? "font-bold text-[#d56558]" : "text-[#84938b]"}>
                {money(remainingPaymentAmount(p))}
              </Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status === "مدفوع" ? "bg-[#e9f8ef] text-[#008a55]" : p.status === "مسودة" ? "bg-[#eef4ff] text-[#4c73c8]" : p.status === "ملغاة" ? "bg-[#f1f1f1] text-[#8a8a8a]" : p.status === "جزئي" ? "bg-[#faf4de] text-[#a08500]" : "bg-[#fff0ee] text-[#d56558]"}`}
                >
                  {p.status}
                </span>
              </Td>
              <Td>{p.method || "-"}</Td>
              <Td>
                {p.status === "مدفوع" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingPayment(p)}
                    >
                      تعديل
                    </Button>
                    <ReceiptActions
                      payment={p}
                      whatsapp={
                        data.students.find(
                          (student) => student.id === p.studentId,
                        )?.whatsapp ||
                        data.students.find(
                          (student) => student.id === p.studentId,
                        )?.phone
                      }
                    />
                    <Button variant="outline" onClick={() => returnToDraft(p)}>
                      إرجاع لمسودة
                    </Button>
                  </div>
                ) : p.status === "مسودة" ? (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setRegisteringPayment(p)}>تسجيل الدفع</Button>
                    <Button variant="danger" onClick={() => cancelDraft(p)}>
                      إلغاء المسودة
                    </Button>
                  </div>
                ) : p.status === "ملغاة" ? (
                  <span className="text-[10px] text-[#8a8a8a]">
                    لا توجد إجراءات
                  </span>
                ) : (
                  <Button onClick={() => setRegisteringPayment(p)}>تسجيل الدفع</Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        {!payments.length && <EmptyState text={monthly ? "لم يتم توليد دفعات هذا الشهر بعد" : "لا توجد دفعات مطابقة"} />}
      </Card>
      {editingPayment && (
        <PaymentRevisionModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={(amount) => revisePayment(editingPayment, amount)}
        />
      )}
      {registeringPayment && (
        <PaymentRegisterModal
          payment={registeringPayment}
          onClose={() => setRegisteringPayment(null)}
          onSave={(amount, method) => record(registeringPayment, amount, method)}
        />
      )}
    </>
  );
}


