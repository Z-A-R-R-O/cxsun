import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const parsedEnv = parseEnv(readFileSync(envPath, "utf8"));

  for (const [key, value] of Object.entries(parsedEnv)) {
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadRootEnv(root) {
  loadEnvFile(path.join(root, ".env"));
}

function present(value) {
  return value !== undefined && value !== "";
}

function requireRuntimeEnv(env, key) {
  const value = env[key];

  if (!present(value)) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function urlHost(host) {
  return host === "0.0.0.0" || host === "::" ? "localhost" : host;
}

function protocol(env) {
  return env.TLS_ENABLED === "true" ? "https" : "http";
}

function composeUrl(env, hostKey, httpPortKey, httpsPortKey) {
  const scheme = protocol(env);
  const host = urlHost(env[hostKey] ?? env.APP_HOST ?? "localhost");
  const port = scheme === "https" ? env[httpsPortKey] : env[httpPortKey];

  if (!present(port)) {
    throw new Error(`${scheme === "https" ? httpsPortKey : httpPortKey} is required.`);
  }

  return `${scheme}://${host}:${port}`;
}

function versionedApiUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, "");
  if (normalized.endsWith("/api/v1")) {
    return normalized;
  }
  const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  return `${apiBase}/v1`;
}

export function resolveRuntimeEnv(source = process.env) {
  const env = { ...source };

  env.NODE_ENV = env.NODE_ENV || env.APP_ENV || "development";
  env.FRONTEND_URL =
    env.FRONTEND_URL ||
    composeUrl(env, "APP_HOST", "FRONTEND_HTTP_PORT", "FRONTEND_HTTPS_PORT");
  env.PORT = env.PORT || env.APP_HTTP_PORT || env.APP_HTTPS_PORT;

  if (!present(env.PORT)) {
    throw new Error("PORT or APP_HTTP_PORT is required.");
  }

  env.BACKEND_URL =
    env.BACKEND_URL ||
    `${protocol(env)}://${urlHost(env.APP_HOST ?? "localhost")}:${requireRuntimeEnv(env, "PORT")}`;
  env.BACKEND_HEALTH_URL = env.BACKEND_HEALTH_URL || `${env.BACKEND_URL}/health`;
  env.NEXT_PUBLIC_API_URL = versionedApiUrl(env.NEXT_PUBLIC_API_URL || env.BACKEND_URL);
  env.AUTH_TOKEN_EXPIRES_SECONDS = env.AUTH_TOKEN_EXPIRES_SECONDS || env.JWT_EXPIRES_IN_SECONDS;

  return {
    ...env,
    NODE_ENV: requireRuntimeEnv(env, "NODE_ENV"),
    PORT: requireRuntimeEnv(env, "PORT"),
    FRONTEND_URL: requireRuntimeEnv(env, "FRONTEND_URL"),
    BACKEND_URL: requireRuntimeEnv(env, "BACKEND_URL"),
    BACKEND_HEALTH_URL: requireRuntimeEnv(env, "BACKEND_HEALTH_URL"),
    NEXT_PUBLIC_API_URL: requireRuntimeEnv(env, "NEXT_PUBLIC_API_URL"),
    AUTH_TOKEN_EXPIRES_SECONDS: requireRuntimeEnv(env, "AUTH_TOKEN_EXPIRES_SECONDS"),
  };
}
