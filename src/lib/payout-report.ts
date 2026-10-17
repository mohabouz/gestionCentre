import type { Teacher } from "@/lib/centman-store";
import { formatBillingMonth } from "@/lib/centman-store";
import { courseLevelLabel } from "@/lib/course-level";
import type { Data } from "@/lib/section-data";

type ReportRow = {
  subject: string;
  level: string;
  levelOrder: number;
  student: string;
  paid: number;
  teacherShare: number;
};

function teacherPaymentRows(data: Data, teacher: Teacher, month: string): ReportRow[] {
  const grouped = new Map<string, ReportRow>();

  for (const collection of data.collections) {
    if (collection.date.slice(0, 7) !== month) continue;

    const payment = data.payments.find((item) => item.id === collection.paymentId);
    if (!payment || (payment.status !== "مدفوع" && payment.status !== "جزئي")) continue;

    const enrollment = data.enrollments.find((item) => item.id === payment.enrollmentId);
    const legacyCourseName = payment.month.match(/^(?:مادة|باقة):\s*(.+)$/)?.[1];
    const course = data.courses.find((item) => item.id === payment.courseId)
      || data.courses.find((item) => item.id === enrollment?.courseId)
      || data.courses.find((item) => item.name === legacyCourseName);
    const student = data.students.find((item) => item.id === payment.studentId);
    if (!course || !student) continue;

    const subjects = course.type === "باقة"
      ? (course.subjectIds || [])
          .map((subjectId) => data.courses.find((item) => item.id === subjectId))
          .filter((subject): subject is Data["courses"][number] => Boolean(subject))
      : [course];
    if (!subjects.length) continue;

    const teacherSubjects = subjects.filter((subject) => subject.teacher === teacher.name);
    if (!teacherSubjects.length) continue;

    for (const subject of teacherSubjects) {
      const key = `${course.id}:${subject.id}:${student.id}`;
      const allocatedPayment = collection.amount / subjects.length;
      const level = courseLevelLabel(subject, data.levels)
        || courseLevelLabel(course, data.levels)
        || "بدون مستوى";
      const levelIds = subject.levelIds?.length
        ? subject.levelIds
        : subject.levelId != null
          ? [subject.levelId]
          : course.levelIds?.length
            ? course.levelIds
            : course.levelId != null
              ? [course.levelId]
              : [];
      const levelOrder = Math.min(
        ...data.levels
          .filter((item) => levelIds.some((id) => Number(id) === Number(item.id)))
          .map((item) => item.sortOrder),
        Number.MAX_SAFE_INTEGER,
      );
      const existing = grouped.get(key);
      if (existing) {
        existing.paid += allocatedPayment;
        existing.teacherShare += allocatedPayment * teacher.commission / 100;
      } else {
        grouped.set(key, {
          subject: subject.name,
          level,
          levelOrder,
          student: student.name,
          paid: allocatedPayment,
          teacherShare: allocatedPayment * teacher.commission / 100,
        });
      }
    }
  }

  return [...grouped.values()].sort((left, right) =>
    left.levelOrder - right.levelOrder
      || left.level.localeCompare(right.level, "ar")
      || left.subject.localeCompare(right.subject, "ar")
      || left.student.localeCompare(right.student, "ar"),
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export function printTeacherPaymentReport(data: Data, teacher: Teacher, month: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const rows = teacherPaymentRows(data, teacher, month);
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const totalTeacherShare = rows.reduce((sum, row) => sum + row.teacherShare, 0);
  const tableRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(`${row.subject} - ${row.level}`)}</td>
      <td>${escapeHtml(row.student)}</td>
      <td>${row.paid.toLocaleString("fr-MA")} MAD</td>
      <td>${Math.round(row.teacherShare).toLocaleString("fr-MA")} MAD</td>
    </tr>
  `).join("");

  printWindow.document.write(`<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير أداء الأستاذ ${escapeHtml(teacher.name)}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#17251f;margin:36px}
          h1{font-size:22px;margin:0 0 8px}
          .meta{color:#64786c;margin-bottom:24px}
          .summary{display:flex;gap:24px;margin-bottom:24px}
          .summary div{border:1px solid #dce7df;border-radius:10px;padding:12px 18px}
          table{border-collapse:collapse;width:100%;font-size:13px}
          th,td{border:1px solid #dce7df;padding:10px;text-align:right}
          th{background:#f2f7f4}
          tfoot{font-weight:bold;background:#f7f7f7}
          @media print{body{margin:16mm}}
        </style>
      </head>
      <body>
        <h1>تقرير المجموعات والتلاميذ المؤدين</h1>
        <div class="meta">الأستاذ: ${escapeHtml(teacher.name)} — الشهر: ${escapeHtml(formatBillingMonth(month))}</div>
        <div class="summary">
          <div>نسبة الأستاذ: <strong>${teacher.commission}%</strong></div>
          <div>المبلغ المؤدى: <strong>${Math.round(totalPaid).toLocaleString("fr-MA")} MAD</strong></div>
          <div>مستحق الأستاذ: <strong>${Math.round(totalTeacherShare).toLocaleString("fr-MA")} MAD</strong></div>
        </div>
        <table>
          <thead><tr><th>المادة - المستوى</th><th>التلميذ</th><th>المبلغ المؤدى</th><th>حصة الأستاذ</th></tr></thead>
          <tbody>${tableRows || '<tr><td colspan="4">لا توجد دفعات مسجلة لهذا الشهر.</td></tr>'}</tbody>
          <tfoot><tr><td colspan="2">المجموع</td><td>${Math.round(totalPaid).toLocaleString("fr-MA")} MAD</td><td>${Math.round(totalTeacherShare).toLocaleString("fr-MA")} MAD</td></tr></tfoot>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
