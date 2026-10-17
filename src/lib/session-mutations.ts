import type { Prisma } from "@/generated/prisma/client";
import type { SessionInput } from "@/lib/session-input";
import { toMinutes } from "@/lib/session-input";

export async function resolveSessionMutation(
  tx: Prisma.TransactionClient,
  input: SessionInput,
  ignoredId?: number,
) {
  const [teacher, course, room, candidates] = await Promise.all([
    tx.teacher.findFirst({ where: { name: input.teacher }, select: { id: true } }),
    tx.course.findUnique({ where: { id: input.courseId }, select: { id: true, name: true } }),
    tx.room.findUnique({ where: { name: input.room }, select: { id: true } }),
    tx.session.findMany({
      where: {
        weekday: input.weekday,
        ...(ignoredId ? { id: { not: ignoredId } } : {}),
      },
      select: { teacherId: true, room: true, time: true, endTime: true },
    }),
  ]);
  if (!teacher || !course || !room) return null;
  const start = toMinutes(input.time);
  const end = toMinutes(input.endTime);
  const conflict = candidates.some((session) => {
    const sameResource = session.room === input.room || session.teacherId === teacher.id;
    const sessionEnd = toMinutes(session.endTime || session.time);
    return sameResource && start < sessionEnd && toMinutes(session.time) < end;
  });
  if (conflict) return null;
  return { teacherId: teacher.id, courseId: course.id, courseName: course.name };
}
