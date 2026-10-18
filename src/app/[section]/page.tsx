"use client";

import { usePathname } from "next/navigation";
import { Card, CentmanShell, Toast } from "@/components/centman-shell";
import { CourseManagement } from "@/components/course-management";
import { LevelManagement } from "@/components/level-management";
import { useAuth } from "@/components/auth-provider";
import { Attendance } from "@/components/sections/attendance";
import { AnnualFees } from "@/components/sections/annual-fees";
import { Expenses } from "@/components/sections/expenses";
import { EnrollmentRegistrations } from "@/components/sections/enrollment-registrations";
import { LateStudents } from "@/components/sections/late-students";
import { Payments } from "@/components/sections/payments";
import { Payouts } from "@/components/sections/payouts";
import { Schedule } from "@/components/sections/schedule";
import { SettingsPage } from "@/components/sections/settings";
import { Students } from "@/components/sections/students";
import { Teachers } from "@/components/sections/teachers";
import { useSectionData } from "@/hooks/use-section-data";

export default function SectionPage() {
  const pathname = usePathname();
  const section = pathname.split("/")[1] || "students";
  const {
    data,
    update,
    deleteStudent,
    createExpense,
    deleteExpense,
    saveTeacher,
    deleteTeacher,
    saveCourse,
    deleteCourse,
    saveSession,
    saveRoom,
    deleteRoom,
    saveAttendance,
    registerPayment,
    registerPayments,
    generateMonthlyPayments,
    toast,
  } = useSectionData();
  const { user } = useAuth();
  const restricted =
    user?.role === "ADMIN" &&
    [
      "expenses",
      "registrations",
      "payments",
      "annual-fees",
      "late-students",
      "payouts",
      "settings",
    ].includes(section);
  const content = restricted ? (
    <Card>
      <div className="py-16 text-center">
        <p className="text-lg font-black text-[#17251f]">
          ليس لديك صلاحية للوصول إلى هذه الصفحة
        </p>
        <p className="mt-2 text-xs text-[#84938b]">
          هذه المعلومات متاحة للسوبر-أدمن فقط.
        </p>
      </div>
    </Card>
  ) : section === "students" ? (
    <Students data={data} update={update} deleteStudent={deleteStudent} registerPayment={registerPayment} />
  ) : section === "teachers" ? (
    <Teachers
      data={data}
      update={update}
      saveTeacher={saveTeacher}
      deleteTeacher={deleteTeacher}
    />
  ) : section === "courses" ? (
    <CourseManagement
      data={{
        students: data.students,
        teachers: data.teachers,
        courses: data.courses,
        levels: data.levels,
        enrollments: data.enrollments,
      }}
      update={(next, message) => update({ ...data, ...next }, message)}
      saveCourse={saveCourse}
      deleteCourseById={deleteCourse}
    />
  ) : section === "levels" ? (
    <LevelManagement
      levels={data.levels}
      onUpdate={(levels) => update({ ...data, levels }, "تم حفظ تعديلات المستوى")}
    />
  ) : section === "expenses" ? (
    <Expenses
      data={data}
      update={update}
      createExpense={createExpense}
      deleteExpense={deleteExpense}
    />
  ) : section === "registrations" ? (
    <EnrollmentRegistrations data={data} update={update} />
  ) : section === "payments" ? (
    <Payments data={data} update={update} registerPayment={registerPayment} registerPayments={registerPayments} generateMonthlyPayments={generateMonthlyPayments} monthly />
  ) : section === "annual-fees" ? (
    <AnnualFees data={data} update={update} />
  ) : section === "late-students" ? (
    <LateStudents data={data} update={update} registerPayments={registerPayments} />
  ) : section === "payouts" ? (
    <Payouts data={data} update={update} />
  ) : section === "schedule" ? (
    <Schedule
      data={data}
      update={update}
      saveSession={saveSession}
      saveRoom={saveRoom}
      deleteRoom={deleteRoom}
    />
  ) : section === "attendance" ? (
    <Attendance data={data} update={update} saveAttendance={saveAttendance} />
  ) : (
    <SettingsPage />
  );
  return (
    <CentmanShell notificationStudents={data.students}>
      <div className="mx-auto max-w-[1450px]">{content}</div>
      <Toast message={toast} />
    </CentmanShell>
  );
}
