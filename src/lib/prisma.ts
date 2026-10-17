import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// Keep the fallback aligned with `.env` and Prisma CLI resolution. Using a
// second fallback path can make a restart appear to have lost all data.
const tursoUrl = process.env.TURSO_DATABASE_URL;
const localUrl = process.env.VERCEL
	? temporaryVercelDatabaseUrl()
	: process.env.DATABASE_URL || "file:./dev.db";
const adapter = tursoUrl
	? new PrismaLibSql({
			url: tursoUrl,
			authToken: process.env.TURSO_AUTH_TOKEN,
		})
	: new PrismaBetterSqlite3({
			url: localUrl,
		});
const cachedPrisma = globalForPrisma.prisma;
export const prisma = cachedPrisma?.paymentCollection?.findMany
	? cachedPrisma
	: new PrismaClient({ adapter });
if (cachedPrisma && cachedPrisma !== prisma) {
	void cachedPrisma.$disconnect().catch(() => undefined);
}
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function temporaryVercelDatabaseUrl() {
	const deployment = (process.env.VERCEL_GIT_COMMIT_SHA || "demo").replace(
		/[^a-zA-Z0-9_-]/g,
		"",
	);
	const target = join(tmpdir(), `centman-${deployment}.db`);
	if (!existsSync(target)) {
		const template = join(process.cwd(), "dev.db");
		if (!existsSync(template)) {
			throw new Error("The temporary Vercel database template is missing.");
		}
		copyFileSync(template, target);
	}
	return `file:${target.replaceAll("\\", "/")}`;
}
