const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const util = require("node:util");

const appName = "小晴的AI影视妙妙屋";
let localServer = null;
let mainWindow = null;
let logFile = null;
let updateAvailable = false;
let updateDownloaded = false;

function appRoot() {
  return app.getAppPath();
}

function appIconPath() {
  return path.join(appRoot(), "build", "icon.ico");
}

function sendUpdaterStatus(status, detail = {}) {
  const payload = {
    status,
    version: app.getVersion(),
    ...detail
  };
  log(`Updater status: ${JSON.stringify(payload)}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:status", payload);
  }
}

function updateFeedLooksConfigured() {
  if (!app.isPackaged) return false;
  const updateConfig = path.join(process.resourcesPath, "app-update.yml");
  if (!fs.existsSync(updateConfig)) return false;
  const content = fs.readFileSync(updateConfig, "utf8");
  return !content.includes("YOUR_GITHUB_USERNAME");
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdaterStatus("checking");
  });

  autoUpdater.on("update-available", (info) => {
    updateAvailable = true;
    updateDownloaded = false;
    sendUpdaterStatus("available", {
      latestVersion: info.version,
      releaseName: info.releaseName,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    updateAvailable = false;
    updateDownloaded = false;
    sendUpdaterStatus("none", {
      latestVersion: info.version
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdaterStatus("downloading", {
      percent: Math.round(progress.percent || 0),
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateDownloaded = true;
    sendUpdaterStatus("downloaded", {
      latestVersion: info.version
    });
  });

  autoUpdater.on("error", (error) => {
    sendUpdaterStatus("error", {
      message: error instanceof Error ? error.message : formatError(error)
    });
  });

  ipcMain.handle("updater:check", async () => {
    if (!app.isPackaged) {
      return {
        ok: false,
        status: "disabled",
        message: "Auto update is available after installing the packaged app."
      };
    }

    if (!updateFeedLooksConfigured()) {
      return {
        ok: false,
        status: "unconfigured",
        message: "GitHub update feed is not configured yet."
      };
    }

    try {
      await autoUpdater.checkForUpdates();
      return { ok: true, status: "checking", version: app.getVersion() };
    } catch (error) {
      return { ok: false, status: "error", message: formatError(error) };
    }
  });

  ipcMain.handle("updater:download", async () => {
    if (!updateAvailable) {
      return { ok: false, status: "none", message: "No update is ready to download." };
    }

    try {
      await autoUpdater.downloadUpdate();
      return { ok: true, status: "downloading" };
    } catch (error) {
      return { ok: false, status: "error", message: formatError(error) };
    }
  });

  ipcMain.handle("updater:install", () => {
    if (!updateDownloaded) {
      return { ok: false, status: "none", message: "No downloaded update is ready to install." };
    }

    autoUpdater.quitAndInstall(false, true);
    return { ok: true, status: "installing" };
  });
}

function ensureUserDataFiles() {
  const userData = app.getPath("userData");
  const dataDir = path.join(userData, "data");
  const uploadDir = path.join(userData, "uploads");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });

  const targetDb = path.join(dataDir, "dev.db");
  const sourceDb = path.join(appRoot(), "prisma", "app-template.db");
  const legacySourceDb = path.join(appRoot(), "prisma", "dev.db");
  if (!fs.existsSync(targetDb) && fs.existsSync(sourceDb)) {
    fs.copyFileSync(sourceDb, targetDb);
  } else if (!fs.existsSync(targetDb) && fs.existsSync(legacySourceDb)) {
    fs.copyFileSync(legacySourceDb, targetDb);
  }

  return { userData, dataDir, uploadDir, dbPath: targetDb };
}

function log(message) {
  try {
    if (!logFile) return;
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Ignore logging errors in production startup.
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return util.inspect(error, { depth: 8, colors: false, breakLength: 120 });
}

function fileUrlForPrisma(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function findPort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on("error", () => resolve(findPort(startPort + 1)));
  });
}

function waitForServer(url, timeoutMs = 45000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Local server did not start: ${url}`));
          return;
        }
        setTimeout(check, 450);
      });
    };
    check();
  });
}

async function startNextServer() {
  const port = await findPort(3000);
  const root = appRoot();
  const data = ensureUserDataFiles();

  logFile = path.join(data.userData, "desktop-startup.log");
  log(`App root: ${root}`);
  log(`User data: ${data.userData}`);
  log(`DB: ${data.dbPath}`);
  log(`Uploads: ${data.uploadDir}`);
  process.chdir(root);
  log(`Working directory: ${process.cwd()}`);

  process.env.NODE_ENV = app.isPackaged ? "production" : "development";
  process.env.DATABASE_URL = fileUrlForPrisma(data.dbPath);
  process.env.APP_UPLOAD_DIR = data.uploadDir;

  const next = require("next");
  const nextApp = next({
    dev: !app.isPackaged,
    dir: root,
    hostname: "127.0.0.1",
    port
  });
  const handle = nextApp.getRequestHandler();

  log(`Preparing Next app on port ${port}`);
  await nextApp.prepare();
  localServer = http.createServer((request, response) => {
    handle(request, response);
  });

  await new Promise((resolve, reject) => {
    localServer.once("error", reject);
    localServer.listen(port, "127.0.0.1", resolve);
  });

  log(`Local server listening on ${port}`);
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: appName,
    icon: appIconPath(),
    backgroundColor: "#eef1f5",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(url);
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith(url) && new URL(targetUrl).pathname === "/image-editor") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1320,
          height: 860,
          minWidth: 980,
          minHeight: 680,
          title: `${appName} - 修图`,
          icon: appIconPath(),
          backgroundColor: "#eef1f5",
          webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      };
    }
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  try {
    configureAutoUpdater();
    const url = await startNextServer();
    createWindow(url);
    if (updateFeedLooksConfigured()) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((error) => {
          sendUpdaterStatus("error", {
            message: error instanceof Error ? error.message : formatError(error)
          });
        });
      }, 4000);
    }
  } catch (error) {
    log(`Startup error: ${formatError(error)}`);
    dialog.showErrorBox(appName, error instanceof Error ? error.message : formatError(error));
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  log(`Uncaught exception: ${formatError(error)}`);
});

process.on("unhandledRejection", (error) => {
  log(`Unhandled rejection: ${formatError(error)}`);
});

app.on("before-quit", () => {
  if (localServer) {
    localServer.close();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
