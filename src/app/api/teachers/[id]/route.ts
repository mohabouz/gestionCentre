import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function teacherInput(body: unknown) {
  const value = body as Record<string, unknown> | null;
  const name = String(value?.name || "").trim();
  const specialty = String(value?.specialty || "").trim();
  const commission = Number(value?.commission);
  if (
    !name ||
    !specialty ||
    !Number.isInteger(commission) ||
    commission < 0 ||
    commission > 100
  ) {
    return null;
  }
  return { name, specialty, commission };
}

function teacherId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = teacherId(value);
    const data = teacherInput(await request.json().catch(() => null));
    if (!id || !data) {
      return NextResponse.json(
        { error: "Invalid teacher information" },
        { status: 400 },
      );
    }
    return NextResponse.json(await prisma.teacher.update({ where: { id }, data }));
  } catch (error) {
    return handleTeacherError(error, "update");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = teacherId(value);
    if (!id) {
      return NextResponse.json({ error: "Invalid teacher id" }, { status: 400 });
    }
    await prisma.teacher.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleTeacherError(error, "delete");
  }
}

function handleTeacherError(error: unknown, operation: "update" | "delete") {
  console.error(error);
  const notFound =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025";
  return NextResponse.json(
    {
      error: notFound
        ? "Teacher not found"
        : `Unable to ${operation} teacher`,
    },
    { status: notFound ? 404 : 500 },
  );
}
