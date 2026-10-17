// Runs inside the packaged app with the bundled node.exe: migrate the database, then start Next.
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL must be a file: URL");
const dbPath = databaseUrl.slice("file:".length);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const migrationsDir = path.join(__dirname, "migrations");
const db = new Database(dbPath);
db.exec("create table if not exists _centman_migrations (name text primary key, appliedAt text not null)");
const applied = new Set(db.prepare("select name from _centman_migrations").all().map((row) => row.name));
const hasPrismaTable = db.prepare("select 1 from sqlite_master where type='table' and name='_prisma_migrations'").get();
if (hasPrismaTable) {
  for (const row of db.prepare("select migration_name from _prisma_migrations where finished_at is not null").all())
    applied.add(row.migration_name);
}
const pending = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .filter((name) => !applied.has(name));
for (const name of pending) {
  db.exec(fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
  db.prepare("insert into _centman_migrations (name, appliedAt) values (?, ?)").run(name, new Date().toISOString());
  console.log(`Applied migration ${name}`);
}
db.close();

require("./server.js");
