import type { Prisma } from "@/generated/prisma/client";
import type { CourseInput } from "@/lib/course-input";

export async function resolveCourseRelations(
  tx: Prisma.TransactionClient,
  input: CourseInput,
) {
  const [teacher, levelCount, subjects] = await Promise.all([
    input.type === "مادة"
      ? tx.teacher.findFirst({ where: { name: input.teacher }, select: { id: true } })
      : Promise.resolve(null),
    tx.level.count({ where: { id: { in: input.levelIds } } }),
    input.type === "باقة"
      ? tx.course.findMany({
          where: { id: { in: input.subjectIds }, type: "مادة" },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);
  if (
    (input.type === "مادة" && !teacher) ||
    levelCount !== input.levelIds.length ||
    subjects.length !== input.subjectIds.length
  ) {
    return null;
  }
  return { teacherId: teacher?.id ?? null };
}

export async function replaceCourseLinks(
  tx: Prisma.TransactionClient,
  courseId: number,
  input: CourseInput,
) {
  await tx.courseLevel.deleteMany({ where: { courseId } });
  await tx.packSubject.deleteMany({ where: { packId: courseId } });
  await tx.courseLevel.createMany({
    data: input.levelIds.map((levelId) => ({ courseId, levelId })),
  });
  if (input.subjectIds.length) {
    await tx.packSubject.createMany({
      data: input.subjectIds.map((subjectId) => ({ packId: courseId, subjectId })),
    });
  }
}
