import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const defaults = { id: 1, name: "CentMan", address: "", phone: "", language: "العربية", notifications: true, logo: null };

export async function GET() {
  try { await requireUser(); const settings = await prisma.appSettings.upsert({ where: { id: 1 }, create: defaults, update: {} }); return NextResponse.json(settings); }
  catch (error) { console.error(error); return NextResponse.json({ error: "Unable to load settings" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try { const user = await requireUser(); if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin access required" }, { status: 403 }); const data = await request.json(); const settings = await prisma.appSettings.upsert({ where: { id: 1 }, create: { ...defaults, ...data, id: 1 }, update: { name: data.name, address: data.address, phone: data.phone, language: data.language, notifications: data.notifications, logo: data.logo || null } }); return NextResponse.json(settings); }
  catch (error) { console.error(error); return NextResponse.json({ error: "Unable to save settings" }, { status: 500 }); }
}
