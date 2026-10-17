import type { Course, Level } from "@/lib/centman-store";

export function courseLevelLabel(course: Course, levels: Level[]) {
  const ids = course.levelIds?.length
    ? course.levelIds
    : course.levelId != null
      ? [course.levelId]
      : course.level
        ? [course.level.id]
        : [];
  const assigned = levels.filter((level) =>
    ids.some((id) => Number(id) === Number(level.id)),
  );
  return (assigned.length ? assigned : course.level ? [course.level] : [])
    .map((level) => level.abbreviation)
    .filter(Boolean)
    .join("، ");
}
