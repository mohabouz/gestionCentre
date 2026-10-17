export type SessionInput = {
  title: string;
  teacher: string;
  courseId: number;
  date: string;
  weekday: string;
  time: string;
  endTime: string;
  room: string;
};

const weekdays = new Set(["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]);

export function parseSessionInput(body: unknown): SessionInput | null {
  const value = body as Record<string, unknown> | null;
  const title = String(value?.title || "").trim();
  const teacher = String(value?.teacher || "").trim();
  const courseId = Number(value?.courseId);
  const date = String(value?.date || "");
  const weekday = String(value?.weekday || "");
  const time = String(value?.time || "");
  const endTime = String(value?.endTime || "");
  const room = String(value?.room || "").trim();
  if (!teacher || !Number.isInteger(courseId) || courseId <= 0 || !weekdays.has(weekday) || !room || !validTime(time) || !validTime(endTime) || toMinutes(endTime) <= toMinutes(time) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return null;
  return { title, teacher, courseId, date, weekday, time, endTime, room };
}

export function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function validTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
