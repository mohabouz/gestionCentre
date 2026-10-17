import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSessionInput } from "@/lib/session-input";
import { resolveSessionMutation } from "@/lib/session-mutations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = Number(value);
    const input = parseSessionInput(await request.json().catch(() => null));
    if (!Number.isInteger(id) || id <= 0 || !input) return NextResponse.json({ error: "Invalid session information" }, { status: 400 });
    const session = await prisma.$transaction(async (tx) => {
      const relations = await resolveSessionMutation(tx, input, id);
      if (!relations) return null;
      return tx.session.update({ where: { id }, data: { title: input.title, teacherId: relations.teacherId, courseId: relations.courseId, date: input.date, weekday: input.weekday, time: input.time, endTime: input.endTime, room: input.room } });
    });
    if (!session) return NextResponse.json({ error: "Session conflicts with another booking or has unknown references" }, { status: 409 });
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
    return NextResponse.json({ error: notFound ? "Session not found" : "Unable to update session" }, { status: notFound ? 404 : 500 });
  }
}
