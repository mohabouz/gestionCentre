import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    return NextResponse.json(await prisma.room.create({ data: { name } }), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create room" }, { status: 500 });
  }
}
