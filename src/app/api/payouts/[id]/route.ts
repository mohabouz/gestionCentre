import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDraftPayoutsInTransaction } from "@/lib/payout-refresh";

type PayoutAction = "finalize" | "draft" | "cancel";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
    const { id } = await context.params;
    const payoutId = Number(id);
    const body = await request.json().catch(() => null);
    const action = String(body?.action || "") as PayoutAction;
    const date = String(body?.date || "");
    if (!Number.isInteger(payoutId) || payoutId <= 0 || !["finalize", "draft", "cancel"].includes(action) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid payout adjustment" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({ where: { id: payoutId } });
      if (!payout) return null;
      if (action === "finalize") {
        if (payout.status !== "مسودة") return { conflict: true };
        await refreshDraftPayoutsInTransaction(tx, payout.month);
        await tx.payout.update({ where: { id: payoutId }, data: { status: "مدفوعة", paidAt: date } });
      } else if (action === "cancel") {
        if (payout.status !== "مسودة") return { conflict: true };
        await tx.payout.update({ where: { id: payoutId }, data: { status: "ملغاة", paidAt: null } });
      } else {
        await tx.payout.update({ where: { id: payoutId }, data: { status: "مسودة", paidAt: null } });
        await refreshDraftPayoutsInTransaction(tx, payout.month);
      }
      return { conflict: false };
    });
    if (!result) return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (result.conflict) return NextResponse.json({ error: "Payout status changed; reload and try again" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to adjust payout" }, { status: 500 });
  }
}
