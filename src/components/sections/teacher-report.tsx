"use client";

import { Course, Teacher, formatBillingMonth, money } from "@/lib/centman-store";


import { EmptyState, Modal } from "@/components/sections/shared-ui";
import type { Data } from "@/lib/section-data";

export function TeacherReport({
  teacher,
  data,
  month,
  onClose,
}: {
  teacher: Teacher;
  data: Data;
  month: string;
  onClose: () => void;
}) {
  const enrollmentSubjects = (course: Course) =>
    course.type === "باقة"
      ? (course.subjectIds || [])
        .map((subjectId) =>
          data.courses.find((item) => item.id === subjectId),
        )
        .filter((subject): subject is Course => Boolean(subject))
      : [course];
  const rows = data.collections.flatMap((collection) => {
    if (collection.date.slice(0, 7) !== month) return [];
    const payment = data.payments.find((item) => item.id === collection.paymentId);
    if (!payment || (payment.status !== "مدفوع" && payment.status !== "جزئي")) return [];
    const enrollment = data.enrollments.find((item) => item.id === payment.enrollmentId);
    const legacyCourseName = payment.month.match(/^(?:مادة|باقة):\s*(.+)$/)?.[1];
    const course = data.courses.find((item) => item.id === payment.courseId)
      || data.courses.find((item) => item.id === enrollment?.courseId)
      || data.courses.find((item) => item.name === legacyCourseName);
    const student = data.students.find((item) => item.id === payment.studentId);
    if (!course || !student) return [];
    const subjects = enrollmentSubjects(course);
    return subjects
      .filter((subject) => subject.teacher === teacher.name)
      .map((subject) => ({
        student,
        course,
        subject,
        collectedAmount: collection.amount / subjects.length,
      }));
  });
  return (
    <Modal title={`التقرير التفصيلي: ${teacher.name} • ${formatBillingMonth(month)}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f5f7ff] p-3 text-xs">
            <span className="block text-[#6c6c6c]">نسبة الأستاذ</span>
            <b className="mt-1 block text-lg text-[#5054c0]">
              {teacher.commission}%
            </b>
          </div>
          <div className="rounded-xl bg-[#faf4de] p-3 text-xs">
              <span className="block text-[#6c6c6c]">التحصيل خلال الشهر</span>
            <b className="mt-1 block text-lg text-[#a08500]">
                {money(rows.reduce((sum, row) => sum + row.collectedAmount, 0))}
            </b>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#e5e5e5]">
                <th className="p-3">الطالب</th>
                <th className="p-3">القسم/الدورة</th>
                <th className="p-3">المدفوع</th>
                <th className="p-3">حصة الأستاذ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, course, subject, collectedAmount }, index) => (
                <tr
                  key={`${student.id}-${course.id}-${subject.id}-${index}`}
                  className="border-b border-[#f1f1f1]"
                >
                  <td className="p-3">{student.name}</td>
                  <td className="p-3">
                    {course.type === "باقة"
                      ? `${course.name} • ${subject.name}`
                      : subject.name}
                  </td>
                  <td className="p-3">{money(collectedAmount)}</td>
                  <td className="p-3 font-bold text-[#5054c0]">
                    {money(Math.round((collectedAmount * teacher.commission) / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <EmptyState text="لا توجد تسجيلات مرتبطة بهذا الأستاذ بعد" />
        )}
      </div>
    </Modal>
  );
}
