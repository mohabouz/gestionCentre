import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseRegistrationInput, saveStudentRegistration } from "@/lib/student-registration";
import { refreshDraftPayouts } from "@/lib/payout-refresh";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const studentId = Number(id);
    const input = parseRegistrationInput(await request.json().catch(() => null));
    if (!Number.isInteger(studentId) || studentId <= 0 || !input) return NextResponse.json({ error: "Invalid student registration" }, { status: 400 });
    const student = await prisma.$transaction((tx) => saveStudentRegistration(tx, input, studentId));
    if (!student) return NextResponse.json({ error: "Student or course not found" }, { status: 404 });
    await refreshDraftPayouts(input.date.slice(0, 7));
    return NextResponse.json(student);
  } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to update student" }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const studentId = Number(id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }
    await prisma.student.delete({ where: { id: studentId } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    const notFound =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025";
    return NextResponse.json(
      { error: notFound ? "Student not found" : "Unable to delete student" },
      { status: notFound ? 404 : 500 },
    );
  }
}
