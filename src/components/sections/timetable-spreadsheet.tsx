"use client";

import { FormEvent, useRef, useState } from "react";
import { Edit3, Plus } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Room, Session, today } from "@/lib/centman-store";
import { CoursePicker, courseLevelLabel } from "@/components/course-picker";
import { hasSessionConflict, snapByCoverage } from "@/lib/timetable";
import { resolveSessionCourse } from "@/lib/session-course";


import { Input, Modal } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { DailySchedulePoster } from "@/components/sections/daily-schedule-poster";

export function SpreadsheetTimetable({ data, update }: Props) {
  const weekdays = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];
  const slots = Array.from(
    { length: 29 },
    (_, index) =>
      `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    sessionId: number;
    startIndex: number;
    endIndex: number;
    direction: "ltr" | "rtl";
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    sessionId: number;
    weekday: string;
    room: string;
    index: number;
    duration: number;
  } | null>(null);
  const [roomForm, setRoomForm] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<{
    title: string;
    teacher: string;
    course: string;
    courseId: number | null;
    weekday: string;
    room: string;
    time: string;
    endTime: string;
    date: string;
  }>({
    title: "",
    teacher: data.teachers[0]?.name || "",
    course: data.courses[0]?.name || "",
    courseId: data.courses[0]?.id ?? null,
    weekday: "الاثنين",
    room: data.rooms[0]?.name || "",
    time: "16:00",
    endTime: "17:00",
    date: today,
  });
  const resizeRef = useRef<{
    sessionId: number;
    edge: "left" | "right";
    startX: number;
    slotWidth: number;
    direction: "ltr" | "rtl";
    startIndex: number;
    endIndex: number;
    nextStartIndex: number;
    nextEndIndex: number;
  } | null>(null);
  const dragRef = useRef<{ sessionId: number; grabOffset: number } | null>(null);
  const indexOf = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Math.max(0, Math.round((hour * 60 + minute - 480) / 30));
  };
  const timeAt = (index: number) => {
    const bounded = Math.max(0, Math.min(slots.length, index));
    const totalMinutes = 480 + bounded * 30;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  };
  const teacherPalette = [
    ["#1d4ed8", "#2563eb"],
    ["#6d28d9", "#7c3aed"],
    ["#047857", "#059669"],
    ["#be185d", "#db2777"],
    ["#b45309", "#d97706"],
    ["#0e7490", "#0891b2"],
    ["#b91c1c", "#dc2626"],
    ["#4338ca", "#4f46e5"],
  ] as const;
  const teacherColors = (teacher: string) => {
    const teacherIndex = data.teachers.findIndex((item) => item.name === teacher);
    const fallback = [...teacher].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return teacherPalette[(teacherIndex >= 0 ? teacherIndex : fallback) % teacherPalette.length];
  };
  const conflicts = (sessionId: number, weekday: string, room: string, startIndex: number, endIndex: number, teacher?: string) => {
    const moving = data.sessions.find((session) => session.id === sessionId);
    const movingTeacher = teacher || moving?.teacher;
    return hasSessionConflict({ sessions: data.sessions, sessionId, weekday, room, teacher: movingTeacher, startIndex, endIndex, indexOf });
  };
  const previewInvalid = dragPreview
    ? conflicts(dragPreview.sessionId, dragPreview.weekday, dragPreview.room, dragPreview.index, dragPreview.index + dragPreview.duration)
    : false;
  const save = (event: FormEvent) => {
    event.preventDefault();
    const sessionId = editingSession?.id ?? -1;
    if (conflicts(sessionId, form.weekday, form.room, indexOf(form.time), indexOf(form.endTime), form.teacher)) {
      return;
    }
    const sessions = editingSession
      ? data.sessions.map((session) =>
        session.id === editingSession.id
          ? { ...session, ...form }
          : session,
      )
      : [...data.sessions, { ...form, id: Date.now() }];
    update(
      { ...data, sessions },
      editingSession ? "تم تعديل الحصة" : "تمت إضافة الحصة",
    );
    setOpen(false);
    setEditingSession(null);
  };
  const editSession = (session: Session) => {
    const linkedCourse = resolveSessionCourse(session, data.courses, data.levels);
    setEditingSession(session);
    setForm({
      title: session.title,
      teacher: session.teacher,
      course: linkedCourse?.name || session.course,
      courseId: linkedCourse?.id ?? session.courseId ?? null,
      weekday: session.weekday || "الاثنين",
      room: session.room,
      time: session.time,
      endTime: session.endTime || "17:00",
      date: session.date,
    });
    setOpen(true);
  };
  const beginResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    session: Session,
    edge: "left" | "right",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest("td");
    if (!cell) return;
    const startIndex = indexOf(session.time);
    const endIndex = Math.max(startIndex + 1, indexOf(session.endTime || "17:00"));
    const direction = getComputedStyle(cell).direction === "rtl" ? "rtl" : "ltr";
    resizeRef.current = {
      sessionId: session.id,
      edge,
      startX: event.clientX,
      slotWidth: cell.getBoundingClientRect().width /
        Math.max(1, endIndex - startIndex),
      direction,
      startIndex,
      endIndex,
      nextStartIndex: startIndex,
      nextEndIndex: endIndex,
    };
    setResizePreview({ sessionId: session.id, startIndex, endIndex, direction });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const rawDelta = (event.clientX - resize.startX) / resize.slotWidth;
    const visualDelta = Math.sign(rawDelta) * snapByCoverage(Math.abs(rawDelta));
    const delta = resize.direction === "rtl" ? -visualDelta : visualDelta;
    if (resize.edge === "right") {
      resize.nextStartIndex = Math.max(
        0,
        Math.min(resize.endIndex - 1, resize.startIndex + delta),
      );
    } else {
      resize.nextEndIndex = Math.min(
        slots.length - 1,
        Math.max(resize.startIndex + 1, resize.endIndex + delta),
      );
    }
    setResizePreview({
      sessionId: resize.sessionId,
      startIndex: resize.nextStartIndex,
      endIndex: resize.nextEndIndex,
      direction: resize.direction,
    });
    const resizingSession = data.sessions.find((session) => session.id === resize.sessionId);
    const invalid = Boolean(resizingSession && conflicts(
      resize.sessionId,
      resizingSession.weekday || "الاثنين",
      resizingSession.room,
      resize.nextStartIndex,
      resize.nextEndIndex,
    ));
    event.currentTarget.style.cursor = invalid ? "not-allowed" : "ew-resize";
  };
  const finishResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const nextStartIndex = resize.nextStartIndex;
    const nextEndIndex = resize.nextEndIndex;
    const resizedSession = data.sessions.find((session) => session.id === resize.sessionId);
    if (!resizedSession || conflicts(resize.sessionId, resizedSession.weekday || "الاثنين", resizedSession.room, nextStartIndex, nextEndIndex)) {
      resizeRef.current = null;
      setResizePreview(null);
      event.currentTarget.style.cursor = "ew-resize";
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    update(
      {
        ...data,
        sessions: data.sessions.map((session) =>
          session.id === resize.sessionId
            ? {
              ...session,
              time: timeAt(nextStartIndex),
              endTime: timeAt(nextEndIndex),
            }
            : session,
        ),
      },
      "تم تعديل مدة الحصة",
    );
    resizeRef.current = null;
    setResizePreview(null);
    event.currentTarget.style.cursor = "ew-resize";
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const dropIndex = (
    event: React.DragEvent<HTMLTableCellElement>,
    cell: HTMLTableCellElement,
    startIndex: number,
    span: number,
  ) => {
    const rect = cell.getBoundingClientRect();
    const visualPosition = Math.max(0, Math.min(span, ((event.clientX - rect.left) / rect.width) * span));
    const pointerIndex = getComputedStyle(cell).direction === "rtl"
      ? startIndex + span - visualPosition
      : startIndex + visualPosition;
    const grabOffset = dragRef.current?.grabOffset || 0;
    return Math.max(0, Math.min(slots.length - 1, snapByCoverage(pointerIndex - grabOffset)));
  };
  const updateDragTarget = (
    event: React.DragEvent<HTMLTableCellElement>,
    weekday: string,
    room: string,
    startIndex: number,
    span: number,
  ) => {
    const sessionId = dragRef.current?.sessionId || Number(event.dataTransfer.getData("session"));
    const draggedSession = data.sessions.find((session) => session.id === sessionId);
    if (!draggedSession) return;
    const index = dropIndex(event, event.currentTarget, startIndex, span);
    const duration = Math.max(1, indexOf(draggedSession.endTime || "17:00") - indexOf(draggedSession.time));
    const invalid = conflicts(draggedSession.id, weekday, room, index, index + duration);
    event.dataTransfer.dropEffect = invalid ? "none" : "move";
    setDragPreview({ sessionId: draggedSession.id, weekday, room, index, duration });
  };
  const move = (
    session: Session,
    weekday: string,
    room: string,
    index: number,
  ) => {
    const duration = Math.max(
      1,
      indexOf(session.endTime || "17:00") - indexOf(session.time),
    );
    const boundedIndex = Math.min(index, slots.length - duration);
    if (conflicts(session.id, weekday, room, boundedIndex, boundedIndex + duration)) {
      return;
    }
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id
            ? {
              ...item,
              weekday,
              room,
              time: timeAt(boundedIndex),
              endTime: timeAt(boundedIndex + duration),
            }
            : item,
        ),
      },
      "تم تحريك الحصة",
    );
  };
  const addRoom = (event: FormEvent) => {
    event.preventDefault();
    const name = roomForm.trim();
    if (!name || data.rooms.some((room) => room.name === name && room.id !== editingRoom?.id)) return;
    if (editingRoom) {
      update({ ...data, rooms: data.rooms.map(room => room.id === editingRoom.id ? { ...room, name } : room), sessions: data.sessions.map(session => session.room === editingRoom.name ? { ...session, room: name } : session) }, "تم تعديل القاعة");
      setEditingRoom(null);
    } else update({ ...data, rooms: [...data.rooms, { id: Date.now(), name }] }, "تمت إضافة القاعة");
    setRoomForm("");
  };
  const removeRoom = (room: Room) =>
    update(
      {
        ...data,
        rooms: data.rooms.filter((item) => item.id !== room.id),
        sessions: data.sessions.map((session) =>
          session.room === room.name ? { ...session, room: "" } : session,
        ),
      },
      "تم حذف القاعة",
    );
  return (
    <>
      <PageTitle
        eyebrow="التنظيم"
        title="الجدول الزمني"
        action={
          <div className="flex flex-wrap gap-2">
            <DailySchedulePoster data={data} />
            <Button
              onClick={() => {
                setEditingSession(null);
                setForm({
                  title: "",
                  teacher: data.teachers[0]?.name || "",
                  course: data.courses[0]?.name || "",
                  courseId: data.courses[0]?.id ?? null,
                  weekday: "الاثنين",
                  room: data.rooms[0]?.name || "",
                  time: "16:00",
                  endTime: "17:00",
                  date: today,
                });
                setOpen(true);
              }}
            >
              <Plus size={15} className="ml-2 inline" />
              حجز حصة
            </Button>
          </div>
        }
      />
      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {data.rooms.map((room) => (
            <span
              key={room.id}
              className="flex items-center gap-2 rounded-lg bg-[#e4e8fd] px-3 py-2 text-xs font-bold text-[#3a3b9b]"
            >
              {room.name}
              <button type="button" onClick={() => { setEditingRoom(room); setRoomForm(room.name); }} className="text-[#5054c0]">تعديل</button>
              <button
                type="button"
                onClick={() => removeRoom(room)}
                className="text-[#c4584e]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addRoom} className="flex max-w-md gap-2">
          <input
            required
            value={roomForm}
            onChange={(event) => setRoomForm(event.target.value)}
            placeholder="اسم القاعة"
            className="flex-1 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-xs outline-none"
          />
          <Button type="submit">{editingRoom ? "حفظ تعديل القاعة" : "إضافة قاعة"}</Button>
        </form>
      </Card>
      <Card>
        <p className="mb-4 text-xs text-[#84938b]">
          هذا الجدول أسبوعي متكرر؛ يتم تحديد التاريخ فقط عند تسجيل الحضور.
        </p>
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-[#e5e5e5]">
          <table className="w-max min-w-[1500px] table-fixed border-collapse text-right text-[10px]">
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="sticky right-0 z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3">
                  اليوم
                </th>
                <th className="sticky right-[70px] z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3">
                  القاعة
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot}
                    className="sticky top-0 min-w-[42px] border border-[#e5e5e5] bg-[#fafafa] p-2 text-center"
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.flatMap((weekday) =>
                data.rooms.map((room, roomIndex) => {
                  const sessions = data.sessions.filter(
                    (session) =>
                      session.room === room.name &&
                      (session.weekday || "الاثنين") === weekday,
                  );
                  const cells: React.ReactNode[] = [];
                  let index = 0;
                  while (index < slots.length) {
                    const session = sessions.find(
                      (item) => indexOf(item.time) === index,
                    );
                    if (session) {
                      const sessionStartIndex = index;
                      const [teacherColor, teacherTint] = teacherColors(session.teacher);
                      const sessionCourse = resolveSessionCourse(session, data.courses, data.levels);
                      const sessionLevel = sessionCourse ? courseLevelLabel(sessionCourse, data.levels) : "";
                      const span = Math.max(
                        1,
                        Math.min(
                          slots.length - index,
                          indexOf(session.endTime || "17:00") - index,
                        ),
                      );
                      cells.push(
                        <td
                          key={session.id}
                          colSpan={span}
                          onDragOver={(event) => {
                            event.preventDefault();
                            updateDragTarget(event, weekday, room.name, sessionStartIndex, span);
                          }}
                          onDragEnter={(event) =>
                            (() => {
                              const draggedSession = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (draggedSession) {
                                setDragPreview({
                                  sessionId: draggedSession.id,
                                  weekday,
                                  room: room.name,
                                  index: dropIndex(
                                    event,
                                    event.currentTarget,
                                    sessionStartIndex,
                                    span,
                                  ),
                                  duration: Math.max(
                                    1,
                                    indexOf(draggedSession.endTime || "17:00") -
                                    indexOf(draggedSession.time),
                                  ),
                                });
                              }
                            })()
                          }
                          onDrop={(event) => {
                            const draggedSession = data.sessions.find(
                              (item) =>
                                item.id ===
                                Number(event.dataTransfer.getData("session")),
                            );
                            if (draggedSession) {
                              move(
                                draggedSession,
                                weekday,
                                room.name,
                                dropIndex(
                                  event,
                                  event.currentTarget,
                                  sessionStartIndex,
                                  span,
                                ),
                              );
                            }
                            setDragPreview(null);
                          }}
                          className={`relative h-16 border border-[#e5e5e5] bg-white p-1.5 ${previewInvalid && dragPreview?.weekday === weekday && dragPreview?.room === room.name ? "cursor-not-allowed" : ""} ${dragPreview &&
                            dragPreview.weekday === weekday &&
                            dragPreview.room === room.name &&
                            dragPreview.index < sessionStartIndex + span &&
                            dragPreview.index + dragPreview.duration > sessionStartIndex
                            ? previewInvalid
                              ? "outline outline-2 outline-dashed outline-[#dc2626] outline-offset-[-2px]"
                              : "outline outline-2 outline-dashed outline-[#00a060] outline-offset-[-2px]"
                            : ""
                            }`}
                        >
                          <div
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "session",
                                String(session.id),
                              );
                              setDragPreview(null);
                              const rect = event.currentTarget.getBoundingClientRect();
                              const visualRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                              const logicalRatio = getComputedStyle(event.currentTarget).direction === "rtl" ? 1 - visualRatio : visualRatio;
                              dragRef.current = { sessionId: session.id, grabOffset: logicalRatio * span };
                            }}
                            onDragEnd={() => { setDragPreview(null); dragRef.current = null; }}
                            onDoubleClick={() => editSession(session)}
                            className="relative h-full cursor-grab rounded-xl border px-3 py-2 font-bold shadow-md"
                            style={{
                              backgroundColor: teacherTint,
                              backgroundImage: `linear-gradient(135deg, ${teacherColor} 0%, ${teacherTint} 100%)`,
                              borderColor: teacherColor,
                              color: "#ffffff",
                            }}
                          >
                            <button
                              type="button"
                              aria-label="تعديل الحصة"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                editSession(session);
                              }}
                              className="absolute left-1 top-1 z-10 rounded bg-white/20 p-1 hover:bg-white/35"
                            >
                              <Edit3 size={11} />
                            </button>
                            <span className="block truncate">
                              {session.course || session.title}
                            </span>
                            <span className="block truncate opacity-80">
                              {session.teacher}
                            </span>
                            <span className="block truncate text-[9px] opacity-90">
                              {sessionLevel || "بدون مستوى"}
                            </span>
                            <button
                              type="button"
                              aria-label="تغيير بداية الحصة"
                              onPointerDown={(event) =>
                                beginResize(event, session, "left")
                              }
                              onPointerMove={moveResize}
                              onPointerUp={finishResize}
                              className="absolute bottom-0 left-0 top-0 z-10 w-3 cursor-ew-resize touch-none bg-white/20 opacity-0 hover:opacity-100"
                              style={{ cursor: "ew-resize" }}
                            />
                            <button
                              type="button"
                              aria-label="تغيير نهاية الحصة"
                              onPointerDown={(event) =>
                                beginResize(event, session, "right")
                              }
                              onPointerMove={moveResize}
                              onPointerUp={finishResize}
                              className="absolute bottom-0 right-0 top-0 z-10 w-3 cursor-ew-resize touch-none bg-white/20 opacity-0 hover:opacity-100"
                              style={{ cursor: "ew-resize" }}
                            />
                            {resizePreview?.sessionId === session.id && (
                              <div
                                className={`pointer-events-none absolute bottom-0 top-0 z-20 rounded-xl border-2 border-dashed ${conflicts(session.id, session.weekday || "الاثنين", session.room, resizePreview.startIndex, resizePreview.endIndex) ? "border-[#dc2626] bg-[#dc2626]/10" : "border-[#f59e0b] bg-[#f59e0b]/15"}`}
                                style={{
                                  left: `${((resizePreview.direction === "rtl" ? span - (resizePreview.endIndex - index) : resizePreview.startIndex - index) / span) * 100}%`,
                                  width: `${((resizePreview.endIndex - resizePreview.startIndex) / span) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                        </td>,
                      );
                      index += span;
                    } else {
                      const slot = slots[index];
                      const slotIndex = index;
                      cells.push(
                        <td
                          key={slot}
                          onDragOver={(event) => {
                            event.preventDefault();
                            updateDragTarget(event, weekday, room.name, slotIndex, 1);
                          }}
                          onDragEnter={(event) =>
                            (() => {
                              const draggedSession = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (draggedSession) {
                                setDragPreview({
                                  sessionId: draggedSession.id,
                                  weekday,
                                  room: room.name,
                                  index: dropIndex(event, event.currentTarget, slotIndex, 1),
                                  duration: Math.max(
                                    1,
                                    indexOf(draggedSession.endTime || "17:00") -
                                    indexOf(draggedSession.time),
                                  ),
                                });
                              }
                            })()
                          }
                          onDrop={(event) => {
                            const session = data.sessions.find(
                              (item) =>
                                item.id ===
                                Number(event.dataTransfer.getData("session")),
                            );
                            if (session)
                              move(session, weekday, room.name, dropIndex(event, event.currentTarget, slotIndex, 1));
                            setDragPreview(null);
                          }}
                          onClick={() => {
                            setForm({
                              ...form,
                              weekday,
                              room: room.name,
                              time: slot,
                              endTime: timeAt(slotIndex + 2),
                            });
                            setOpen(true);
                          }}
                          className={`h-16 border border-[#f0f0f0] hover:bg-[#f5f7ff] ${previewInvalid && dragPreview?.weekday === weekday && dragPreview?.room === room.name ? "cursor-not-allowed" : ""} ${dragPreview?.weekday === weekday &&
                            dragPreview.room === room.name &&
                            dragPreview.index <= slotIndex &&
                            dragPreview.index + dragPreview.duration > slotIndex
                            ? previewInvalid
                              ? "bg-[#fef2f2] outline outline-2 outline-dashed outline-[#dc2626] outline-offset-[-2px]"
                              : "bg-[#ecfdf5] outline outline-2 outline-dashed outline-[#00a060] outline-offset-[-2px]"
                            : ""
                            }`}
                        />,
                      );
                      index += 1;
                    }
                  }
                  return (
                    <tr
                      key={`${weekday}-${room.id}`}
                      className={roomIndex === 0 ? "border-t-3 border-t-[#34443c]" : ""}
                    >
                      {roomIndex === 0 && <th rowSpan={data.rooms.length} className="sticky right-0 z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#f7f7f7] p-3 align-middle font-black text-[#5054c0]">{weekday}</th>}
                      <th className="sticky right-[70px] z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3 font-bold text-[#53685d]">
                        {room.name}
                      </th>
                      {cells}
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {open && (
        <Modal
          title={editingSession ? "تعديل الحصة" : "حجز حصة جديدة"}
          onClose={() => {
            setOpen(false);
            setEditingSession(null);
          }}
        >
          <form onSubmit={save} className="space-y-4">
            <Input
              label="عنوان الحصة"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">المادة أو الباقة</span>
              <CoursePicker
                courses={data.courses}
                levels={data.levels}
                value={form.courseId}
                onChange={(courseId) => {
                  const course = data.courses.find((item) => item.id === courseId);
                  setForm({ ...form, course: course?.name || "", courseId });
                }}
                showPrice
              />
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                الأستاذ
              </span>
              <select
                required
                value={form.teacher}
                onChange={(event) =>
                  setForm({ ...form, teacher: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.teachers.map((teacher) => (
                  <option key={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                اليوم
              </span>
              <select
                required
                value={form.weekday}
                onChange={(event) =>
                  setForm({ ...form, weekday: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {weekdays.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                القاعة
              </span>
              <select
                required
                value={form.room}
                onChange={(event) =>
                  setForm({ ...form, room: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.rooms.map((room) => (
                  <option key={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="بداية"
                type="time"
                value={form.time}
                onChange={(value) => setForm({ ...form, time: value })}
              />
              <Input
                label="نهاية"
                type="time"
                value={form.endTime}
                onChange={(value) => setForm({ ...form, endTime: value })}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!data.rooms.length || !data.courses.length}
              >
                {editingSession ? "حفظ التعديل" : "حفظ الحصة"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
