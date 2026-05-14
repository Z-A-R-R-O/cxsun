import { cpSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";

export function ensureStorageLinks() {
  const workspaceRoot = path.resolve(import.meta.dirname, "..");
  const storageRoot = path.join(workspaceRoot, "storage");
  const publicStorageRoot = path.join(storageRoot, "public");
  const privateStorageRoot = path.join(storageRoot, "private");
  const frontendPublicRoot = path.join(workspaceRoot, "apps", "frontend", "public");
  const legacyLogoLinkPath = path.join(frontendPublicRoot, "logo");

  mkdirSync(path.join(publicStorageRoot, "logo"), { recursive: true });
  mkdirSync(privateStorageRoot, { recursive: true });
  mkdirSync(frontendPublicRoot, { recursive: true });

  removePathIfExists(legacyLogoLinkPath);
  ensureDirectoryLink(path.join(frontendPublicRoot, "storage"), publicStorageRoot);
}

function ensureDirectoryLink(linkPath, targetPath) {
  const resolvedTarget = path.resolve(targetPath);

  if (existsSync(linkPath)) {
    try {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        return;
      }
      if (stat.isDirectory()) {
        rmSync(linkPath, { force: true, recursive: true });
      } else {
        rmSync(linkPath, { force: true });
      }
    } catch {
      rmSync(linkPath, { force: true, recursive: true });
    }
  }

  try {
    symlinkSync(resolvedTarget, linkPath, "junction");
  } catch {
    cpSync(resolvedTarget, linkPath, { force: true, recursive: true });
  }
}

function removePathIfExists(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  try {
    rmSync(targetPath, { force: true, recursive: true });
  } catch {
    // Ignore cleanup failures; storage link creation will still proceed for the canonical path.
  }
}
