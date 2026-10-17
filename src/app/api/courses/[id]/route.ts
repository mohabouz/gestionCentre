import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseCourseInput } from "@/lib/course-input";
import { replaceCourseLinks, resolveCourseRelations } from "@/lib/course-mutations";
import { prisma } from "@/lib/prisma";

function courseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = courseId(value);
    const input = parseCourseInput(await request.json().catch(() => null));
    if (!id || !input) return NextResponse.json({ error: "Invalid course information" }, { status: 400 });
    const course = await prisma.$transaction(async (tx) => {
      const relations = await resolveCourseRelations(tx, input);
      if (!relations) return null;
      const updated = await tx.course.update({ where: { id }, data: { name: input.name, type: input.type, price: input.price, teacherId: relations.teacherId, levelId: input.levelIds[0] } });
      await replaceCourseLinks(tx, id, input);
      return updated;
    });
    if (!course) return NextResponse.json({ error: "Unknown teacher, level, or subject" }, { status: 400 });
    return NextResponse.json(course);
  } catch (error) {
    return courseError(error, "update");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = courseId(value);
    if (!id) return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    await prisma.course.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return courseError(error, "delete");
  }
}

function courseError(error: unknown, operation: "update" | "delete") {
  console.error(error);
  const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
  return NextResponse.json({ error: notFound ? "Course not found" : `Unable to ${operation} course` }, { status: notFound ? 404 : 500 });
}
