import type { Session } from "@/lib/centman-store";

export function snapByCoverage(position: number) {
  const lower = Math.floor(position);
  return lower + (position - lower > 0.5 ? 1 : 0);
}

export function intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function hasSessionConflict({
  sessions,
  sessionId,
  weekday,
  room,
  teacher,
  startIndex,
  endIndex,
  indexOf,
}: {
  sessions: Session[];
  sessionId: number;
  weekday: string;
  room: string;
  teacher?: string;
  startIndex: number;
  endIndex: number;
  indexOf: (time: string) => number;
}) {
  return sessions.some((session) => {
    if (session.id === sessionId || (session.weekday || "الاثنين") !== weekday) return false;
    if (!intervalsOverlap(startIndex, endIndex, indexOf(session.time), indexOf(session.endTime || "17:00"))) return false;
    return session.room === room || Boolean(teacher && session.teacher === teacher);
  });
}
