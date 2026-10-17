"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { EmptyState, Modal } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { courseLevelLabel } from "@/lib/course-level";
import type {
  Attendance as AttendanceRecord,
  Session,
  Student,
} from "@/lib/centman-store";
import { today } from "@/lib/centman-store";
import { resolveSessionCourse } from "@/lib/session-course";

const weekdays = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const attendanceOptions: Array<{
  status: AttendanceRecord["status"];
  active: string;
}> = [
  { status: "حاضر", active: "border-[#56b98a] bg-[#e9f8f0] text-[#087849]" },
  { status: "غائب", active: "border-[#df8279] bg-[#fff0ee] text-[#b4473f]" },
  { status: "متأخر", active: "border-[#dfb951] bg-[#fff8df] text-[#936d00]" },
];

function weekdayForDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return weekdays[new Date(year, month - 1, day).getDay()];
}

function dateFromValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDate(value: string, offset: number) {
  const date = dateFromValue(value);
  date.setDate(date.getDate() + offset);
  return dateValue(date);
}

export function Attendance({ data, saveAttendance: persistAttendance }: Props) {
  const [occurrenceDate, setOccurrenceDate] = useState(today);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [statuses, setStatuses] = useState<
    Record<number, AttendanceRecord["status"]>
  >({});
  const [query, setQuery] = useState("");

  const selectedWeekday = weekdayForDate(occurrenceDate);
  const visibleDates = Array.from({ length: 7 }, (_, index) =>
    offsetDate(occurrenceDate, index - 3),
  );
  const daySessions = useMemo(
    () =>
      data.sessions
        .filter(
          (session) =>
            (session.weekday || weekdayForDate(session.date)) === selectedWeekday,
        )
        .sort((left, right) => left.time.localeCompare(right.time)),
    [data.sessions, selectedWeekday],
  );

  const studentsForSession = (session: Session) => {
    const course = resolveSessionCourse(session, data.courses, data.levels);
    if (!course) return [];

    const relatedCourseIds = new Set<number>([course.id]);
    if (course.type === "باقة") {
      course.subjectIds?.forEach((id) => relatedCourseIds.add(id));
    } else {
      data.courses
        .filter(
          (item) =>
            item.type === "باقة" && item.subjectIds?.includes(course.id),
        )
        .forEach((item) => relatedCourseIds.add(item.id));
    }

    return data.students.filter(
      (student) =>
        student.status === "نشط" &&
        data.enrollments.some(
          (enrollment) =>
            enrollment.studentId === student.id &&
            enrollment.status === "نشط" &&
            relatedCourseIds.has(enrollment.courseId),
        ),
    );
  };

  const selectedStudents = selectedSession
    ? studentsForSession(selectedSession)
    : [];
  const filteredStudents = selectedStudents.filter((student) =>
    student.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const registeredCount = selectedStudents.filter(
    (student) => statuses[student.id],
  ).length;

  const openAttendance = (session: Session) => {
    const saved = data.attendances
      .filter(
        (item) =>
          item.sessionId === session.id &&
          item.occurrenceDate === occurrenceDate,
      )
      .reduce<Record<number, AttendanceRecord["status"]>>((result, item) => {
        result[item.studentId] = item.status;
        return result;
      }, {});
    setStatuses(saved);
    setQuery("");
    setSelectedSession(session);
  };

  const closeAttendance = () => {
    setSelectedSession(null);
    setQuery("");
  };

  const setStatus = (student: Student, status: AttendanceRecord["status"]) => {
    setStatuses((current) => ({ ...current, [student.id]: status }));
  };

  const markAllPresent = () => {
    setStatuses((current) => {
      const next = { ...current };
      selectedStudents.forEach((student) => {
        next[student.id] = "حاضر";
      });
      return next;
    });
  };

  const saveAttendance = async () => {
    if (!selectedSession || registeredCount !== selectedStudents.length) return;
    const records = selectedStudents.map((student) => ({
      studentId: student.id,
      status: statuses[student.id]!,
    }));
    if (await persistAttendance?.(selectedSession.id, occurrenceDate, records)) {
      closeAttendance();
    }
  };

  return (
    <>
      <PageTitle eyebrow="التنظيم" title="تسجيل الحضور" />

      <Card>
        <div className="mb-5">
          <div>
            <p className="text-sm font-black text-[#253d32]">حصص اليوم المحدد</p>
            <p className="mt-1 text-xs text-[#84958b]">
              اختر الحصة لفتح لائحة الحضور مباشرة
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-stretch gap-2 rounded-2xl border border-[#dfe8e3] bg-[#f7faf8] p-2">
          <div
            dir="ltr"
            className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto"
          >
            {visibleDates.map((value) => {
              const date = dateFromValue(value);
              const selected = value === occurrenceDate;
              const isToday = value === today;

              return (
                <button
                  key={value}
                  type="button"
                  dir="rtl"
                  onClick={() => setOccurrenceDate(value)}
                  className={`min-w-[74px] flex-1 rounded-xl px-2 py-2.5 text-center transition ${
                    selected
                      ? "bg-[#00a060] text-white shadow-[0_5px_14px_rgba(0,160,96,0.22)]"
                      : isToday
                        ? "border border-[#9ab1e8] bg-[#edf1ff] text-[#414da0] hover:bg-[#e4e9ff]"
                      : "text-[#63776c] hover:bg-white"
                  }`}
                >
                  <span className="block text-[10px] font-bold">
                    {isToday ? "اليوم" : weekdays[date.getDay()]}
                  </span>
                  <span className="mt-1 block text-sm font-black">
                    {date.getDate()}
                  </span>
                  <span
                    className={`block text-[9px] font-bold ${
                      selected
                        ? "text-white/75"
                        : isToday
                          ? "text-[#6571bd]"
                          : "text-[#9aa9a1]"
                    }`}
                  >
                    {new Intl.DateTimeFormat("ar-MA", { month: "short" }).format(
                      date,
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <label
            title="اختيار تاريخ آخر"
            className="relative flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#dce7df] bg-white text-[#087849] transition hover:border-[#97ccb1] hover:bg-[#edf8f2]"
          >
            <CalendarDays size={20} />
            <span className="sr-only">اختيار تاريخ آخر</span>
            <input
              type="date"
              value={occurrenceDate}
              onChange={(event) => {
                if (event.target.value) setOccurrenceDate(event.target.value);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="اختيار تاريخ آخر"
            />
          </label>
        </div>

        {daySessions.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {daySessions.map((session) => {
              const course = resolveSessionCourse(
                session,
                data.courses,
                data.levels,
              );
              const levelLabel = course
                ? courseLevelLabel(course, data.levels) || "بدون مستوى"
                : "بدون مستوى";
              const students = studentsForSession(session);
              const savedCount = new Set(
                data.attendances
                  .filter(
                    (item) =>
                      item.sessionId === session.id &&
                      item.occurrenceDate === occurrenceDate,
                  )
                  .map((item) => item.studentId),
              ).size;
              const complete = students.length > 0 && savedCount >= students.length;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => openAttendance(session)}
                  className="group rounded-2xl border border-[#dfe9e3] bg-gradient-to-br from-white to-[#f1f8f4] p-5 text-right transition hover:-translate-y-0.5 hover:border-[#97ccb1] hover:shadow-[0_10px_24px_rgba(28,67,47,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 text-base font-black text-[#20382d]">
                        <span>{course?.name || session.course || session.title}</span>
                        <span aria-hidden="true" className="text-[#91a49a]">
                          -
                        </span>
                        <span className="rounded-lg bg-[#dceee5] px-2.5 py-1 text-xs font-black text-[#087849]">
                          {levelLabel}
                        </span>
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        complete
                          ? "bg-[#dff5e9] text-[#087849]"
                          : savedCount
                            ? "bg-[#fff4d0] text-[#8a6800]"
                            : "bg-[#edf1ef] text-[#718278]"
                      }`}
                    >
                      {complete ? "مكتمل" : savedCount ? "غير مكتمل" : "غير مسجل"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[#60766a]">
                    <span className="flex items-center gap-2">
                      <Clock3 size={15} className="text-[#00a060]" />
                      {session.time}
                      {session.endTime ? ` - ${session.endTime}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin size={15} className="text-[#00a060]" />
                      {session.room || "بدون قاعة"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users size={15} className="text-[#00a060]" />
                      {students.length} طالب
                    </span>
                    <span className="flex items-center gap-2 truncate">
                      <CalendarDays size={15} className="text-[#00a060]" />
                      {session.teacher}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState text={`لا توجد حصص يوم ${selectedWeekday}`} />
        )}
      </Card>

      {selectedSession && (
        <Modal
          title={`حضور ${
            resolveSessionCourse(selectedSession, data.courses, data.levels)?.name ||
            selectedSession.title
          }`}
          onClose={closeAttendance}
          footer={
            <>
              <Button variant="outline" onClick={closeAttendance}>
                إلغاء
              </Button>
              <Button
                onClick={saveAttendance}
                disabled={
                  !selectedStudents.length ||
                  registeredCount !== selectedStudents.length
                }
              >
                حفظ الحضور
              </Button>
            </>
          }
        >
          <div className="rounded-2xl bg-[#f3f8f5] p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-black text-[#294438]">
                  {selectedSession.time}
                  {selectedSession.endTime ? ` - ${selectedSession.endTime}` : ""}
                  <span className="mx-2 text-[#b0bdb6]">•</span>
                  {selectedSession.room}
                </p>
                <p className="mt-1 text-[#75887e]">{occurrenceDate}</p>
              </div>
              <span className="font-bold text-[#087849]">
                {registeredCount} / {selectedStudents.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dce8e1]">
              <div
                className="h-full rounded-full bg-[#00a060] transition-all"
                style={{
                  width: selectedStudents.length
                    ? `${(registeredCount / selectedStudents.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {selectedStudents.length ? (
            <>
              <div className="my-4 flex flex-col gap-3 sm:flex-row">
                <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-3 text-[#829188] focus-within:border-[#00a060]">
                  <Search size={16} />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="البحث عن طالب..."
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#e6f5ee] px-4 py-2.5 text-xs font-bold text-[#087849] hover:bg-[#d9f0e4]"
                >
                  <CheckCircle2 size={16} />
                  تحديد الكل حاضراً
                </button>
              </div>

              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-xl border border-[#e4ece7] bg-white p-3"
                  >
                    <p className="mb-3 text-sm font-black text-[#2c4338]">
                      {student.name}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {attendanceOptions.map((option) => (
                        <button
                          key={option.status}
                          type="button"
                          onClick={() => setStatus(student, option.status)}
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                            statuses[student.id] === option.status
                              ? option.active
                              : "border-[#e2e9e5] bg-[#f8faf9] text-[#75877d] hover:bg-[#f0f5f2]"
                          }`}
                        >
                          {option.status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!filteredStudents.length && (
                  <EmptyState text="لا يوجد طالب مطابق للبحث" />
                )}
              </div>
            </>
          ) : (
            <EmptyState text="لا يوجد طلاب مسجلون في هذه الحصة" />
          )}
        </Modal>
      )}
    </>
  );
}
