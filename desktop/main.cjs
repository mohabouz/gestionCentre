const { app, BrowserWindow, dialog, Menu } = require("electron");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const PREFERRED_PORT = 38457;
let serverProcess = null;
let mainWindow = null;

const resourceDir = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, "..", "desktop-build");
const dataDir =
  process.env.CENTMAN_DATA_DIR ||
  (process.env.PORTABLE_EXECUTABLE_DIR
    ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, "CentMan-data")
    : path.join(app.getPath("userData"), "data"));

const isPortFree = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });

const pickPort = async () => {
  if (await isPortFree(PREFERRED_PORT)) return PREFERRED_PORT;
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
};

const waitForServer = (port, isAlive) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const attempt = () => {
      if (!isAlive()) return reject(new Error("server exited"));
      const request = http.get({ host: "127.0.0.1", port, path: "/login", timeout: 2000 }, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", retry);
      request.on("timeout", () => request.destroy());
    };
    const retry = () => {
      if (Date.now() - startedAt > 90000) return reject(new Error("timeout"));
      setTimeout(attempt, 400);
    };
    attempt();
  });

const stopServer = () => {
  if (!serverProcess) return;
  const pid = serverProcess.pid;
  serverProcess = null;
  spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
};

const startServer = async () => {
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await pickPort();
  const serverDir = path.join(resourceDir, "server");
  const logPath = path.join(dataDir, "server.log");
  const log = fs.openSync(logPath, "a");
  let exited = false;
  serverProcess = spawn(path.join(resourceDir, "node", "node.exe"), [path.join(serverDir, "centman-start.cjs")], {
    cwd: serverDir,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${path.join(dataDir, "centman.db").replaceAll("\\", "/")}`,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  serverProcess.on("exit", () => {
    exited = true;
  });
  try {
    await waitForServer(port, () => !exited);
  } catch (error) {
    throw new Error(`${error.message}. Details: ${logPath}`);
  }
  return port;
};

const createWindow = (port) => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "CentMan",
    autoHideMenuBar: true,
    backgroundColor: "#f5f7f6",
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: "allow",
    overrideBrowserWindowOptions: { autoHideMenuBar: true, width: 900, height: 1100 },
  }));
  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    try {
      createWindow(await startServer());
    } catch (error) {
      dialog.showErrorBox("CentMan", `تعذر تشغيل التطبيق\n${error.message}`);
      stopServer();
      app.quit();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", stopServer);
  app.on("will-quit", stopServer);
}
