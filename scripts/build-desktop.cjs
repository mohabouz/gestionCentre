// One-step desktop build: npm run desktop  (add --dir for an unpacked folder only)
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const stage = path.join(root, "desktop-build");
const dirOnly = process.argv.includes("--dir");
const version = require(path.join(root, "package.json")).version;

const run = (command, args, env = {}) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    console.error(`\nFailed: ${command} ${args.join(" ")}`);
    process.exit(result.status || 1);
  }
};
const copy = (from, to) => fs.cpSync(from, to, { recursive: true, dereference: true });

const distDir = ".next-desktop";
const tsconfigPath = path.join(root, "tsconfig.json");
const tsconfigBefore = fs.readFileSync(tsconfigPath);
run("npx", ["prisma", "generate"]);
fs.rmSync(path.join(root, distDir), { recursive: true, force: true });
run("npx", ["next", "build"], { NEXT_TELEMETRY_DISABLED: "1", CENTMAN_DIST_DIR: distDir });
// Next rewrites tsconfig.json for the custom distDir; keep the dev config untouched.
fs.writeFileSync(tsconfigPath, tsconfigBefore);

const standalone = path.join(root, distDir, "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("Standalone output missing. Is output: 'standalone' set in next.config.ts?");
  process.exit(1);
}

fs.rmSync(stage, { recursive: true, force: true });
const server = path.join(stage, "server");
copy(standalone, server);
copy(path.join(root, distDir, "static"), path.join(server, distDir, "static"));
if (fs.existsSync(path.join(root, "public"))) copy(path.join(root, "public"), path.join(server, "public"));
copy(path.join(root, "prisma", "migrations"), path.join(server, "migrations"));
copy(path.join(root, "desktop", "server-start.cjs"), path.join(server, "centman-start.cjs"));

// Never ship local data or secrets.
for (const leftover of ["dev.db", ".env", path.join("prisma", "dev.db")])
  fs.rmSync(path.join(server, leftover), { force: true });

const sqlite = path.join(server, "node_modules", "better-sqlite3");
if (!fs.existsSync(path.join(sqlite, "prebuilds", "win32-x64.node"))) {
  console.log("Copying better-sqlite3 native module...");
  fs.rmSync(sqlite, { recursive: true, force: true });
  copy(path.join(root, "node_modules", "better-sqlite3"), sqlite);
  for (const dependency of ["bindings", "file-uri-to-path"])
    copy(path.join(root, "node_modules", dependency), path.join(server, "node_modules", dependency));
}

// The bundled runtime is the Node that built the native module, so the ABI always matches.
fs.mkdirSync(path.join(stage, "node"), { recursive: true });
fs.copyFileSync(process.execPath, path.join(stage, "node", "node.exe"));

const shell = path.join(stage, "shell");
fs.mkdirSync(shell, { recursive: true });
fs.copyFileSync(path.join(root, "desktop", "main.cjs"), path.join(shell, "main.cjs"));
fs.writeFileSync(
  path.join(shell, "package.json"),
  JSON.stringify(
    { name: "centman-desktop", productName: "CentMan", version, description: "CentMan", author: "CentMan", main: "main.cjs" },
    null,
    2,
  ),
);

fs.rmSync(path.join(root, "dist-desktop"), { recursive: true, force: true });
run("npx", ["electron-builder", "--win", "--config", "electron-builder.config.cjs"], {
  ...(dirOnly ? { CENTMAN_DESKTOP_DIR_ONLY: "1" } : {}),
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
});

console.log(`\nDone. Output: ${path.join(root, "dist-desktop")}`);
