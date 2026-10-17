import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseCourseInput } from "@/lib/course-input";
import { replaceCourseLinks, resolveCourseRelations } from "@/lib/course-mutations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = parseCourseInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "Invalid course information" }, { status: 400 });
    const course = await prisma.$transaction(async (tx) => {
      const relations = await resolveCourseRelations(tx, input);
      if (!relations) return null;
      const created = await tx.course.create({ data: { name: input.name, type: input.type, price: input.price, teacherId: relations.teacherId, levelId: input.levelIds[0] } });
      await replaceCourseLinks(tx, created.id, input);
      return created;
    });
    if (!course) return NextResponse.json({ error: "Unknown teacher, level, or subject" }, { status: 400 });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create course" }, { status: 500 });
  }
}
