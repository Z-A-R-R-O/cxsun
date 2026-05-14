import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { existsSync } from "node:fs";
import { access, copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaRecord, MediaUploadInput, MediaVisibility } from "../domain/media-record";

interface ListMediaOptions {
  readonly folder?: string | null;
}

let storageMigrationPromise: Promise<void> | null = null;

@Injectable()
export class MediaService {
  public async list(visibility: MediaVisibility, options: ListMediaOptions = {}) {
    const rootDirectory = await ensureStorageVisibilityDirectory(visibility);
    const folder = normalizeFolder(options.folder);
    const targetDirectory = resolveStorageTarget(rootDirectory, folder);
    const items = await readMediaDirectory(rootDirectory, targetDirectory, visibility);
    return { items };
  }

  public async upload(input: MediaUploadInput) {
    const visibility = parseVisibility(input.visibility);
    const fileName = sanitizeFileName(input.fileName);
    const folder = normalizeFolder(input.folder);
    const contentBase64 = parseBase64(input.contentBase64);
    const overwrite = parseOverwrite(input.overwrite);
    const rootDirectory = await ensureStorageVisibilityDirectory(visibility);
    const targetDirectory = resolveStorageTarget(rootDirectory, folder);
    await mkdir(targetDirectory, { recursive: true });

    const absoluteFilePath = path.join(targetDirectory, fileName);
    if (!overwrite) {
      await assertFileDoesNotExist(absoluteFilePath);
    }
    const content = Buffer.from(contentBase64, "base64");

    await writeFile(absoluteFilePath, content);

    return toMediaRecord(rootDirectory, absoluteFilePath, visibility, await stat(absoluteFilePath));
  }

  public async delete(visibility: MediaVisibility, mediaPath: string) {
    const rootDirectory = await ensureStorageVisibilityDirectory(visibility);
    const absoluteFilePath = resolveStorageTarget(rootDirectory, mediaPath);
    await rm(absoluteFilePath, { force: true });
    return { deleted: true };
  }

  public async readPrivateFile(mediaPath: string) {
    const rootDirectory = await ensureStorageVisibilityDirectory("private");
    const absoluteFilePath = resolveStorageTarget(rootDirectory, mediaPath);
    try {
      const fileStat = await stat(absoluteFilePath);
      if (!fileStat.isFile()) {
        throw new NotFoundException("Media file was not found.");
      }
      const content = await readFile(absoluteFilePath);
      return {
        content,
        fileName: path.basename(absoluteFilePath),
        mimeType: mimeTypeFromExtension(absoluteFilePath),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException("Media file was not found.");
    }
  }
}

async function readMediaDirectory(
  rootDirectory: string,
  targetDirectory: string,
  visibility: MediaVisibility,
): Promise<readonly MediaRecord[]> {
  try {
    const entries = await readdir(targetDirectory, { withFileTypes: true });
    const nestedItems = await Promise.all(
      entries.map(async (entry) => {
        const absoluteEntryPath = path.join(targetDirectory, entry.name);
        if (entry.isDirectory()) {
          return readMediaDirectory(rootDirectory, absoluteEntryPath, visibility);
        }
        const entryStat = await stat(absoluteEntryPath);
        return [toMediaRecord(rootDirectory, absoluteEntryPath, visibility, entryStat)];
      }),
    );

    return nestedItems
      .flat()
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  } catch {
    return [];
  }
}

async function ensureStorageVisibilityDirectory(visibility: MediaVisibility) {
  const rootDirectory = await storageRootDirectory();
  const directory = path.join(rootDirectory, visibility);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function storageRootDirectory() {
  const workspaceRoot = findWorkspaceRoot();
  const canonicalStorageRoot = path.join(workspaceRoot, "storage");
  if (!storageMigrationPromise) {
    storageMigrationPromise = migrateLegacyServerStorage(workspaceRoot, canonicalStorageRoot);
  }
  await storageMigrationPromise;
  return canonicalStorageRoot;
}

function resolveStorageTarget(rootDirectory: string, nestedPath: string) {
  const normalizedPath = normalizeFolder(nestedPath);
  const resolvedPath = path.resolve(rootDirectory, normalizedPath);
  const relativePath = path.relative(rootDirectory, resolvedPath);
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.split(path.sep).includes("..")
  ) {
    throw new NotFoundException("Invalid media path.");
  }
  return resolvedPath;
}

function normalizeFolder(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._ -]/g, "-"))
    .join("/");
  return normalized.replace(/^\/+|\/+$/g, "");
}

