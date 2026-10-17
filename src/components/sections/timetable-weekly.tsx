"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Room, Session, today } from "@/lib/centman-store";


import { Input, Modal } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";

export function WeeklyTimetable({ data, update }: Props) {
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
    { length: 24 },
    (_, index) =>
      `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );
  const [open, setOpen] = useState(false);
  const [roomForm, setRoomForm] = useState("");
  const [form, setForm] = useState({
    title: "",
    teacher: data.teachers[0]?.name || "",
    course: data.courses[0]?.name || "",
    weekday: "الاثنين",
    room: data.rooms[0]?.name || "",
    time: "16:00",
    endTime: "17:00",
    date: today,
  });
  const indexOf = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Math.max(0, Math.round((hour * 60 + minute - 480) / 30));
  };
  const timeAt = (index: number) =>
    slots[Math.max(0, Math.min(slots.length - 1, index))];
  const save = (event: FormEvent) => {
    event.preventDefault();
    update(
      { ...data, sessions: [...data.sessions, { ...form, id: Date.now() }] },
      "تمت إضافة الحصة",
    );
    setOpen(false);
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
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id
            ? {
              ...item,
              weekday,
              room,
              time: timeAt(index),
              endTime: timeAt(index + duration),
            }
            : item,
        ),
      },
      "تم تحريك الحصة",
    );
  };
  const resize = (session: Session) => {
    const next = Math.max(
      indexOf(session.time) + 1,
      indexOf(session.endTime || "17:00") + 1,
    );
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id ? { ...item, endTime: timeAt(next) } : item,
        ),
      },
      "تم تعديل مدة الحصة",
    );
  };
  const addRoom = (event: FormEvent) => {
    event.preventDefault();
    const name = roomForm.trim();
    if (!name || data.rooms.some((room) => room.name === name)) return;
    update(
      { ...data, rooms: [...data.rooms, { id: Date.now(), name }] },
      "تمت إضافة القاعة",
    );
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
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            حجز حصة
          </Button>
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
          <Button type="submit">إضافة قاعة</Button>
        </form>
      </Card>
      <Card>
        <div className="mb-3 flex gap-3 text-xs text-[#84938b]">
          <span>الأيام من الاثنين إلى الأحد</span>
          <span>كل خانة 30 دقيقة</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-right text-xs">
            <thead>
              <tr>
                <th className="w-28 border border-[#e5e5e5] bg-[#fafafa] p-3">
                  اليوم
                </th>
                {data.rooms.map((room) => (
                  <th
                    key={room.id}
                    className="border border-[#e5e5e5] bg-[#fafafa] p-3"
                  >
                    {room.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.map((weekday) => (
                <tr key={weekday}>
                  <th className="border border-[#e5e5e5] bg-[#f7f7f7] p-3 align-top font-black text-[#5054c0]">
                    {weekday}
                  </th>
                  {data.rooms.map((room) => (
                    <td
                      key={room.id}
                      className="relative h-[480px] border border-[#e5e5e5] align-top"
                    >
                      <div className="absolute inset-0">
                        {slots.map((slot, index) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setForm({
                                ...form,
                                weekday,
                                room: room.name,
                                time: slot,
                                endTime: timeAt(index + 2),
                              });
                              setOpen(true);
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              const session = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (session)
                                move(session, weekday, room.name, index);
                            }}
                            className="block h-5 w-full border-b border-dashed border-[#f0f0f0] text-left text-[9px] text-[#b0b8b3] hover:bg-[#f5f7ff]"
                          >
                            {index % 2 === 0 ? slot : ""}
                          </button>
                        ))}
                        {data.sessions
                          .filter(
                            (session) =>
                              session.room === room.name &&
                              (session.weekday || "الاثنين") === weekday,
                          )
                          .map((session) => (
                            <div
                              key={session.id}
                              draggable
                              onDragStart={(event) =>
                                event.dataTransfer.setData(
                                  "session",
                                  String(session.id),
                                )
                              }
                              className="absolute left-1 right-1 z-10 cursor-grab rounded-lg bg-[#5054c0] px-2 py-1 text-[10px] font-bold text-white shadow-md"
                              style={{
                                top: `${indexOf(session.time) * 20}px`,
                                height: `${Math.max(20, (indexOf(session.endTime || "17:00") - indexOf(session.time)) * 20)}px`,
                              }}
                            >
                              <span className="block truncate">
                                {session.course || session.title}
                              </span>
                              <span className="block truncate opacity-80">
                                {session.teacher} • {session.time}-
                                {session.endTime || "17:00"}
                              </span>
                              <button
                                type="button"
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  resize(session);
                                }}
                                className="absolute bottom-0 left-1/2 h-1 w-8 rounded bg-white/80"
                                aria-label="تمديد مدة الحصة"
                              />
                            </div>
                          ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open && (
        <Modal title="حجز حصة جديدة" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="عنوان الحصة"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                المادة أو الباقة
              </span>
              <select
                required
                value={form.course}
                onChange={(event) =>
                  setForm({ ...form, course: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.courses.map((course) => (
                  <option key={course.id}>{course.name}</option>
                ))}
              </select>
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
            <Input
              label="التاريخ"
              type="date"
              value={form.date}
              onChange={(value) => setForm({ ...form, date: value })}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!data.rooms.length || !data.courses.length}
              >
                حفظ الحصة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
