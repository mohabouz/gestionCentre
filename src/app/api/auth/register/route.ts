import { NextResponse } from "next/server";
import { createSession, hasUsers, passwordHash } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    if (await hasUsers()) return NextResponse.json({ error: "Super-admin already exists" }, { status: 409 });
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name || !username || !password) return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    const user = await prisma.user.create({ data: { name, username, passwordHash: passwordHash(password), role: "SUPER_ADMIN" } });
    await createSession({ id: user.id, name: user.name, username: user.username, role: "SUPER_ADMIN" });
    return NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role } }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create super-admin" }, { status: 500 }); }
}
