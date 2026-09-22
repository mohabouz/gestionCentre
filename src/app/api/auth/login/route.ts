import { NextResponse } from "next/server";
import { createSession, hasUsers, normalizeRole, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    if (!(await hasUsers())) return NextResponse.json({ error: "Setup is required", needsSetup: true }, { status: 409 });
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.active === false || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    await createSession({ id: user.id, name: user.name, username: user.username, role: normalizeRole(user.role) });
    return NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to sign in" }, { status: 500 }); }
}
