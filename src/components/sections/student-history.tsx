"use client";

import { Course, Enrollment, Payment, Student, money } from "@/lib/centman-store";


import { EmptyState, Modal } from "@/components/sections/shared-ui";

export function StudentHistory({
  student,
  courseLabel,
  payments,
  enrollments,
  courses,
  onClose,
}: {
  student: Student;
  courseLabel: string;
  payments: Payment[];
  enrollments: Enrollment[];
  courses: Course[];
  onClose: () => void;
}) {
  return (
    <Modal title={`السجل الكامل: ${student.name}`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-[#f5f7ff] p-4">
          <b>الاشتراك السنوي</b>
          <p className="mt-1 text-[#6c6c6c]">
            رسوم الاشتراك: {money(student.enrollmentFee || 0)} • الدورة الحالية: {""}
            {courseLabel || "غير مسجل"}
          </p>
          <p className="mt-1 text-[#6c6c6c]">
            رسوم الاشتراك: {money(student.enrollmentFee || 0)} • الدورة الحالية:{" "}
            {student.course}
          </p>
        </div>
        <div>
          <b className="mb-2 block">تاريخ التسجيلات</b>
          {enrollments.length ? (
            enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="mb-2 flex items-center justify-between rounded-xl border border-[#e5e5e5] p-3"
              >
                <span>
                  {courses.find((course) => course.id === enrollment.courseId)
                    ?.name || "عنصر محذوف"}{" "}
                  • بدأ {enrollment.enrolledAt}
                  {enrollment.discount ? ` • خصم ${money(enrollment.discount)}` : ""}
                  {enrollment.removedAt
                    ? ` • انتهى ${enrollment.removedAt}`
                    : ""}
                </span>
                <b
                  className={
                    enrollment.status === "نشط"
                      ? "text-[#5054c0]"
                      : "text-[#a08500]"
                  }
                >
                  {enrollment.status}
                </b>
              </div>
            ))
          ) : (
            <EmptyState text="لا توجد تسجيلات محفوظة" />
          )}
        </div>
        {payments.length ? (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-[#e5e5e5] p-4"
            >
              <span>
                {payment.month}
              </span>
              <b
                className={
                  payment.status === "مدفوع"
                    ? "text-[#5054c0]"
                    : "text-[#a08500]"
                }
              >
                {money(payment.amount)} • {payment.status}
              </b>
            </div>
          ))
        ) : (
          <EmptyState text="لا توجد دفعات مسجلة" />
        )}
        <div className="rounded-xl bg-[#faf4de] p-4 font-bold text-[#a08500]">
          المتأخرات الحالية: {money(student.due)}
        </div>
      </div>
    </Modal>
  );
}
