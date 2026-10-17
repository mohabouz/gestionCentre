"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Attendance as AttendanceRecord, today } from "@/lib/centman-store";


import { Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";

export function Attendance({ data, update }: Props) {
  const [session, setSession] = useState(data.sessions[0]?.id || 0);
  const [occurrenceDate, setOccurrenceDate] = useState(today);
  const [statuses, setStatuses] = useState<Record<number, AttendanceRecord["status"]>>({});
  useEffect(() => {
    if (data.sessions.length && !data.sessions.some((item) => item.id === session)) {
      setSession(data.sessions[0].id);
    }
  }, [data.sessions, session]);
  const selectedSession = data.sessions.find((item) => item.id === session);
  const selectedCourse = data.courses.find(
    (course) => course.name === selectedSession?.course,
  );
  const students = data.students.filter((student) =>
    data.enrollments.some(
      (enrollment) =>
        enrollment.studentId === student.id &&
        enrollment.status === "نشط" &&
        enrollment.courseId === selectedCourse?.id,
    ),
  );
  useEffect(() => {
    const saved = data.attendances
      .filter(
        (item) =>
          item.sessionId === session && item.occurrenceDate === occurrenceDate,
      )
      .reduce<Record<number, AttendanceRecord["status"]>>((result, item) => {
        result[item.studentId] = item.status;
        return result;
      }, {});
    setStatuses(saved);
  }, [data.attendances, occurrenceDate, session]);
  const saveAttendance = () => {
    const current = data.attendances.filter(
      (item) =>
        item.sessionId !== session || item.occurrenceDate !== occurrenceDate,
    );
    const records = Object.entries(statuses).map(([studentId, status], index) => ({
      id: Date.now() + index,
      sessionId: session,
      studentId: Number(studentId),
      occurrenceDate,
      status,
    }));
    update({ ...data, attendances: [...current, ...records] }, "تم حفظ الحضور");
  };
  return (
    <>
      <PageTitle eyebrow="التنظيم" title="تسجيل الحضور" />
      <Card>
        <div className="mb-5">
          <label className="text-xs font-bold text-[#64786c]">اختر الحصة</label>
          <select
            value={session}
            onChange={(event) => setSession(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
          >
            {data.sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} - كل {item.weekday || "أسبوع"} {item.time}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-xs font-bold text-[#64786c]">
            تاريخ الحصة
            <input
              type="date"
              value={occurrenceDate}
              onChange={(event) => setOccurrenceDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
            />
          </label>
        </div>
        <Table>
          <Th>الطالب</Th>
          <Th>الدورة</Th>
          <Th>الحالة</Th>
          {students.map((student) => (
            <tr key={student.id}>
              <Td><b>{student.name}</b></Td>
              <Td>{student.course}</Td>
              <Td>
                <div className="flex gap-2">
                  {["حاضر", "غائب", "متأخر"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatuses({ ...statuses, [student.id]: status as AttendanceRecord["status"] })}
                      className={`rounded-lg px-3 py-2 text-[10px] font-bold ${statuses[student.id] === status ? "bg-[#00a060] text-white" : "bg-[#f1f5f2] text-[#718278]"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveAttendance} disabled={!session || !students.length}>حفظ الحضور</Button>
        </div>
      </Card>
    </>
  );
}
