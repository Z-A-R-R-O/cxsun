import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

function findNearestEnvFile(startDirectory = process.cwd()): string | null {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const envFilePath = path.join(currentDirectory, ".env");

    if (existsSync(envFilePath)) {
      return envFilePath;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

const envFilePath = findNearestEnvFile();

if (envFilePath) {
  const parsedEnv = parseEnv(readFileSync(envFilePath, "utf8"));

  for (const [key, value] of Object.entries(parsedEnv)) {
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function isPresent(value: string | undefined) {
  return value !== undefined && value !== "";
}

function urlHost(host: string | undefined) {
  return host === "0.0.0.0" || host === "::" ? "localhost" : (host ?? "localhost");
}

function runtimeProtocol() {
  return process.env.TLS_ENABLED === "true" ? "https" : "http";
}

function composeUrl(hostKey: string, httpPortKey: string, httpsPortKey: string) {
  const scheme = runtimeProtocol();
  const port = scheme === "https" ? process.env[httpsPortKey] : process.env[httpPortKey];

  if (!isPresent(port)) {
    return undefined;
  }

  return `${scheme}://${urlHost(process.env[hostKey])}:${port}`;
}

function versionedApiUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  if (normalized.endsWith("/api/v1")) {
    return normalized;
  }
  const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  return `${apiBase}/v1`;
}

process.env.NODE_ENV = process.env.NODE_ENV || process.env.APP_ENV || "development";
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL ||
  composeUrl("APP_HOST", "FRONTEND_HTTP_PORT", "FRONTEND_HTTPS_PORT");
process.env.PORT = process.env.PORT || process.env.APP_HTTP_PORT || process.env.APP_HTTPS_PORT;

if (!process.env.BACKEND_URL && isPresent(process.env.PORT)) {
  process.env.BACKEND_URL = `${runtimeProtocol()}://${urlHost(process.env.APP_HOST)}:${process.env.PORT}`;
}

process.env.BACKEND_HEALTH_URL =
  process.env.BACKEND_HEALTH_URL ||
  (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/health` : undefined);
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL
  ? versionedApiUrl(process.env.NEXT_PUBLIC_API_URL)
  : process.env.BACKEND_URL
    ? versionedApiUrl(process.env.BACKEND_URL)
    : undefined;
process.env.AUTH_TOKEN_EXPIRES_SECONDS =
  process.env.AUTH_TOKEN_EXPIRES_SECONDS || process.env.JWT_EXPIRES_IN_SECONDS;
