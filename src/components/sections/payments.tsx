"use client";

import { Fragment, useState } from "react";
import { ChevronLeft, ChevronUp, Search } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Payment, currentMonth, formatBillingMonth, money } from "@/lib/centman-store";
import { paymentBillingMonth, recordedPaymentAmount, remainingPaymentAmount } from "@/lib/monthly-billing";
import { courseLevelLabel } from "@/lib/course-level";
import { CoursePicker } from "@/components/course-picker";


import { EmptyState, ReceiptActions, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { PaymentRegisterModal } from "@/components/sections/payment-register-modal";
import { PaymentRevisionModal } from "@/components/sections/payment-revision-modal";
import { MonthlyStudentPaymentModal } from "@/components/sections/monthly-student-payment-modal";


export function Payments({ data, registerPayment, registerPayments, adjustPayment, generateMonthlyPayments: generatePayments, monthly }: Props & { monthly: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [dueOnly, setDueOnly] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [registeringPayment, setRegisteringPayment] = useState<Payment | null>(null);
  const [registeringStudentPayments, setRegisteringStudentPayments] = useState<Payment[] | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const generateMonthlyPayments = () => void generatePayments?.(selectedMonth);
  const record = async (payment: Payment, amount: number) => {
    const remaining = remainingPaymentAmount(payment);
    const paidNow = Math.max(0, Math.min(amount, remaining));
    if (!paidNow) return;
    if (await registerPayment?.(payment.id, paidNow)) {
      setRegisteringPayment(null);
    }
  };
  const returnToDraft = (payment: Payment) => void adjustPayment?.(payment.id, "draft");
  const revisePayment = async (payment: Payment, amount: number) => {
    if (await adjustPayment?.(payment.id, "revise", amount)) setEditingPayment(null);
  };
  const cancelDraft = (payment: Payment) => void adjustPayment?.(payment.id, "cancel");
  const paymentCourseLabel = (payment: Payment) => {
    const course = data.courses.find(
      (item) => Number(item.id) === Number(payment.courseId),
    );
    if (!course) return payment.month.includes("رسوم") ? "رسوم التسجيل" : "غير مرتبط بمادة";
    const level = courseLevelLabel(course, data.levels);
    return level ? `${course.name} - ${level}` : course.name;
  };
  const payments = data.payments.filter(
    (payment) =>
      `${payment.student} ${paymentCourseLabel(payment)}`.includes(query) &&
      (courseFilter == null || Number(payment.courseId) === Number(courseFilter)) &&
      (!monthly ||
        (!payment.month.startsWith("رسوم الاشتراك") &&
          paymentBillingMonth(payment) === selectedMonth)),
  );
  const activePayments = payments.filter((p) => p.status !== "ملغاة");
  const monthlyGroups = Array.from(
    activePayments.reduce((groups, payment) => {
      const existing = groups.get(payment.studentId) || [];
      existing.push(payment);
      groups.set(payment.studentId, existing);
      return groups;
    }, new Map<number, Payment[]>()),
  )
    .map(([studentId, studentPayments]) => ({ studentId, payments: studentPayments }))
    .filter(
      (group) =>
        !dueOnly ||
        group.payments.some((payment) => remainingPaymentAmount(payment) > 0),
    );
  const summaryPayments = monthly
    ? monthlyGroups.flatMap((group) => group.payments)
    : activePayments;
  const total = summaryPayments.reduce(
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <CoursePicker
                courses={data.courses}
                levels={data.levels}
                value={courseFilter}
                onChange={setCourseFilter}
                allLabel="جميع المواد والباقات"
                compact
                className="min-w-[240px]"
              />
              <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-3 text-[#9aaba1]">
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-44 bg-transparent py-2 text-xs outline-none" placeholder="ابحث..." />
              </div>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setDueOnly((current) => !current)}
              aria-pressed={dueOnly}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${dueOnly ? "border-[#e2b5ae] bg-[#fff0ee] text-[#c4584e]" : "border-[#dce7df] bg-white text-[#60766b] hover:bg-[#f7faf8]"}`}
            >
              المستحقات فقط
            </button>
            <CoursePicker
              courses={data.courses}
              levels={data.levels}
              value={courseFilter}
              onChange={setCourseFilter}
              allLabel="جميع المواد والباقات"
              compact
              className="min-w-[240px]"
            />
            <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-[#f8faf9] px-3 text-[#9aaba1]">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none sm:w-44" placeholder="ابحث عن تلميذ..." />
            </div>
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
            {money(summaryPayments.reduce((s, p) => s + recordedPaymentAmount(p), 0))}
          </b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">المتبقي</p>
          <b className="mt-2 block text-xl text-[#d56558]">
            {money(
              summaryPayments.reduce(
                (sum, p) => sum + remainingPaymentAmount(p),
                0,
              ),
            )}
          </b>
        </Card>
      </div>
      <Card>
        <Table>
          <Th>التلميذ</Th>
          {!monthly && <Th>المادة / الباقة والمستوى</Th>}
          <Th>الشهر</Th>
          <Th>المدفوع</Th>
          <Th>المتبقي</Th>
          <Th>الحالة</Th>
          <Th>إجراء</Th>
          {monthly && monthlyGroups.map((group) => {
            const paid = group.payments.reduce(
              (sum, payment) => sum + recordedPaymentAmount(payment),
              0,
            );
            const remaining = group.payments.reduce(
              (sum, payment) => sum + remainingPaymentAmount(payment),
              0,
            );
            const expanded = expandedStudentId === group.studentId;
            return (
              <Fragment key={group.studentId}>
              <tr>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudentId(expanded ? null : group.studentId)
                      }
                      aria-expanded={expanded}
                      aria-label={expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      title={expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5054c0] transition duration-200 hover:scale-105 hover:bg-[#e2e4ff]"
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    <b>{group.payments[0].student}</b>
                  </div>
                </Td>
                <Td>{formatBillingMonth(selectedMonth)}</Td>
                <Td className="font-bold text-[#008a55]">{money(paid)}</Td>
                <Td className={remaining ? "font-bold text-[#d56558]" : "text-[#84938b]"}>{money(remaining)}</Td>
                <Td>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${remaining === 0 ? "bg-[#e9f8ef] text-[#008a55]" : paid > 0 ? "bg-[#faf4de] text-[#a08500]" : "bg-[#eef4ff] text-[#4c73c8]"}`}>
                    {remaining === 0 ? "مدفوع" : paid > 0 ? "جزئي" : "غير مدفوع"}
                  </span>
                </Td>
                <Td>
                  {remaining > 0 ? (
                    <Button onClick={() => setRegisteringStudentPayments(group.payments.filter((payment) => remainingPaymentAmount(payment) > 0))}>
                      تسجيل دفعات التلميذ
                    </Button>
                  ) : (
                    <span className="text-[10px] text-[#84938b]">مكتمل</span>
                  )}
                </Td>
              </tr>
              <tr>
                <td colSpan={6} className="border-0 bg-[#f7faf8] p-0">
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                    <div className={`grid gap-3 border-b border-[#e5ece8] transition-[padding] duration-300 md:grid-cols-2 xl:grid-cols-3 ${expanded ? "p-4" : "p-0"}`}>
                      {group.payments.map((payment) => {
                        const paymentRemaining = remainingPaymentAmount(payment);
                        const paymentPaid = recordedPaymentAmount(payment);
                        return (
                          <div
                            key={payment.id}
                            className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_3px_10px_rgba(28,67,47,0.04)]"
                          >
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <b className="text-xs leading-5 text-[#2e4438]">
                                {paymentCourseLabel(payment)}
                              </b>
                              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${paymentRemaining === 0 ? "bg-[#e9f8ef] text-[#008a55]" : paymentPaid > 0 ? "bg-[#faf4de] text-[#a08500]" : "bg-[#fff0ee] text-[#d56558]"}`}>
                                {paymentRemaining === 0 ? "مدفوع" : paymentPaid > 0 ? "جزئي" : "غير مدفوع"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg bg-[#f5f7f6] p-2">
                                <span className="block text-[9px] text-[#89978f]">المطلوب</span>
                                <b className="mt-1 block text-[11px]">{money(payment.totalAmount ?? payment.amount)}</b>
                              </div>
                              <div className="rounded-lg bg-[#edf8f2] p-2">
                                <span className="block text-[9px] text-[#89978f]">المدفوع</span>
                                <b className="mt-1 block text-[11px] text-[#008a55]">{money(paymentPaid)}</b>
                              </div>
                              <div className="rounded-lg bg-[#fff1ef] p-2">
                                <span className="block text-[9px] text-[#89978f]">المتبقي</span>
                                <b className="mt-1 block text-[11px] text-[#d56558]">{money(paymentRemaining)}</b>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#edf1ef] pt-3">
                              {(payment.status === "مدفوع" || payment.status === "جزئي") && (
                                <>
                                  <Button variant="outline" onClick={() => setEditingPayment(payment)}>
                                    تعديل
                                  </Button>
                                  <Button variant="outline" onClick={() => returnToDraft(payment)}>
                                    إرجاع لمسودة
                                  </Button>
                                </>
                              )}
                              {payment.status === "مسودة" && (
                                <Button variant="danger" onClick={() => cancelDraft(payment)}>
                                  إلغاء المسودة
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                </td>
              </tr>
              </Fragment>
            );
          })}
          {!monthly && payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <b>{p.student}</b>
              </Td>
              <Td>
                <b className="text-[#34483d]">{paymentCourseLabel(p)}</b>
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
          onSave={(amount) => void record(registeringPayment, amount)}
        />
      )}
      {registeringStudentPayments && (
        <MonthlyStudentPaymentModal
          payments={registeringStudentPayments}
          courses={data.courses}
          levels={data.levels}
          onClose={() => setRegisteringStudentPayments(null)}
          onSave={async (amounts) => {
            const saved = await registerPayments?.(
              registeringStudentPayments.map((payment) => ({
                paymentId: payment.id,
                amount: amounts[payment.id] || 0,
              })),
            );
            if (saved) setRegisteringStudentPayments(null);
          }}
        />
      )}
    </>
  );
}


