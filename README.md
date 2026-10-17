# CentMan

CentMan is an Arabic-first education-center management application for students, teachers, courses, enrollments, payments, attendance, expenses, and teacher payouts. It runs as a Next.js web application and can also be packaged as a Windows desktop application with Electron.

## Requirements

- Node.js 22
- npm
- Windows is required for the current Electron packaging workflow

## Local setup

```bash
npm install
npm run db:migrate
npm run db:generate
npm run dev
```

Open <http://localhost:3000>. On a new database, `/setup` creates the first super-admin account.

The local database connection is configured by `DATABASE_URL` in `.env`. The default development database is the root `dev.db` SQLite file. All launch modes must use that path; a second database under `prisma/` can make data appear to vanish between restarts. Never commit `.env`, `*.db`, or database backup files.

## Quality checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The application uses system Arabic-capable fonts so production builds do not require access to Google Fonts.

## Database workflow

After changing `prisma/schema.prisma`, create and verify a migration:

```bash
npm run db:migrate
npm run db:generate
```

Use `npm run db:studio` to inspect local data. Back up the SQLite file before applying migrations to a database containing important center data.

## Desktop build

Create the Windows installer and portable package:

```bash
npm run desktop
```

Create only the unpacked application directory:

```bash
npm run desktop:dir
```

Desktop output is written to `dist-desktop/`. The packaged application stores its operational database in the application data directory and applies bundled SQL migrations at startup.

## Main structure

```text
src/app/                 Next.js pages and route handlers
src/components/          Shared client components
src/lib/                 Authentication, Prisma, and validation helpers
prisma/                  Schema and SQL migrations
desktop/                 Electron runtime
scripts/                 Desktop packaging scripts
tests/                   Dependency-free Node tests
```

## Roles

- `SUPER_ADMIN`: full access, including finances, settings, accounts, and cleanup.
- `ADMIN`: operational access; financial administration is restricted by the API and interface.

Authentication sessions are stored in SQLite and delivered through an HTTP-only cookie with a 12-hour lifetime.
