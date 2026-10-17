import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internationalLevels, moroccanLevels } from "@/lib/centman-store";
import { requireUser } from "@/lib/auth";
import { InvalidStateError, parseState } from "@/lib/state-validation";
type State = { students: any[]; teachers: any[]; courses: any[]; levels: any[]; enrollments: any[]; expenses: any[]; payments: any[]; collections: any[]; sessions: any[]; payouts: any[]; rooms: any[]; attendances: any[] };

async function writeState(tx: any, state: State) {
  await tx.attendance.deleteMany(); await tx.paymentCollection.deleteMany(); await tx.enrollment.deleteMany(); await tx.payment.deleteMany(); await tx.payout.deleteMany(); await tx.session.deleteMany(); await tx.packSubject.deleteMany(); await tx.courseLevel.deleteMany(); await tx.course.deleteMany(); await tx.level.deleteMany(); await tx.expense.deleteMany(); await tx.room.deleteMany(); await tx.student.deleteMany(); await tx.teacher.deleteMany();
  for (const teacher of state.teachers) await tx.teacher.create({ data: { id: teacher.id, name: teacher.name, specialty: teacher.specialty, commission: teacher.commission } });
  for (const level of state.levels || []) await tx.level.create({ data: { id: level.id, code: level.code, nameAr: level.nameAr, nameFr: level.nameFr, abbreviation: level.abbreviation || "", curriculum: level.curriculum, cycle: level.cycle, sortOrder: level.sortOrder } });
  for (const course of state.courses) { const teacher = state.teachers.find(item => item.name === course.teacher); const levelIds = course.levelIds?.length ? course.levelIds : course.levelId ? [course.levelId] : []; await tx.course.create({ data: { id: course.id, name: course.name, type: course.type, price: course.price, teacherId: teacher?.id, levelId: levelIds[0] || null } }); for (const levelId of levelIds) await tx.courseLevel.create({ data: { courseId: course.id, levelId } }); }
  for (const pack of state.courses.filter(item => item.type === "باقة")) for (const subjectId of pack.subjectIds || []) await tx.packSubject.create({ data: { packId: pack.id, subjectId } });
  for (const student of state.students) await tx.student.create({ data: { id: student.id, name: student.name, phone: student.phone, whatsapp: student.whatsapp, status: student.status, due: student.due, lastPayment: student.lastPayment, enrollmentDate: student.enrollmentDate, enrollmentFee: student.enrollmentFee || 0, subscriptionYear: student.subscriptionYear } });
  for (const enrollment of state.enrollments) await tx.enrollment.create({ data: { id: enrollment.id, studentId: enrollment.studentId, courseId: enrollment.courseId, enrolledAt: enrollment.enrolledAt, removedAt: enrollment.removedAt, status: enrollment.status, source: enrollment.source, discount: enrollment.discount || 0 } });
  for (const payment of state.payments) await tx.payment.create({ data: { id: payment.id, studentId: payment.studentId, courseId: payment.courseId, enrollmentId: payment.enrollmentId, billingMonth: payment.billingMonth, amount: payment.amount, totalAmount: payment.totalAmount, month: payment.month, status: payment.status, date: payment.date, method: payment.method, receiptNumber: payment.receiptNumber } });
  for (const collection of state.collections || []) await tx.paymentCollection.create({ data: { id: collection.id, paymentId: collection.paymentId, amount: collection.amount, date: collection.date, method: collection.method, receiptNumber: collection.receiptNumber } });
  for (const expense of state.expenses) await tx.expense.create({ data: { id: expense.id, title: expense.title, category: expense.category, amount: expense.amount, date: expense.date } });
  for (const room of state.rooms || []) await tx.room.create({ data: { id: room.id, name: room.name } });
  for (const session of state.sessions) { const teacher = state.teachers.find(item => item.name === session.teacher); const course = state.courses.find(item => Number(item.id) === Number(session.courseId)) || state.courses.find(item => item.name === session.course && item.teacher === session.teacher) || state.courses.find(item => item.name === session.course); await tx.session.create({ data: { id: session.id, title: session.title, teacherId: teacher?.id, courseId: course?.id, date: session.date, weekday: session.weekday, time: session.time, endTime: session.endTime, room: session.room } }); }
  for (const attendance of state.attendances || []) await tx.attendance.create({ data: { id: attendance.id, sessionId: attendance.sessionId, studentId: attendance.studentId, occurrenceDate: attendance.occurrenceDate, status: attendance.status } });
  for (const payout of state.payouts) await tx.payout.create({ data: { id: payout.id, teacherId: payout.teacherId, month: payout.month, studentCount: payout.studentCount, revenue: payout.revenue, commission: payout.commission, amount: payout.amount, status: payout.status, paidAt: payout.paidAt } });
}

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

export async function GET() { try { const user = await requireUser(); const state = await readState(); if (user.role === "ADMIN") return NextResponse.json({ ...state, expenses: [], payouts: [] }); return NextResponse.json(state); } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Unable to load database state" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 }); } }
export async function PUT(request: Request) { try { const user = await requireUser(); const data = parseState<State>(await request.json().catch(() => null)); if (user.role === "ADMIN") { const existing = await readState(); data.expenses = existing.expenses; data.payouts = existing.payouts; } await prisma.$transaction(tx => writeState(tx, data)); return NextResponse.json(await readState()); } catch (error) { console.error(error); const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED"; const invalid = error instanceof InvalidStateError; return NextResponse.json({ error: unauthorized ? "Unauthorized" : invalid ? error.message : "Unable to save relational database state" }, { status: unauthorized ? 401 : invalid ? 400 : 500 }); } }
