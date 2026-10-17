import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const validStatuses = new Set(["حاضر", "غائب", "متأخر"]);

export async function PUT(request: Request) {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const sessionId = Number(body?.sessionId);
    const occurrenceDate = String(body?.occurrenceDate || "");
    const records = Array.isArray(body?.records) ? body.records : null;
    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate) ||
      !records ||
      !records.length
    ) {
      return NextResponse.json({ error: "Invalid attendance information" }, { status: 400 });
    }

    const studentIds = records.map((record: Record<string, unknown>) => Number(record.studentId));
    if (
      studentIds.some((id: number) => !Number.isInteger(id) || id <= 0) ||
      new Set(studentIds).size !== studentIds.length ||
      records.some((record: Record<string, unknown>) => !validStatuses.has(String(record.status)))
    ) {
      return NextResponse.json({ error: "Invalid attendance records" }, { status: 400 });
    }

    const [session, studentCount] = await Promise.all([
      prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } }),
      prisma.student.count({ where: { id: { in: studentIds }, status: "نشط" } }),
    ]);
    if (!session || studentCount !== studentIds.length) {
      return NextResponse.json({ error: "Unknown session or inactive student" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { sessionId, occurrenceDate } });
      await tx.attendance.createMany({
        data: records.map((record: Record<string, unknown>) => ({
          sessionId,
          occurrenceDate,
          studentId: Number(record.studentId),
          status: String(record.status),
        })),
      });
    });
    return NextResponse.json({ saved: records.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save attendance" }, { status: 500 });
  }
}
