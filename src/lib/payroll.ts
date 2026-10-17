import type { Course } from "@/lib/centman-store";
import type { Data } from "@/lib/section-data";

/** Refresh generated monthly drafts after collections or payment status change. */
export function refreshDraftPayouts(previous: Data, next: Data): Data {
  if (next.collections === previous.collections && next.payments === previous.payments) {
    return next;
  }

  return {
    ...next,
    payouts: next.payouts.map((payout) => {
      if (payout.status !== "مسودة") return payout;

      const studentIds = new Set<number>();
      let revenue = 0;

      for (const collection of next.collections) {
        if (collection.date.slice(0, 7) !== payout.month) continue;

        const payment = next.payments.find((item) => item.id === collection.paymentId);
        if (!payment || (payment.status !== "مدفوع" && payment.status !== "جزئي")) continue;

        const enrollment = next.enrollments.find((item) => item.id === payment.enrollmentId);
        const legacyCourseName = payment.month.match(/^(?:مادة|باقة):\s*(.+)$/)?.[1];
        const course = next.courses.find((item) => item.id === payment.courseId)
          || next.courses.find((item) => item.id === enrollment?.courseId)
          || next.courses.find((item) => item.name === legacyCourseName);
        if (!course) continue;

        const subjects = course.type === "باقة"
          ? (course.subjectIds || [])
              .map((subjectId) => next.courses.find((item) => item.id === subjectId))
              .filter((subject): subject is Course => Boolean(subject))
          : [course];
        if (!subjects.length) continue;

        const teacherSubjects = subjects.filter((subject) => subject.teacher === payout.teacher);
        if (!teacherSubjects.length) continue;

        studentIds.add(payment.studentId);
        revenue += collection.amount * teacherSubjects.length / subjects.length;
      }

      const roundedRevenue = Math.round(revenue);
      return {
        ...payout,
        studentCount: studentIds.size,
        revenue: roundedRevenue,
        amount: Math.round((roundedRevenue * payout.commission) / 100),
      };
    }),
  };
}
