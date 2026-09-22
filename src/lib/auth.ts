import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "centman_session";
export type UserRole = "ADMIN" | "SUPER_ADMIN";
export type AuthUser = { id: number; name: string; username: string; role: UserRole };
export function normalizeRole(role: string): UserRole { return role.replace(/[-\s]/g, "_").toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"; }

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
export function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(":"); if (!salt || !hash) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, "hex"); return actual.length === expected.length && timingSafeEqual(actual, expected); }
export function passwordHash(password: string) { if (password.length < 8) throw new Error("Password must contain at least 8 characters"); return hashPassword(password); }
export async function hasUsers() { return (await prisma.user.count()) > 0; }
export async function createSession(user: AuthUser) { const token = randomBytes(32).toString("hex"); await prisma.authSession.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12) } }); (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 }); }
export async function clearSession() { const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value; if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } }); store.delete(SESSION_COOKIE); }
export async function getCurrentUser(): Promise<AuthUser | null> { const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null; const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } }); if (!session) return null; if (session.expiresAt <= new Date() || session.user.active === false) { await prisma.authSession.delete({ where: { id: session.id } }); return null; } return { id: session.user.id, name: session.user.name, username: session.user.username, role: normalizeRole(session.user.role) }; }
export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }