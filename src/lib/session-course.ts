import type { Course, Level, Session } from "@/lib/centman-store";

const searchable = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]/gu, "");

export function resolveSessionCourse(
  session: Pick<Session, "courseId" | "course" | "teacher" | "title">,
  courses: Course[],
  levels: Level[],
) {
  const byId = courses.find((course) => Number(course.id) === Number(session.courseId));
  if (byId) return byId;

  const exactName = courses.filter((course) => course.name === session.course);
  const exactTeacher = exactName.find((course) => course.teacher === session.teacher);
  if (exactTeacher) return exactTeacher;
  if (exactName.length === 1) return exactName[0];

  const title = searchable(session.title);
  if (!title) return undefined;
  const teacherCourses = courses.filter((course) => course.teacher === session.teacher);
  const candidates = teacherCourses.length ? teacherCourses : courses;
  const scored = candidates
    .map((course) => {
      const name = searchable(course.name);
      if (!name || !title.includes(name)) return { course, score: -1 };
      const ids = course.levelIds?.length
        ? course.levelIds
        : course.levelId != null
          ? [course.levelId]
          : course.level
            ? [course.level.id]
            : [];
      const levelMatches = levels.filter((level) => ids.some((id) => Number(id) === Number(level.id)));
      const abbreviationMatch = levelMatches.some((level) => {
        const abbreviation = searchable(level.abbreviation);
        return abbreviation.length > 1 && title.includes(abbreviation);
      });
      const stageMatch = levelMatches.some((level) => {
        const stage = searchable(level.abbreviation).match(/^(?:\d+bac|\d+ac|tc)/)?.[0];
        return Boolean(stage && title.includes(stage));
      });
      return { course, score: 1 + (abbreviationMatch ? 4 : stageMatch ? 2 : 0) };
    })
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) return undefined;
  if (scored.length === 1 || scored[0].score > scored[1].score) return scored[0].course;
  return undefined;
}
