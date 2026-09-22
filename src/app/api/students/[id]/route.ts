import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const studentId = Number(id);
    if (!Number.isInteger(studentId)) return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    await prisma.student.delete({ where: { id: studentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to delete student" }, { status: 500 });
  }
}
