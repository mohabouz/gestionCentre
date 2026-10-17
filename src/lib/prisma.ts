import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// Keep the fallback aligned with `.env` and Prisma CLI resolution. Using a
// second fallback path can make a restart appear to have lost all data.
const tursoUrl = process.env.TURSO_DATABASE_URL;
if (process.env.VERCEL && !tursoUrl) {
	throw new Error(
		"TURSO_DATABASE_URL is required on Vercel because local SQLite storage is not persistent.",
	);
}
const adapter = tursoUrl
	? new PrismaLibSql({
			url: tursoUrl,
			authToken: process.env.TURSO_AUTH_TOKEN,
		})
	: new PrismaBetterSqlite3({
			url: process.env.DATABASE_URL || "file:./dev.db",
		});
const cachedPrisma = globalForPrisma.prisma;
export const prisma = cachedPrisma?.paymentCollection?.findMany
	? cachedPrisma
	: new PrismaClient({ adapter });
if (cachedPrisma && cachedPrisma !== prisma) {
	void cachedPrisma.$disconnect().catch(() => undefined);
}
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
