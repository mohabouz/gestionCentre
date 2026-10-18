import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRegistrationInput, saveStudentRegistration } from "@/lib/student-registration";
import { refreshDraftPayouts } from "@/lib/payout-refresh";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = parseRegistrationInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "Invalid student registration" }, { status: 400 });
    const student = await prisma.$transaction((tx) => saveStudentRegistration(tx, input));
    if (!student) return NextResponse.json({ error: "Unknown course" }, { status: 400 });
    await refreshDraftPayouts(input.date.slice(0, 7));
    return NextResponse.json(student, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to register student" }, { status: 500 }); }
}
