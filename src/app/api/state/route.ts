import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internationalLevels, moroccanLevels } from "@/lib/centman-store";
import { requireUser } from "@/lib/auth";
import { stateForSection } from "@/lib/state-scope";
type State = { students: any[]; teachers: any[]; courses: any[]; levels: any[]; enrollments: any[]; expenses: any[]; payments: any[]; collections: any[]; sessions: any[]; payouts: any[]; rooms: any[]; attendances: any[] };

async function ensureLevelCatalog() {
  const initialized = await prisma.levelCatalogState.findUnique({ where: { id: 1 } });
  if (initialized?.initialized) return;
  await prisma.$transaction(async tx => {
    const currentState = await tx.levelCatalogState.findUnique({ where: { id: 1 } });
    if (currentState?.initialized) return;
    const catalog = [
      ...moroccanLevels.map(level => ({ ...level, curriculum: "MOROCCAN", cycle: level.code.startsWith("primary-") ? "ابتدائي" : level.code.startsWith("college-") ? "إعدادي" : "تأهيلي" })),
      ...internationalLevels.map(level => ({ ...level, curriculum: "INTERNATIONAL", cycle: level.code.includes("maternelle") || ["int-cp", "int-ce1", "int-ce2", "int-cm1", "int-cm2"].includes(level.code) ? "ابتدائي" : ["int-6e", "int-5e", "int-4e", "int-3e"].includes(level.code) ? "إعدادي" : "تأهيلي" })),
    ];
    for (const level of catalog) {
      await tx.level.upsert({
        where: { code: level.code },
        create: level,
        update: { abbreviation: level.abbreviation, curriculum: level.curriculum, cycle: level.cycle },
      });
    }
    await tx.levelCatalogState.upsert({ where: { id: 1 }, create: { id: 1, initialized: true }, update: { initialized: true } });
  });
}

async function readState(): Promise<State> {
  await ensureLevelCatalog();
  const currentLevels = await prisma.level.findMany({ select: { id: true, code: true, abbreviation: true, curriculum: true, cycle: true } });
  const currentByCode = new Map(currentLevels.map(level => [level.code, level]));
  const unifiedMathLevel = currentByCode.get("bac-2-sm");
  if (unifiedMathLevel) {
    for (const oldCode of ["bac-2-sm-a", "bac-2-sm-b"]) {
      const oldLevel = currentByCode.get(oldCode);
      if (oldLevel) {
        await prisma.course.updateMany({ where: { levelId: oldLevel.id }, data: { levelId: unifiedMathLevel.id } });
        await prisma.level.deleteMany({ where: { id: oldLevel.id } });
      }
    }
  }
  const [legacyCourses, existingCourseLevels] = await Promise.all([
    prisma.course.findMany({ where: { levelId: { not: null } }, select: { id: true, levelId: true } }),
    prisma.courseLevel.findMany({ select: { courseId: true, levelId: true } }),
  ]);
  const existingAssignmentKeys = new Set(existingCourseLevels.map(link => `${link.courseId}:${link.levelId}`));
  const missingAssignments = legacyCourses.filter(course => course.levelId !== null && !existingAssignmentKeys.has(`${course.id}:${course.levelId}`)).map(course => ({ courseId: course.id, levelId: course.levelId! }));
  if (missingAssignments.length) await prisma.courseLevel.createMany({ data: missingAssignments });
  const courseLevels = await prisma.courseLevel.findMany();
  const [students, teachers, courses, packSubjects, levels, enrollments, payments, collections, expenses, sessions, payouts, rooms] = await Promise.all([prisma.student.findMany(), prisma.teacher.findMany(), prisma.course.findMany({ include: { teacher: true, level: true } }), prisma.packSubject.findMany(), prisma.level.findMany({ orderBy: { sortOrder: "asc" } }), prisma.enrollment.findMany(), prisma.payment.findMany(), prisma.paymentCollection.findMany(), prisma.expense.findMany(), prisma.session.findMany({ include: { teacher: true, course: true } }), prisma.payout.findMany({ include: { teacher: true } }), prisma.room.findMany()]);
  const expandedCourseIds = (courseId: number) => { const course = courses.find(item => item.id === courseId); return course?.type === "باقة" ? packSubjects.filter(link => link.packId === courseId).map(link => link.subjectId) : [courseId]; };
  const normalizedPayments = payments.map(payment => {
    if (payment.enrollmentId || payment.billingMonth) return payment;
    const legacyCourseName = payment.month.match(/^(?:مادة|باقة):\s*(.+)$/)?.[1];
    if (!legacyCourseName || !/^\d{4}-\d{2}-\d{2}$/.test(payment.date)) return payment;
    const matches = enrollments.filter(enrollment => enrollment.studentId === payment.studentId && courses.find(course => course.id === enrollment.courseId)?.name === legacyCourseName);
    if (matches.length !== 1) return payment;
    const enrollment = matches[0];
    return { ...payment, courseId: enrollment.courseId, enrollmentId: enrollment.id, billingMonth: payment.date.slice(0, 7) };
  });
  const normalizedCollections = [...collections, ...payments
    .filter(payment => payment.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(payment.date) && !collections.some(collection => collection.paymentId === payment.id))
    .map(payment => ({ id: -payment.id, paymentId: payment.id, amount: payment.amount, date: payment.date, method: payment.method, receiptNumber: payment.receiptNumber }))];
  const attendances = await prisma.attendance.findMany();
  return { students, teachers: teachers.map(teacher => ({ ...teacher, students: new Set(enrollments.filter(item => item.status === "نشط" && expandedCourseIds(item.courseId).some(id => courses.some(course => course.id === id && course.teacherId === teacher.id))).map(item => item.studentId)).size, sessions: sessions.filter(session => session.teacherId === teacher.id).length })), courses: courses.map(course => { const levelIds = courseLevels.filter(link => link.courseId === course.id).map(link => link.levelId); return { ...course, teacher: course.teacher?.name || "", level: course.level, levelIds: levelIds.length ? levelIds : course.levelId ? [course.levelId] : [], subjectIds: packSubjects.filter(link => link.packId === course.id).map(link => link.subjectId), enrolled: enrollments.filter(item => item.courseId === course.id && item.status === "نشط").length }; }), levels, enrollments, payments: normalizedPayments.map(payment => ({ ...payment, student: students.find(student => student.id === payment.studentId)?.name || "" })), collections: normalizedCollections, expenses, sessions: sessions.map(session => ({ ...session, teacher: session.teacher?.name || "", course: session.course?.name || "" })), payouts: payouts.map(payout => ({ ...payout, teacher: payout.teacher.name, teacherId: payout.teacherId })), rooms, attendances };
}

export async function GET(request: Request) { try { const user = await requireUser(); const state = await readState(); const section = new URL(request.url).searchParams.get("section") || "dashboard"; const scoped = stateForSection(state, section); if (user.role === "ADMIN") { if ("expenses" in scoped) scoped.expenses = []; if ("payouts" in scoped) scoped.payouts = []; } return NextResponse.json(scoped); } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Unable to load database state" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 }); } }
