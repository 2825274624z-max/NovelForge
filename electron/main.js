const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let serverProcess;
let mainWindow;

const isDev = process.env.NODE_ENV === "development";
const PORT = 3000;

function resolveNodeBin(resourcesPath) {
  // 1. 捆绑的便携 Node.js（优先，无需用户安装）
  const bundled = path.join(resourcesPath, "node-portable", "node.exe");
  if (fs.existsSync(bundled)) return bundled;

  // 2. 搜索系统 Node.js
  if (!isDev) {
    const candidates = [
      "node",
      "nodejs",
      path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"),
      path.join(process.env.ProgramFiles || "C:\\Program Files (x86)", "nodejs", "node.exe"),
    ];
    for (const c of candidates) {
      try {
        const result = require("child_process").spawnSync(c, ["-v"], { timeout: 3000 });
        if (result.status === 0) return c;
      } catch {}
    }
  }
  return "node";
}

function ensureDb(userDataPath, resourcesPath) {
  const dbDir = path.join(userDataPath, "NovelForge");
  const dbFile = path.join(dbDir, "dev.db");

  if (!fs.existsSync(dbFile)) {
    fs.mkdirSync(dbDir, { recursive: true });
    const seedDb = path.join(resourcesPath, "standalone", "prisma", "dev.db");
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, dbFile);
      console.log("Database seeded from:", seedDb);
    }
  }

  return dbDir;
}

function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      serverProcess = spawn("npx", ["next", "dev", "-p", String(PORT)], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
      serverProcess.stderr.on("data", (d) => {
        if (d.toString().includes("localhost:" + PORT)) resolve();
      });
    } else {
      const resourcesPath = process.resourcesPath;
      const userDataPath = app.getPath("userData");
      const dbDir = ensureDb(userDataPath, resourcesPath);

      const serverPath = path.join(resourcesPath, "standalone", "server.js");
      const nodeBin = resolveNodeBin(resourcesPath);

      serverProcess = spawn(nodeBin, [serverPath], {
        cwd: path.join(resourcesPath, "standalone"),
        env: {
          ...process.env,
          PORT: String(PORT),
          NODE_ENV: "production",
          NOVELFORGE_DB_PATH: dbDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      serverProcess.stderr?.on("data", (d) => {
        stderr += d.toString();
      });

      serverProcess.on("error", (err) => {
        reject(new Error("无法启动服务进程: " + err.message));
      });

      serverProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error("服务进程异常退出 (code " + code + "): " + stderr.slice(0, 500)));
        }
      });
    }

    // 轮询检查服务器就绪
    let attempts = 0;
    const maxAttempts = 120;
    const checkReady = () => {
      attempts++;
      http
        .get(`http://localhost:${PORT}/projects`, () => resolve())
        .on("error", () => {
          if (attempts < maxAttempts) setTimeout(checkReady, 500);
          else reject(new Error("服务启动超时"));
        });
    };
    setTimeout(checkReady, 2000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "NovelForge - AI 小说写作助手",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}/projects`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (e) {
    dialog.showErrorBox(
      "启动失败",
      "无法启动 NovelForge 服务。\n\n" + (e.message || String(e))
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
