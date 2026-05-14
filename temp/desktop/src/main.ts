import { app, BrowserWindow, Menu, dialog } from "electron";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { registerIpcHandlers } from "./ipc";
import { startDesktopServices, stopDesktopServices, waitForUrl } from "./services";

loadEnvFromRoot();

function isPresent(value: string | undefined) {
  return value !== undefined && value !== "";
}

function urlHost(host: string | undefined) {
  return host === "0.0.0.0" || host === "::" ? "localhost" : (host ?? "localhost");
}

function runtimeProtocol() {
  return process.env.TLS_ENABLED === "true" ? "https" : "http";
}

function composeUrl(httpPortKey: string, httpsPortKey: string) {
  const scheme = runtimeProtocol();
  const port = scheme === "https" ? process.env[httpsPortKey] : process.env[httpPortKey];

  if (!isPresent(port)) {
    return undefined;
  }

  return `${scheme}://${urlHost(process.env.APP_HOST)}:${port}`;
}

function versionedApiUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  if (normalized.endsWith("/api/v1")) {
    return normalized;
  }
  const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  return `${apiBase}/v1`;
}

process.env.PORT = process.env.PORT || process.env.APP_HTTP_PORT || process.env.APP_HTTPS_PORT;
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || composeUrl("FRONTEND_HTTP_PORT", "FRONTEND_HTTPS_PORT");
process.env.BACKEND_URL =
  process.env.BACKEND_URL ||
  (isPresent(process.env.PORT)
    ? `${runtimeProtocol()}://${urlHost(process.env.APP_HOST)}:${process.env.PORT}`
    : undefined);
process.env.BACKEND_HEALTH_URL =
  process.env.BACKEND_HEALTH_URL ||
  (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/health` : undefined);
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL
  ? versionedApiUrl(process.env.NEXT_PUBLIC_API_URL)
  : process.env.BACKEND_URL
    ? versionedApiUrl(process.env.BACKEND_URL)
    : undefined;

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function loadEnvFromRoot() {
  const mergedEnv = {
    ...loadParsedEnv(findRootEnvPath()),
    ...loadParsedEnv(findPackagedSidecarEnvPath()),
    ...loadParsedEnv(findExplicitEnvPath()),
  };

  for (const [key, value] of Object.entries(mergedEnv)) {
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  const envSource = findExplicitEnvPath() ?? findPackagedSidecarEnvPath() ?? findRootEnvPath();
  if (envSource && process.env.CXNEXT_ENV_SOURCE === undefined) {
    process.env.CXNEXT_ENV_SOURCE = envSource;
  }
}

function loadParsedEnv(envPath: string | null) {
  if (!envPath || !existsSync(envPath)) {
    return {};
  }

  return parseEnv(readFileSync(envPath, "utf8"));
}

function findExplicitEnvPath() {
  const candidate = process.env.CXNEXT_ENV_FILE ?? process.env.DESKTOP_ENV_FILE;
  if (!candidate) {
    return null;
  }
  const resolvedPath = path.resolve(candidate);
  return existsSync(resolvedPath) ? resolvedPath : null;
}

function findPackagedSidecarEnvPath() {
  const sidecarDirectories = [
    path.dirname(process.execPath),
    process.resourcesPath,
  ].filter(Boolean);
  const fileNames = [
    ".env.desktop.local",
    ".env.desktop",
    ".env",
    "desktop.env",
  ];

  for (const directory of sidecarDirectories) {
    for (const fileName of fileNames) {
      const candidatePath = path.join(directory, fileName);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

function findRootEnvPath() {
  let currentDirectory = path.resolve(__dirname, "..", "..", "..");

  while (true) {
    const envPath = path.join(currentDirectory, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

const frontendUrl = requireEnv("FRONTEND_URL");
const backendUrl = requireEnv("BACKEND_URL");
const backendHealthUrl = requireEnv("BACKEND_HEALTH_URL");
const readinessTimeoutMs = Number(requireEnv("DESKTOP_READY_TIMEOUT_MS"));

async function createWindow(): Promise<void> {
  await startDesktopServices({
    backendHealthUrl,
    frontendUrl,
    readinessTimeoutMs,
  });

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const [frontendReady, backendReady] = await Promise.all([
    waitForUrl(frontendUrl, readinessTimeoutMs),
    waitForUrl(backendHealthUrl, readinessTimeoutMs),
  ]);

  if (!frontendReady) {
    process.stderr.write(`Frontend was not ready at ${frontendUrl}; Electron will retry load.\n`);
  }

  if (!backendReady) {
    process.stderr.write(`Backend health check was not ready at ${backendHealthUrl}.\n`);
  }

  window.webContents.on("did-fail-load", () => {
    setTimeout(() => {
      void window.loadURL(frontendUrl);
    }, 1000);
  });

  await window.loadURL(frontendUrl);
}

void app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  void createWindow().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    dialog.showErrorBox("CX Next desktop startup failed", message);
    stopDesktopServices();
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopDesktopServices();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopDesktopServices();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
