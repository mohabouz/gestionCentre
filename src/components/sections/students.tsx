"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Payment, Student, money } from "@/lib/centman-store";
import { paymentBillingMonth, remainingPaymentAmount } from "@/lib/monthly-billing";


import { Actions, EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { PaymentRegisterModal } from "@/components/sections/payment-register-modal";
import { StudentHistory } from "@/components/sections/student-history";
import { StudentEnrollmentForm } from "@/components/sections/student-enrollment-form";


export function Students({ data, deleteStudent, registerPayment, saveStudent }: Props) {
  const [query, setQuery] = useState("");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [registeringPayment, setRegisteringPayment] = useState<Payment | null>(null);
  const [open, setOpen] = useState(false);
  const [subscriptionFee, setSubscriptionFee] = useState(200);
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("settings")))
      .then((settings) => setSubscriptionFee(Math.max(0, Number(settings.subscriptionFee) || 0)))
      .catch(() => undefined);
  }, []);
  const enrolledCourseNames = (studentId: number) =>
    data.enrollments
      .filter(
        (enrollment) =>
          enrollment.studentId === studentId && enrollment.status === "نشط",
      )
      .map(
        (enrollment) =>
          data.courses.find((course) => course.id === enrollment.courseId)
            ?.name,
      )
      .filter((name): name is string => Boolean(name));
  const courseLabel = (student: Student) => {
    const enrolled = enrolledCourseNames(student.id);
    return enrolled.length ? enrolled.join(" • ") : student.course;
  };
  const startPaymentRegistration = (student: Student) => {
    const pendingPayment = data.payments
      .filter((payment) =>
        payment.studentId === student.id &&
        payment.status !== "ملغاة" &&
        remainingPaymentAmount(payment) > 0,
      )
      .sort((left, right) =>
        paymentBillingMonth(left).localeCompare(paymentBillingMonth(right)) || left.id - right.id,
      )[0];

    setRegisteringPayment(pendingPayment || {
      id: 0,
      studentId: student.id,
      student: student.name,
      amount: 0,
      totalAmount: student.due,
      month: "دفعة إضافية",
      status: "متأخر",
      date: "",
    });
  };
  const filtered = data.students.filter((student) => {
    const matchesQuery = `${student.name} ${student.phone} ${courseLabel(student)}`.includes(query);
    const matchesEnrollment =
      enrollmentFilter === "all" ||
      data.enrollments.some(
        (enrollment) =>
          enrollment.studentId === student.id &&
          enrollment.courseId === Number(enrollmentFilter) &&
          enrollment.status === "نشط",
      );
    return matchesQuery && matchesEnrollment;
  });
  const save = (
    student: Student,
    courseIds: number[],
    paidAmounts: { annual: number; courses: Record<number, number>; discounts: Record<number, number> },
  ) => saveStudent?.(student, courseIds, paidAmounts);
  return (
    <>
      <PageTitle
        eyebrow="إدارة الطلاب"
        title="الطلاب"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={15} className="ml-2 inline" />
            اشتراك طالب
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
          <div>
            <p className="text-sm font-black text-[#17251f]">قائمة الطلاب</p>
            <p className="mt-1 text-xs text-[#94a49b]">
              {data.students.length} طالب مسجل في المركز
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={enrollmentFilter}
              onChange={(event) => setEnrollmentFilter(event.target.value)}
              className="rounded-xl border border-[#dce7df] bg-white px-3 py-2 text-xs text-[#64786c] outline-none"
            >
              <option value="all">كل التسجيلات</option>
              {data.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] px-3 text-[#9aaba1]">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-48 bg-transparent py-2 text-xs outline-none"
                placeholder="ابحث عن طالب..."
              />
            </div>
          </div>
        </div>
        <Table>
          <Th>الطالب</Th>
          <Th>واتساب</Th>
          <Th>الدورة</Th>
          <Th>الحالة</Th>
          <Th>المستحقات</Th>
          <Th>إجراء</Th>
          {filtered.map((student) => (
            <tr key={student.id}>
              <Td>
                <button
                  onClick={() => setHistoryStudent(student)}
                  className="font-bold text-[#5054c0] hover:underline"
                >
                  {student.name}
                </button>
              </Td>
              <Td>{student.whatsapp || student.phone}</Td>
              <Td>{courseLabel(student) || "غير مسجل"}</Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${student.status === "نشط" ? "bg-[#e4e8fd] text-[#3a3b9b]" : "bg-[#f1f1f1] text-[#6c6c6c]"}`}
                >
                  {student.status}
                </span>
              </Td>
              <Td
                className={
                  student.due ? "font-bold text-[#d56558]" : "text-[#5054c0]"
                }
              >
                {student.due ? money(student.due) : "مسدد"}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  {student.due > 0 && (
                    <button
                      onClick={() => startPaymentRegistration(student)}
                      className="rounded-lg bg-[#e9f8ef] px-2 py-1 text-[10px] font-bold text-[#008a55]"
                    >
                      دفعة
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryStudent(student)}
                    className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]"
                  >
                    السجل
                  </button>
                  <Actions
                    onEdit={() => {
                      setEditing(student);
                      setOpen(true);
                    }}
                    onDelete={() => deleteStudent?.(student.id)}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!filtered.length && <EmptyState text="لا توجد نتائج" />}
      </Card>
      {open && (
        <StudentEnrollmentForm
          student={editing}
          courses={data.courses}
          levels={data.levels}
          enrollments={data.enrollments}
          subscriptionFee={subscriptionFee}
          onClose={() => setOpen(false)}
          onSave={async (student, courseIds, paidAmounts) => {
            if (await save(student, courseIds, paidAmounts)) setOpen(false);
          }}
        />
      )}
      {historyStudent && (
        <StudentHistory
          student={historyStudent}
          courseLabel={courseLabel(historyStudent)}
          payments={data.payments.filter(
            (payment) => payment.studentId === historyStudent.id,
          )}
          enrollments={data.enrollments.filter(
            (enrollment) => enrollment.studentId === historyStudent.id,
          )}
          courses={data.courses}
          onClose={() => setHistoryStudent(null)}
        />
      )}
      {registeringPayment && (
        <PaymentRegisterModal
          payment={registeringPayment}
          onClose={() => setRegisteringPayment(null)}
          onSave={async (amount) => {
            if (await registerPayment?.(registeringPayment.id, amount)) {
              setRegisteringPayment(null);
            }
          }}
        />
      )}
    </>
  );
}





