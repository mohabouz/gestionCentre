import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const levelId = Number(id);
    const body = await request.json().catch(() => null);
    const nameAr = String(body?.nameAr || "").trim();
    const nameFr = String(body?.nameFr || "").trim();
    const abbreviation = String(body?.abbreviation || "").trim().toUpperCase();
    if (!Number.isInteger(levelId) || levelId <= 0 || !nameAr || !nameFr || !abbreviation) {
      return NextResponse.json({ error: "Invalid level information" }, { status: 400 });
    }
    const level = await prisma.level.update({
      where: { id: levelId },
      data: { nameAr, nameFr, abbreviation },
    });
    return NextResponse.json(level);
  } catch (error) {
    console.error(error);
    const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
    return NextResponse.json({ error: notFound ? "Level not found" : "Unable to update level" }, { status: notFound ? 404 : 500 });
  }
}
