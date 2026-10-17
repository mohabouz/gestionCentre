import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = Number(value);
    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !name) return NextResponse.json({ error: "Invalid room information" }, { status: 400 });
    const room = await prisma.$transaction(async (tx) => {
      const current = await tx.room.findUniqueOrThrow({ where: { id } });
      const updated = await tx.room.update({ where: { id }, data: { name } });
      await tx.session.updateMany({ where: { room: current.name }, data: { room: name } });
      return updated;
    });
    return NextResponse.json(room);
  } catch (error) {
    return roomError(error, "update");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: value } = await context.params;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUniqueOrThrow({ where: { id } });
      await tx.session.updateMany({ where: { room: room.name }, data: { room: "" } });
      await tx.room.delete({ where: { id } });
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return roomError(error, "delete");
  }
}

function roomError(error: unknown, operation: "update" | "delete") {
  console.error(error);
  const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
  return NextResponse.json({ error: notFound ? "Room not found" : `Unable to ${operation} room` }, { status: notFound ? 404 : 500 });
}
