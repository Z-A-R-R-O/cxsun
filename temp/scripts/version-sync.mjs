import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = process.env.CXNEXT_ROOT ? path.resolve(process.env.CXNEXT_ROOT) : scriptRootDir;
const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

const reference = readArg("--ref") ?? readArg("--reference") ?? process.env.VERSION_REFERENCE;

if (!reference || !/^\d+$/.test(reference)) {
  console.error("Usage: pnpm version:sync -- --ref <number>");
  process.exit(1);
}

const version = `1.0.${reference}`;
const packagePaths = [
  "package.json",
  "apps/cli/package.json",
  "apps/server/package.json",
  "apps/frontend/package.json",
  "apps/desktop/package.json",
  "packages/core/package.json",
  "packages/event/package.json",
  "packages/db/package.json",
  "packages/validation/package.json",
  "packages/config/package.json",
  "packages/hooks/package.json",
  "packages/utils/package.json",
  "packages/types/package.json",
  "packages/ui/package.json",
];

for (const relativePath of packagePaths) {
  const filePath = path.join(rootDir, relativePath);
  const packageJson = JSON.parse(await readFile(filePath, "utf8"));
  packageJson.version = version;
  await writeFile(filePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

console.log(`Synchronized workspace package versions to ${version}`);
