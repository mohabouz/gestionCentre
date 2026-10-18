"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, MessageCircle, Phone } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Student, money } from "@/lib/centman-store";
import { paymentBillingMonth, remainingPaymentAmount } from "@/lib/monthly-billing";


import { EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { LatePaymentModal } from "@/components/sections/late-payment-modal";
import { LatePaymentDetails } from "@/components/sections/late-payment-details";
import { latePaymentMessage, whatsappNumber } from "@/lib/late-payment-message";


export function LateStudents({ data, registerPayments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const late = data.students.filter((s) => s.due > 0);
  const [payingStudent, setPayingStudent] = useState<Student | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const outstandingPayments = (studentId: number) =>
    data.payments
      .filter((payment) => payment.studentId === studentId && payment.status !== "ملغاة" && remainingPaymentAmount(payment) > 0)
      .sort((left, right) => (paymentBillingMonth(left) || left.date).localeCompare(paymentBillingMonth(right) || right.date));
  useEffect(() => {
    const requestedStudentId = Number(searchParams.get("pay"));
    if (!requestedStudentId) return;
    const student = data.students.find(
      (item) => item.id === requestedStudentId && item.due > 0,
    );
    if (!student) return;
    setPayingStudent(student);
    router.replace("/late-students", { scroll: false });
  }, [data.students, router, searchParams]);
  const registerPartialPayment = async (student: Student, requestedAmount: number) => {
    const invoices = outstandingPayments(student.id);
    const totalDue = invoices.reduce((sum, payment) => sum + remainingPaymentAmount(payment), 0);
    const paidNow = Math.max(0, Math.min(requestedAmount, totalDue));
    if (!paidNow) return;
    let remaining = paidNow;
    const allocations = invoices.flatMap((payment) => {
      if (remaining <= 0) return [];
      const applied = Math.min(remaining, remainingPaymentAmount(payment));
      remaining -= applied;
      return applied ? [{ paymentId: payment.id, amount: applied }] : [];
    });
    if (await registerPayments?.(allocations)) setPayingStudent(null);
  };
  return (
    <>
      <PageTitle eyebrow="المتابعة" title="الطلاب المتأخرون" />
      <Card>
        <Table>
          <Th>الطالب</Th>
          <Th>الهاتف</Th>
          <Th>الدورة</Th>
          <Th>المستحق</Th>
          <Th>تواصل</Th>
          <Th>إجراء</Th>
          {late.map((s) => {
            const invoices = outstandingPayments(s.id);
            const reminder = latePaymentMessage({
              student: s,
              payments: invoices,
              courses: data.courses,
              enrollments: data.enrollments,
              levels: data.levels,
            });
            return (
            <tr key={s.id}>
              <Td>
                <button
                  type="button"
                  onClick={() => setDetailsStudent(s)}
                  className="font-black text-[#2c4338] transition hover:text-[#00a060] hover:underline"
                >
                  {s.name}
                </button>
              </Td>
              <Td>{s.phone}</Td>
              <Td>{s.course}</Td>
              <Td className="font-bold text-[#d56558]">{money(s.due)}</Td>
              <Td>
                <div className="flex gap-2">
                  <a
                    aria-label="واتساب"
                    href={`https://wa.me/${whatsappNumber(s.whatsapp || s.phone)}?text=${encodeURIComponent(reminder)}`}
                    target="_blank"
                    className="rounded-lg bg-[#e9f8ef] p-2 text-[#00a060]"
                  >
                    <MessageCircle size={15} />
                  </a>
                  <a
                    aria-label="اتصال"
                    href={`tel:${s.phone}`}
                    className="rounded-lg bg-[#eef4ff] p-2 text-[#4c8ce8]"
                  >
                    <Phone size={15} />
                  </a>
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailsStudent(s)}
                    className="flex items-center gap-1.5 rounded-xl border border-[#dbe7df] bg-white px-3 py-2.5 text-xs font-bold text-[#53685d] transition hover:bg-[#f2f7f4]"
                  >
                    <Eye size={14} />
                    التفاصيل
                  </button>
                  <Button onClick={() => setPayingStudent(s)}>
                    دفع الآن
                  </Button>
                </div>
              </Td>
            </tr>
            );
          })}
        </Table>
        {!late.length && <EmptyState text="لا توجد مستحقات متأخرة" />}
      </Card>
      {detailsStudent && (
        <LatePaymentDetails
          student={detailsStudent}
          payments={outstandingPayments(detailsStudent.id)}
          courses={data.courses}
          enrollments={data.enrollments}
          levels={data.levels}
          onClose={() => setDetailsStudent(null)}
          onPay={() => {
            setDetailsStudent(null);
            setPayingStudent(detailsStudent);
          }}
        />
      )}
      {payingStudent && (
        <LatePaymentModal
          student={payingStudent}
          payments={outstandingPayments(payingStudent.id)}
          courses={data.courses}
          enrollments={data.enrollments}
          levels={data.levels}
          onClose={() => setPayingStudent(null)}
          onSave={(amount) => registerPartialPayment(payingStudent, amount)}
        />
      )}
    </>
  );
}

