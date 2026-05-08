const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let serverProcess;
let mainWindow;

const isDev = process.env.NODE_ENV === "development";
const PORT = 3000;

function ensureDb(userDataPath, resourcesPath) {
  const dbDir = path.join(userDataPath, "prisma");
  const dbFile = path.join(dbDir, "dev.db");

  if (!fs.existsSync(dbFile)) {
    fs.mkdirSync(dbDir, { recursive: true });

    // 复制种子数据库（含完整表结构）
    const seedDb = path.join(resourcesPath, "standalone", "prisma", "dev.db");
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, dbFile);
    }

    // 复制迁移脚本
    for (const f of ["init-db.js", "migrate-v0.5.js", "schema.prisma"]) {
      const src = path.join(resourcesPath, "prisma", f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(dbDir, f));
      }
    }
  }

  // 确保所有表都存在（安全迁移）
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dbFile);
    const migrations = require(path.join(__dirname, "..", "..", "prisma", "migrate-v0.5.js"));
    // migrate-v0.5.js 导出的可以在这里调用
    db.close();
  } catch {
    // 迁移通过 server 端 init-db 处理
  }

  return userDataPath;
}

function startServer() {
  return new Promise((resolve) => {
    if (isDev) {
      const nextBin = path.join(__dirname, "..", "node_modules", ".bin", "next.cmd");
      serverProcess = spawn(nextBin, ["dev", "-p", String(PORT)], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
    } else {
      const resourcesPath = process.resourcesPath;
      const userDataPath = app.getPath("userData");

      // 确保数据库在用户数据目录
      ensureDb(userDataPath, resourcesPath);

      const serverPath = path.join(resourcesPath, "standalone", "server.js");
      serverProcess = spawn("node", [serverPath], {
        cwd: userDataPath,
        env: {
          ...process.env,
          PORT: String(PORT),
          NODE_ENV: "production",
          PRISMA_DB_PATH: path.join(userDataPath, "prisma", "dev.db"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    }

    // 轮询检查服务器就绪
    let attempts = 0;
    const maxAttempts = 80;
    const checkReady = () => {
      attempts++;
      http
        .get(`http://localhost:${PORT}/projects`, () => resolve())
        .on("error", () => {
          if (attempts < maxAttempts) setTimeout(checkReady, 400);
          else resolve();
        });
    };
    setTimeout(checkReady, 1500);
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
      preload: path.join(__dirname, "preload.js"),
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
    dialog.showErrorBox("启动失败", e.message || String(e));
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
