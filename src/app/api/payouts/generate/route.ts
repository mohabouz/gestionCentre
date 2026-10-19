import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDraftPayoutsInTransaction } from "@/lib/payout-refresh";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
    const body = await request.json().catch(() => null);
    const month = String(body?.month || "");
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid payout month" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const [teachers, existing] = await Promise.all([
        tx.teacher.findMany(),
        tx.payout.findMany({ where: { month }, select: { teacherId: true } }),
      ]);
      const existingTeacherIds = new Set(existing.map((payout) => payout.teacherId));
      const missing = teachers.filter((teacher) => !existingTeacherIds.has(teacher.id));
      if (missing.length) {
        await tx.payout.createMany({
          data: missing.map((teacher) => ({
            teacherId: teacher.id,
            month,
            studentCount: 0,
            revenue: 0,
            commission: teacher.commission,
            amount: 0,
            status: "مسودة",
          })),
        });
      }
      await refreshDraftPayoutsInTransaction(tx, month);
      return missing.length;
    });
    return NextResponse.json({ created });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate payouts" }, { status: 500 });
  }
}
