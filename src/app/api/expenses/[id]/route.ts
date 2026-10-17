import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super-admin access required" },
        { status: 403 },
      );
    }
    const { id } = await context.params;
    const expenseId = Number(id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    const notFound =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025";
    return NextResponse.json(
      { error: notFound ? "Expense not found" : "Unable to delete expense" },
      { status: notFound ? 404 : 500 },
    );
  }
}
