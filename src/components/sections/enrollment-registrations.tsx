"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, PageTitle } from "@/components/centman-shell";
import { CoursePicker } from "@/components/course-picker";
import { EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { courseLevelLabel } from "@/lib/course-level";
import { money } from "@/lib/centman-store";
import { discountedPrice } from "@/lib/monthly-billing";

export function EnrollmentRegistrations({ data }: Props) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const registrations = data.enrollments
    .map((enrollment) => ({
      enrollment,
      student: data.students.find(
        (student) => Number(student.id) === Number(enrollment.studentId),
      ),
      course: data.courses.find(
        (course) => Number(course.id) === Number(enrollment.courseId),
      ),
    }))
    .filter(
      ({ student, course }) =>
        Boolean(student && course) &&
        (courseFilter == null || Number(course?.id) === Number(courseFilter)) &&
        `${student?.name || ""} ${course?.name || ""} ${course ? courseLevelLabel(course, data.levels) : ""}`.includes(query),
    )
    .sort((left, right) =>
      right.enrollment.enrolledAt.localeCompare(left.enrollment.enrolledAt),
    );
  const active = registrations.filter(
    ({ enrollment }) => enrollment.status === "نشط",
  );
  const activeStudents = new Set(
    active.map(({ enrollment }) => enrollment.studentId),
  ).size;
  const monthlyValue = active.reduce(
    (sum, { enrollment, course }) =>
      sum + discountedPrice(course?.price || 0, enrollment.discount),
    0,
  );

  return (
    <>
      <PageTitle
        eyebrow="إدارة التلاميذ"
        title="الاشتراكات الدراسية"
        action={
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
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-44 bg-transparent py-2 text-xs outline-none"
                placeholder="ابحث عن تلميذ..."
              />
            </div>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-[#899a90]">الاشتراكات النشطة</p>
          <b className="mt-2 block text-xl text-[#17251f]">{active.length}</b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">التلاميذ المشتركون</p>
          <b className="mt-2 block text-xl text-[#5054c0]">{activeStudents}</b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">القيمة الشهرية بعد الخصم</p>
          <b className="mt-2 block text-xl text-[#00a060]">{money(monthlyValue)}</b>
        </Card>
      </div>

      <Card>
        <div className="mb-5">
          <h3 className="font-black text-[#17251f]">سجل الاشتراكات</h3>
          <p className="mt-1 text-[11px] text-[#84938b]">
            المواد والباقات المسجل فيها كل تلميذ، بدون خلطها بسجل الدفوعات.
          </p>
        </div>
        <Table>
          <Th>التلميذ</Th>
          <Th>المادة / الباقة والمستوى</Th>
          <Th>السعر</Th>
          <Th>الخصم</Th>
          <Th>بعد الخصم</Th>
          <Th>تاريخ البداية</Th>
          <Th>تاريخ النهاية</Th>
          <Th>الحالة</Th>
          {registrations.map(({ enrollment, student, course }) => {
            const discount = enrollment.discount || 0;
            const level = course ? courseLevelLabel(course, data.levels) : "";
            return (
              <tr key={enrollment.id}>
                <Td><b>{student?.name}</b></Td>
                <Td>
                  <b className="block text-[#34483d]">{course?.name}</b>
                  <span className="mt-1 block text-[10px] font-bold text-[#5054c0]">
                    {level || "بدون مستوى"}
                  </span>
                </Td>
                <Td>{money(course?.price || 0)}</Td>
                <Td className={discount ? "font-bold text-[#a08500]" : "text-[#84938b]"}>{money(discount)}</Td>
                <Td className="font-bold text-[#008a55]">{money(discountedPrice(course?.price || 0, discount))}</Td>
                <Td>{enrollment.enrolledAt}</Td>
                <Td>{enrollment.removedAt || "-"}</Td>
                <Td>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${enrollment.status === "نشط" ? "bg-[#e9f8ef] text-[#008a55]" : enrollment.status === "متوقف" ? "bg-[#faf4de] text-[#a08500]" : "bg-[#f1f1f1] text-[#737373]"}`}>
                    {enrollment.status}
                  </span>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!registrations.length && <EmptyState text="لا توجد اشتراكات مطابقة" />}
      </Card>
    </>
  );
}
