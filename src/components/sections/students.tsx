"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Payment, Student, money, today } from "@/lib/centman-store";
import { discountedPrice, paymentBillingMonth, remainingPaymentAmount } from "@/lib/monthly-billing";
import { registerPaymentCollection } from "@/lib/payment-registration";


import { Actions, EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { PaymentRegisterModal } from "@/components/sections/payment-register-modal";
import { StudentHistory } from "@/components/sections/student-history";
import { StudentEnrollmentForm } from "@/components/sections/student-enrollment-form";


export function Students({ data, update, deleteStudent }: Props) {
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
  ) => {
    const id = student.id || Date.now();
    const existingStudent = data.students.find((item) => item.id === id);
    const active = data.enrollments.filter(
      (enrollment) =>
        enrollment.studentId === id && enrollment.status === "نشط",
    );
    const ended = data.enrollments.map((enrollment) => {
      if (!active.some((item) => item.id === enrollment.id)) return enrollment;
      if (!courseIds.includes(enrollment.courseId)) {
        return { ...enrollment, status: "منتهية" as const, removedAt: today };
      }
      const course = data.courses.find((item) => item.id === enrollment.courseId);
      const discount = Math.max(0, Math.min(paidAmounts.discounts[enrollment.courseId] || 0, course?.price || 0));
      return { ...enrollment, discount };
    });
    const additions = courseIds
      .filter(
        (courseId) =>
          !active.some((enrollment) => enrollment.courseId === courseId),
      )
      .map((courseId) => ({
        id: Date.now() + courseId,
        studentId: id,
        courseId,
        enrolledAt: today,
        status: "نشط" as const,
        source: student.id ? ("إضافة" as const) : ("اشتراك أول" as const),
        discount: Math.max(0, Math.min(paidAmounts.discounts[courseId] || 0, data.courses.find((course) => course.id === courseId)?.price || 0)),
      }));
    const updatedStudent = {
      ...student,
      id,
      course:
        data.courses.find((course) => course.id === courseIds[0])?.name ||
        student.course,
    };
    const students = student.id
      ? data.students.map((item) => (item.id === id ? updatedStudent : item))
      : [...data.students, updatedStudent];
    const yearChanged = Boolean(
      existingStudent &&
      student.subscriptionYear &&
      student.subscriptionYear !== existingStudent.subscriptionYear,
    );
    const charges =
      !student.id || yearChanged
        ? [
          {
            label: `رسوم الاشتراك ${student.subscriptionYear || 2026}`,
            total: student.enrollmentFee || 0,
            paid: paidAmounts.annual,
          },
          ...(!student.id
            ? courseIds.map((courseId) => {
              const course = data.courses.find(
                (item) => item.id === courseId,
              );
              return {
                label: `${course?.type || "المادة"}: ${course?.name || "تسجيل"}`,
                total: Math.max(0, (course?.price || 0) - (paidAmounts.discounts[courseId] || 0)),
                paid: paidAmounts.courses[courseId] || 0,
              };
            })
            : []),
        ]
        : [];
    const registrationPayments = charges
      .filter((charge) => charge.total > 0)
      .map((charge, index): Payment => {
        const paid = Math.max(0, Math.min(charge.paid, charge.total));
        return {
          id: Date.now() + index,
          studentId: id,
          student: student.name,
          amount: paid,
          totalAmount: charge.total,
          month: charge.label,
          status: paid === charge.total ? "مدفوع" : paid > 0 ? "جزئي" : "متأخر",
          date: today,
          method: paid > 0 ? "نقدي" : undefined,
          receiptNumber:
            paid > 0
              ? `REC-${today.replaceAll("-", "")}-${String(id).slice(-4)}-${index + 1}`
              : undefined,
        };
      });
    const due = charges.reduce(
      (sum, charge) =>
        sum + Math.max(0, charge.total - Math.min(charge.paid, charge.total)),
      0,
    );
    const adjustedPayments = data.payments.map((payment) => {
      if (payment.status !== "مسودة" || payment.enrollmentId == null) return payment;
      const enrollment = [...ended, ...additions].find((item) => item.id === payment.enrollmentId);
      const course = enrollment && data.courses.find((item) => item.id === enrollment.courseId);
      return enrollment && course
        ? { ...payment, totalAmount: discountedPrice(course.price, enrollment.discount) }
        : payment;
    });
    const nextPayments = [...adjustedPayments, ...registrationPayments];
    const outstandingDue = nextPayments
      .filter((payment) => payment.studentId === id && payment.status !== "ملغاة")
      .reduce((sum, payment) => sum + Math.max(0, (payment.totalAmount ?? payment.amount) - payment.amount), 0);
    update(
      {
        ...data,
        students: students.map((item) =>
          item.id === id
            ? {
              ...item,
              due: student.id ? outstandingDue : due,
              lastPayment: !student.id && registrationPayments.some(
                (payment) => payment.amount > 0,
              )
                ? today
                : item.lastPayment,
            }
            : item,
        ),
        enrollments: [...ended, ...additions],
        payments: nextPayments,
      },
      student.id
        ? "تم حفظ بيانات الطالب وتحديث التسجيلات"
        : "تم حفظ الطالب وتسجيل الدفعات",
    );
  };
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
          onSave={(student, courseIds, paidAmounts) => {
            save(student, courseIds, paidAmounts);
            setOpen(false);
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
          onSave={(amount, method) => {
            const remaining = remainingPaymentAmount(registeringPayment);
            update(
              registerPaymentCollection(data, registeringPayment, amount, method),
              amount < remaining ? "تم تسجيل دفعة جزئية" : "تم تسجيل الدفعة وإصدار الوصل",
            );
            setRegisteringPayment(null);
          }}
        />
      )}
    </>
  );
}