function sanitizeFileName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return `upload-${Date.now()}.bin`;
  }
  const extension = path.extname(value).toLowerCase();
  const baseName = path.basename(value, extension).replace(/[^a-zA-Z0-9._ -]/g, "-").trim();
  const safeBaseName = baseName || `upload-${Date.now()}`;
  return `${safeBaseName}${extension.replace(/[^a-z0-9.]/g, "")}`;
}

function parseBase64(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException("Media content is required.");
  }
  return value.includes(",") ? value.split(",").at(-1) ?? "" : value;
}

function parseVisibility(value: unknown): MediaVisibility {
  return value === "private" ? "private" : "public";
}

function parseOverwrite(value: unknown) {
  return value === true;
}

function toMediaRecord(
  rootDirectory: string,
  absoluteFilePath: string,
  visibility: MediaVisibility,
  fileStat: { readonly size: number; readonly mtime: Date },
): MediaRecord {
  const relativePath = path.relative(rootDirectory, absoluteFilePath).replaceAll("\\", "/");
  const folder = path.posix.dirname(relativePath) === "." ? "" : path.posix.dirname(relativePath);
  return {
    fileName: path.basename(absoluteFilePath),
    folder,
    mimeType: mimeTypeFromExtension(absoluteFilePath),
    path: relativePath,
    size: fileStat.size,
    updatedAt: fileStat.mtime.toISOString(),
    visibility,
    downloadPath:
      visibility === "private"
        ? `/media/file?visibility=private&path=${encodeURIComponent(relativePath)}`
        : undefined,
    publicUrl: visibility === "public" ? `/storage/${relativePath}` : undefined,
  };
}

function mimeTypeFromExtension(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
  };
  return mimeTypes[extension] ?? null;
}

async function assertFileDoesNotExist(absoluteFilePath: string) {
  try {
    await access(absoluteFilePath);
    throw new ConflictException("A file with the same name already exists.");
  } catch (error) {
    if (error instanceof ConflictException) {
      throw error;
    }
  }
}

function findWorkspaceRoot() {
  const candidates = [path.resolve(process.cwd()), __dirname];

  for (const startDirectory of candidates) {
    let currentDirectory = startDirectory;
    while (true) {
      if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
        return currentDirectory;
      }
      const parentDirectory = path.dirname(currentDirectory);
      if (parentDirectory === currentDirectory) {
        break;
      }
      currentDirectory = parentDirectory;
    }
  }

  return path.resolve(process.cwd(), "..");
}

async function migrateLegacyServerStorage(workspaceRoot: string, canonicalStorageRoot: string) {
  const legacyStorageRoot = path.join(workspaceRoot, "apps", "server", "storage");
  if (!existsSync(legacyStorageRoot)) {
    return;
  }

  await copyStorageTree(legacyStorageRoot, canonicalStorageRoot);
}

async function copyStorageTree(sourceDirectory: string, targetDirectory: string) {
  await mkdir(targetDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);

    if (entry.isDirectory()) {
      await copyStorageTree(sourcePath, targetPath);
      continue;
    }

    const sourceStat = await stat(sourcePath).catch(() => null);
    if (!sourceStat?.isFile()) {
      continue;
    }

    const targetStat = await stat(targetPath).catch(() => null);
    if (!targetStat || sourceStat.mtimeMs > targetStat.mtimeMs) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
}
