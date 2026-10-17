const path = require("path");
const fs = require("fs");

const stage = path.join(__dirname, "desktop-build");
const targets = process.env.CENTMAN_DESKTOP_DIR_ONLY
  ? [{ target: "dir", arch: ["x64"] }]
  : [
    { target: "nsis", arch: ["x64"] },
    { target: "portable", arch: ["x64"] },
  ];
// Hidden folders are skipped by default, so list them explicitly.
const everything = ["**/*", ".next-desktop/**/*"];

module.exports = {
  appId: "ma.centman.desktop",
  productName: "CentMan",
  electronVersion: require("electron/package.json").version,
  directories: { app: path.join(stage, "shell"), output: path.join(__dirname, "dist-desktop") },
  files: ["main.cjs", "package.json", "!node_modules/**/*"],
  extraResources: [
    { from: path.join(stage, "server"), to: "server", filter: everything },
    { from: path.join(stage, "node"), to: "node" },
  ],
  npmRebuild: false,
  // extraResources always drops node_modules, so copy the server's one in by hand.
  afterPack: async (context) => {
    fs.cpSync(
      path.join(stage, "server", "node_modules"),
      path.join(context.appOutDir, "resources", "server", "node_modules"),
      { recursive: true },
    );
  },
  win: { target: targets, signAndEditExecutable: false },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true, perMachine: false },
  portable: { artifactName: "CentMan-Portable-${version}.exe" },
};
