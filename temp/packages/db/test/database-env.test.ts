import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { formatDatabaseCliError } from "../src/cli";
import { loadDatabaseEnv, type LoadedDatabaseEnv } from "../src/env";

describe("database env loading", () => {
  it("loads database settings from the nearest ancestor .env file", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cxnext-db-env-"));
    const workspaceDirectory = path.join(tempRoot, "packages", "db");
    const envFilePath = path.join(tempRoot, ".env");

    await mkdir(workspaceDirectory, { recursive: true });
    await writeFile(
      envFilePath,
      [
        "DB_HOST=127.0.0.1",
        "DB_PORT=3307",
        "DB_USER=file-user",
        "DB_PASSWORD=file-password",
        "DB_NAME=file-database",
      ].join("\n"),
    );

    const envState = loadDatabaseEnv({
      cwd: workspaceDirectory,
      source: {
        DB_PASSWORD: "process-password",
      } as NodeJS.ProcessEnv,
    });

    expect(envState.envFilePath).toBe(envFilePath);
    expect(envState.env.DB_HOST).toBe("127.0.0.1");
    expect(envState.env.DB_PORT).toBe(3307);
    expect(envState.env.DB_USER).toBe("file-user");
    expect(envState.env.DB_PASSWORD).toBe("process-password");
    expect(envState.env.DB_NAME).toBe("file-database");
  });

  it("loads DB-prefixed settings from the repository .env file", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cxnext-db-env-"));
    const workspaceDirectory = path.join(tempRoot, "packages", "db");
    const envFilePath = path.join(tempRoot, ".env");

    await mkdir(workspaceDirectory, { recursive: true });
    await writeFile(
      envFilePath,
      [
        "DB_HOST=127.0.0.1",
        "DB_PORT=3307",
        "DB_USER=root",
        "DB_PASSWORD=Computer.1",
        "DB_NAME=cxnext_db",
      ].join("\n"),
    );

    const envState = loadDatabaseEnv({
      cwd: workspaceDirectory,
      source: {} as NodeJS.ProcessEnv,
    });

    expect(envState.env.DB_HOST).toBe("127.0.0.1");
    expect(envState.env.DB_PORT).toBe(3307);
    expect(envState.env.DB_USER).toBe("root");
    expect(envState.env.DB_PASSWORD).toBe("Computer.1");
    expect(envState.env.DB_NAME).toBe("cxnext_db");
    expect(envState.fallbackKeys).toEqual([]);
  });

  it("formats access-denied errors with env guidance", () => {
    const envState: LoadedDatabaseEnv = {
      cwd: "E:/Workspace/websites/cxnext/packages/db",
      env: {
        DB_HOST: "localhost",
        DB_PORT: 3306,
        DB_USER: "cxnext",
        DB_PASSWORD: "cxnext",
        DB_NAME: "cxnext",
      },
      envFilePath: "E:/Workspace/websites/cxnext/.env",
      explicitKeys: ["DB_HOST", "DB_PORT"],
      fallbackKeys: ["DB_USER", "DB_PASSWORD", "DB_NAME"],
    };

    const message = formatDatabaseCliError(
      {
        code: "ER_ACCESS_DENIED_ERROR",
      },
      envState,
    );

    expect(message).toContain("Database connection failed");
    expect(message).toContain("Required DB_* variables are missing");
    expect(message).toContain("repository root .env");
  });
});
