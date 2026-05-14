import { Injectable } from "@nestjs/common";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { softwareClientOptions, SoftwareClient } from "../../enum/software-client.enum";
import { softwareTypeOptions, SoftwareType } from "../../enum/software-type.enum";

export interface CoreEnvSettingOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface CoreEnvSettingDefinition {
  readonly key: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly sensitive?: boolean;
  readonly options?: readonly CoreEnvSettingOption[];
}

export interface CoreEnvSetting extends CoreEnvSettingDefinition {
  readonly value: string;
}

export interface CoreEnvGroup {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly settings: readonly CoreEnvSetting[];
}

export interface CoreEnvPolicyItem {
  readonly key: string;
  readonly status: "managed" | "excluded" | "unmanaged";
  readonly reason: string;
}

const coreEnvGroups = [
  {
    id: "application",
    label: "Application",
    description: "Core host identity, listening endpoints, TLS, and runtime mode.",
    keys: [
      "APP_NAME",
      "APP_ENV",
      "APP_TYPE",
      "APP_CLIENT",
      "APP_HOST",
      "APP_DOMAIN",
      "APP_HTTP_PORT",
      "APP_HTTPS_PORT",
      "CLOUDFLARE_ENABLED",
      "TLS_ENABLED",
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    description: "Browser app domain and ports. Host and URLs are derived from Application.",
    keys: [
      "FRONTEND_DOMAIN",
      "FRONTEND_HTTP_PORT",
      "FRONTEND_HTTPS_PORT",
      "CORS_ORIGINS",
    ],
  },
  {
    id: "backend",
    label: "Backend",
    description: "Startup readiness waits. API URLs are derived from Application host and ports.",
    keys: ["DESKTOP_READY_TIMEOUT_MS", "DEV_READY_TIMEOUT_MS"],
  },
  {
    id: "deployment",
    label: "Deployment",
    description: "GitHub source, Docker deployment, and manual or scheduled system update settings.",
    keys: [
      "GIT_URL",
      "GIT_BRANCH",
      "DEPLOY_DIR",
      "SYSTEM_UPDATE_ENABLED",
      "SYSTEM_UPDATE_AUTO_ENABLED",
      "SYSTEM_UPDATE_AUTO_CRON",
      "SMOKE_TEST_ENABLED",
      "SMOKE_TEST_TIMEOUT_MS",
      "COMPOSE_PROJECT_NAME",
      "COMPOSE_FILE",
      "APP_CONTAINER_NAME",
      "APP_VERSION",
      "APP_PUBLIC_PORT",
      "FRONTEND_PUBLIC_PORT",
    ],
  },
  {
    id: "database",
    label: "Database",
    description: "Primary database driver, host, database, and credentials.",
    keys: ["DB_DRIVER", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_SSL"],
  },
  {
    id: "security",
    label: "Security",
    description: "JWT, default admin, login limits, and secret policy values.",
    keys: [
      "JWT_SECRET",
      "JWT_EXPIRES_IN_SECONDS",
      "AUTH_TOKEN_EXPIRES_SECONDS",
      "AUTH_DEFAULT_ADMIN_PASSWORD",
      "AUTH_MAX_LOGIN_ATTEMPTS",
      "AUTH_LOCKOUT_MINUTES",
      "ADMIN_SESSION_IDLE_MINUTES",
      "SECRET_ROTATION_DAYS",
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "SMTP values used for recovery and outbound system email.",
    keys: ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME"],
  },
  {
    id: "payments",
    label: "Payments",
    description: "Payment gateway feature and credential values.",
    keys: ["RAZORPAY_ENABLED", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
] as const;

const excludedEnvPolicy: readonly CoreEnvPolicyItem[] = [
  {
    key: "NODE_ENV",
    status: "excluded",
    reason: "Derived at runtime from APP_ENV; keep APP_ENV in .env and do not store NODE_ENV.",
  },
  {
    key: "PORT",
    status: "excluded",
    reason: "Derived at runtime from APP_HTTP_PORT or APP_HTTPS_PORT; keep APP_HTTP_PORT in .env instead.",
  },
  {
    key: "FRONTEND_HOST",
    status: "excluded",
    reason: "Frontend uses the same host as APP_HOST; keep APP_HOST in .env instead.",
  },
  {
    key: "FRONTEND_URL",
    status: "excluded",
    reason: "Derived at runtime from APP_HOST and FRONTEND_HTTP_PORT/FRONTEND_HTTPS_PORT.",
  },
  {
    key: "BACKEND_URL",
    status: "excluded",
    reason: "Derived at runtime from APP_HOST and APP_HTTP_PORT/APP_HTTPS_PORT.",
  },
  {
    key: "BACKEND_HEALTH_URL",
    status: "excluded",
    reason: "Derived at runtime from BACKEND_URL by appending /health.",
  },
  {
    key: "NEXT_PUBLIC_API_URL",
    status: "excluded",
    reason: "Public browser API base; client deployments can use a same-domain /api proxy prefix.",
  },
  {
    key: "FRONTEND_TARGET",
    status: "excluded",
    reason: "Renamed to APP_TYPE so app behaviour is configured at application level, not frontend level.",
  },
  {
    key: "npm_config_*",
    status: "excluded",
    reason: "Package manager runtime values belong to the shell process, not application .env.",
  },
  {
    key: "NEXT_RUNTIME",
    status: "excluded",
    reason: "Next.js internal runtime value; it is provided by the framework when needed.",
  },
];

const settingDetails = new Map<string, Omit<CoreEnvSettingDefinition, "key" | "group">>(
  coreEnvGroups
    .flatMap((group) =>
      group.keys.map((key) => [
        key,
        {
          label: toLabel(key),
          description: describeKey(key),
          sensitive: isSensitiveKey(key),
          options: optionsForKey(key),
        },
      ] as const),
    ),
);

@Injectable()
export class CoreSettingsService {
  public async listEnvSettings() {
    const envFilePath = await findAncestorEnvFile(process.cwd());
    const fileText = envFilePath ? await fs.readFile(envFilePath, "utf8") : "";
    const values = parseEnvValues(fileText);
    const allowedKeys = getManagedEnvKeys();

    return {
      envFilePath,
      groups: coreEnvGroups.map((group) => ({
        id: group.id,
        label: group.label,
        description: group.description,
        settings: group.keys.map((key) => {
          const details = settingDetails.get(key);
          return {
            key,
            group: group.id,
            label: details?.label ?? toLabel(key),
            description: details?.description ?? "Core runtime setting.",
            sensitive: details?.sensitive ?? false,
            options: details?.options,
            value: values.get(key) ?? process.env[key] ?? "",
          };
        }),
      })),
      policy: {
        managed: coreEnvGroups.flatMap((group) =>
          group.keys.map((key) => ({
            key,
            status: "managed" as const,
            reason: `${group.label} setting managed by Settings > Core Settings.`,
          })),
        ),
        excluded: excludedEnvPolicy,
        unmanaged: [...values.keys()]
          .filter((key) => !allowedKeys.has(key) && !isExcludedEnvKey(key))
          .map((key) => ({
            key,
            status: "unmanaged" as const,
            reason: "This key exists in .env but is not part of the current Core Settings policy.",
          })),
      },
      raw: fileText,
    };
  }

  public async updateEnvSettings(values: Record<string, unknown>) {
    const envFilePath = (await findAncestorEnvFile(process.cwd())) ?? path.resolve(process.cwd(), ".env");
    const existingText = await readOptionalFile(envFilePath);
    const allowedKeys = getManagedEnvKeys();
    const nextValues = new Map(
      Object.entries(values)
        .filter(([key]) => allowedKeys.has(key))
        .map(([key, value]) => [key, String(value ?? "")]),
    );

    const nextText = writeEnvValues(existingText, nextValues, {
      removeKeys: (key) => isExcludedEnvKey(key),
    });
    await fs.writeFile(envFilePath, nextText, "utf8");

    for (const [key, value] of nextValues) {
      process.env[key] = value;
    }

    return this.listEnvSettings();
  }
}

function getManagedEnvKeys() {
  return new Set<string>(coreEnvGroups.flatMap((group) => [...group.keys]));
}

async function findAncestorEnvFile(startDirectory: string): Promise<string | null> {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const candidate = path.join(currentDirectory, ".env");
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Keep walking upward.
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return null;
    currentDirectory = parentDirectory;
  }
}

async function readOptionalFile(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseEnvValues(fileText: string) {
  const values = new Map<string, string>();

  for (const line of fileText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values.set(match[1] ?? "", unquoteEnvValue(match[2] ?? ""));
  }

  return values;
}

function writeEnvValues(
  fileText: string,
  nextValues: Map<string, string>,
  options: { readonly removeKeys?: (key: string) => boolean } = {},
) {
  const writtenKeys = new Set<string>();
  const lines = fileText.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^(\s*)([A-Z0-9_]+)(\s*=\s*)(.*)$/);
    const key = match?.[2];

    if (!key) return [line];
    if (options.removeKeys?.(key)) return [];
    if (!nextValues.has(key)) return [line];

    writtenKeys.add(key);
    return [
      `${match?.[1] ?? ""}${key}${match?.[3] ?? "="}${quoteEnvValue(nextValues.get(key) ?? "")}`,
    ];
  });
  const missingLines = [...nextValues.entries()]
    .filter(([key]) => !writtenKeys.has(key))
    .map(([key, value]) => `${key}=${quoteEnvValue(value)}`);

  if (missingLines.length > 0) {
    if (lines.length > 0 && lines.at(-1)?.trim()) lines.push("");
    lines.push("# Added from Settings > Core Settings", ...missingLines);
  }

  return lines.join("\n").replace(/\n*$/, "\n");
}

function unquoteEnvValue(value: string) {
  const trimmedValue = value.trim();
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function quoteEnvValue(value: string) {
  return /[\s"#']/.test(value) ? JSON.stringify(value) : value;
}

function toLabel(key: string) {
  if (key === "APP_TYPE") return "Industry";

  return key
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function isSensitiveKey(key: string) {
  return /PASSWORD|SECRET|TOKEN|PASS/.test(key);
}

function optionsForKey(key: string) {
  if (key === "APP_ENV") {
    return [
      { value: "development", label: "Development" },
      { value: "staging", label: "Staging" },
      { value: "production", label: "Production" },
    ];
  }
  if (key === "APP_TYPE") return softwareTypeOptions;
  if (key === "APP_CLIENT") return softwareClientOptions;
  if (key === "SYSTEM_UPDATE_ENABLED" || key === "SYSTEM_UPDATE_AUTO_ENABLED" || key === "SMOKE_TEST_ENABLED") {
    return [
      { value: "true", label: "Enabled" },
      { value: "false", label: "Disabled" },
    ];
  }
  return undefined;
}

function isExcludedEnvKey(key: string) {
  return excludedEnvPolicy.some((item) => {
    if (item.key.endsWith("*")) return key.startsWith(item.key.slice(0, -1));
    return item.key === key;
  });
}

function describeKey(key: string) {
  const descriptions: Record<string, string> = {
    APP_TYPE: `Industry code used to shape billing and runtime surfaces. Default is ${SoftwareType.GarmentsEcommerce}.`,
    APP_CLIENT: `Client option code. ${SoftwareClient.FullOption} is Developer Edition.`,
    DB_PASSWORD: "Database password for the selected DB user.",
    COMPOSE_FILE: "Docker Compose file used by deployment update commands.",
    APP_CONTAINER_NAME: "Docker container name used by in-app restart and update helper commands.",
    DEPLOY_DIR: "Absolute path to the host checkout used by Docker deployment and system update.",
    GIT_BRANCH: "Git branch used by manual and automated deployment updates.",
    GIT_URL: "Git repository URL used by the deployment updater.",
    JWT_SECRET: "Signing secret for authentication tokens.",
    AUTH_DEFAULT_ADMIN_PASSWORD: "Seed password used when the auth seeder creates the admin user.",
    SYSTEM_UPDATE_ENABLED: "Allows authenticated admins to trigger update actions from the app.",
    SYSTEM_UPDATE_AUTO_ENABLED: "Documents whether host-level automatic update scheduling is enabled.",
    SYSTEM_UPDATE_AUTO_CRON: "Host cron expression used when automatic updates are configured outside the app.",
    SMOKE_TEST_ENABLED: "Runs frontend, backend, and database smoke checks during startup and after deployment restart.",
    SMOKE_TEST_TIMEOUT_MS: "Maximum time the smoke test waits for frontend, backend, and database readiness.",
  };

  return descriptions[key] ?? "Editable runtime environment value.";
}
