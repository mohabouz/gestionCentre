import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
    }

    const options = await request.json().catch(() => null);
    if (!options || typeof options !== "object") {
      return NextResponse.json({ error: "Select at least one data category" }, { status: 400 });
    }
    const clear = {
      students: options.students === true,
      teachers: options.teachers === true,
      courses: options.courses === true,
      levels: options.levels === true,
      enrollments: options.enrollments === true,
      payments: options.payments === true,
      attendance: options.attendance === true,
      expenses: options.expenses === true,
      payouts: options.payouts === true,
      schedule: options.schedule === true,
      rooms: options.rooms === true,
      accounts: options.accounts === true,
      settings: options.settings === true,
    };
    if (!Object.values(clear).some(Boolean)) {
      return NextResponse.json({ error: "Select at least one data category" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (clear.attendance || clear.students || clear.enrollments || clear.schedule) await tx.attendance.deleteMany();
      if (clear.enrollments) await tx.enrollment.deleteMany();
      if (clear.payments) await tx.payment.deleteMany();
      if (clear.payouts || clear.teachers) await tx.payout.deleteMany();
      if (clear.schedule) await tx.session.deleteMany();
      if (clear.courses) await tx.packSubject.deleteMany();
      if (clear.expenses) await tx.expense.deleteMany();
      if (clear.rooms) await tx.room.deleteMany();
      if (clear.students) await tx.student.deleteMany();
      if (clear.courses) await tx.course.deleteMany();
      if (clear.levels) await tx.level.deleteMany();
      if (clear.teachers) await tx.teacher.deleteMany();
      if (clear.settings) await tx.appSettings.deleteMany({ where: { id: 1 } });
      if (clear.accounts) await tx.user.deleteMany();
    });

    return NextResponse.json({ success: true, cleared: clear });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    console.error(error);
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Unable to clean center data" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
