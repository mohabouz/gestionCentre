import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

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
