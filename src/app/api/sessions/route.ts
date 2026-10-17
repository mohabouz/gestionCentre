import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSessionInput } from "@/lib/session-input";
import { resolveSessionMutation } from "@/lib/session-mutations";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = parseSessionInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "Invalid session information" }, { status: 400 });
    const session = await prisma.$transaction(async (tx) => {
      const relations = await resolveSessionMutation(tx, input);
      if (!relations) return null;
      return tx.session.create({ data: { title: input.title, teacherId: relations.teacherId, courseId: relations.courseId, date: input.date, weekday: input.weekday, time: input.time, endTime: input.endTime, room: input.room } });
    });
    if (!session) return NextResponse.json({ error: "Session conflicts with another booking or has unknown references" }, { status: 409 });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create session" }, { status: 500 });
  }
}
