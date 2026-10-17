import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super-admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const title = String(body?.title || "").trim();
    const category = String(body?.category || "").trim();
    const amount = Number(body?.amount);
    const date = String(body?.date || "");
    if (
      !title ||
      !category ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return NextResponse.json(
        { error: "Invalid expense information" },
        { status: 400 },
      );
    }

    const expense = await prisma.expense.create({
      data: { title, category, amount, date },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to create expense" },
      { status: 500 },
    );
  }
}
