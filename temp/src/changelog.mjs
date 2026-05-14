import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CHANGELOG_PATH = join("assist", "documentation", "CHANGELOG.md");

export function parseLatestChangelogEntry(changelogContent) {
  const match = changelogContent.match(
    /^### \[(?:#(\d+)|v\s+1\.0\.(\d+))\]\s+\d{4}-\d{2}-\d{2}\s+-\s+(.+)$/m,
  );

  const referenceRaw = match?.[1] ?? match?.[2];
  const title = match?.[3]?.trim();

  if (!referenceRaw || !title) {
    throw new Error(`Could not read latest changelog entry from ${CHANGELOG_PATH}.`);
  }

  const reference = Number.parseInt(referenceRaw, 10);

  if (!Number.isInteger(reference) || reference < 0) {
    throw new Error("Latest changelog reference is invalid.");
  }

  return {
    reference,
    title,
  };
}

export function readLatestChangelogEntry(rootDir) {
  const changelogPath = join(rootDir, CHANGELOG_PATH);
  const changelogContent = readFileSync(changelogPath, "utf8");

  return parseLatestChangelogEntry(changelogContent);
}

export function formatChangelogCommitSubject(entry) {
  return `#${entry.reference} chore: ${entry.title}`;
}
