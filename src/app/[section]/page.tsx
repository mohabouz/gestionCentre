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
    deleteStudent,
    createExpense,
    deleteExpense,
    saveTeacher,
    deleteTeacher,
    saveCourse,
    deleteCourse,
    createEnrollment,
    saveLevel,
    saveSession,
    saveRoom,
    deleteRoom,
    saveAttendance,
    registerPayment,
    registerPayments,
    adjustPayment,
    generatePayouts,
    adjustPayout,
    generateMonthlyPayments,
    collectAnnualFee,
    saveStudent,
    toast,
  } = useSectionData(section);
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
    <Students data={data} deleteStudent={deleteStudent} registerPayment={registerPayment} saveStudent={saveStudent} />
  ) : section === "teachers" ? (
    <Teachers
      data={data}
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
      saveCourse={saveCourse}
      deleteCourseById={deleteCourse}
      createEnrollment={createEnrollment}
    />
  ) : section === "levels" ? (
    <LevelManagement
      levels={data.levels}
      onSave={saveLevel}
    />
  ) : section === "expenses" ? (
    <Expenses
      data={data}
      createExpense={createExpense}
      deleteExpense={deleteExpense}
    />
  ) : section === "registrations" ? (
    <EnrollmentRegistrations data={data} />
  ) : section === "payments" ? (
    <Payments data={data} registerPayment={registerPayment} registerPayments={registerPayments} adjustPayment={adjustPayment} generateMonthlyPayments={generateMonthlyPayments} monthly />
  ) : section === "annual-fees" ? (
    <AnnualFees data={data} collectAnnualFee={collectAnnualFee} />
  ) : section === "late-students" ? (
    <LateStudents data={data} registerPayments={registerPayments} />
  ) : section === "payouts" ? (
    <Payouts data={data} generatePayouts={generatePayouts} adjustPayout={adjustPayout} />
  ) : section === "schedule" ? (
    <Schedule
      data={data}
      saveSession={saveSession}
      saveRoom={saveRoom}
      deleteRoom={deleteRoom}
    />
  ) : section === "attendance" ? (
    <Attendance data={data} saveAttendance={saveAttendance} />
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
