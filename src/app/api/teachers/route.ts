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

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = teacherInput(await request.json().catch(() => null));
    if (!data) {
      return NextResponse.json(
        { error: "Invalid teacher information" },
        { status: 400 },
      );
    }
    return NextResponse.json(await prisma.teacher.create({ data }), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to create teacher" },
      { status: 500 },
    );
  }
}

