# Versioning And Releases

## Version Policy

- Package version format: `1.0.<reference>` (e.g. `1.0.172`).
- Git tags use `v-` prefix: `v-1.0.172`.
- Changelog entry labels use human-readable form: `v 1.0.172`.
- Lockstep versioning across root package and all workspaces.

## Reference Policy

- Every meaningful batch uses a reference number: `#1`, `#2`, etc.
- The batch reference in `assist/execution/task.md` must match `assist/execution/planning.md`.
- App version `1.0.<reference>` derives from the batch reference number.
- Changelog entries use the same ref and local time: `### [v 1.0.10] YYYY-MM-DD h:mm am - Title`.
- Commit subjects use the latest versioned changelog entry as `#<ref> - <title>`, for example `#10 - version update`.

## Changelog Policy

- `assist/documentation/CHANGELOG.md` must contain a `Version State` block at the top.
- `Version State` records: current numeric package version, current `v-` release tag, and the versioned changelog label format.
- Historical changelog entries are immutable. Do not rewrite old entry labels during a version bump.
- Every changelog entry must live under a concrete `## v-<version>` section.
- Do not use an `Unreleased` section.
- Version bump automation may update the `Version State` block and add a concrete version section/entry.
- Changelog times use the workspace local timezone and lowercase `am` / `pm`.
- `npm run github:now` reads the latest versioned changelog entry and must not include changelog dates or timestamps in the Git commit subject.
- `npm run version:bump -- "<title>"` bumps the next patch version across package files, display files, and the changelog top section.

## Release Operation

- Version, changelog, and tag naming must stay aligned in the same batch.
- Release tags use `v-` prefix.
- Validate before tagging a release.
- `npm run github:now` does not bump versions; perform version bumps only as an explicit release task.
- `npm run github:now` must stop for an interactive commit-message review and confirmation before running Git mutations.

## Build Output

- TypeScript builds go to `dist/` per workspace package.
- Framework frontend builds may use native folders (`.next/`, `out/`, etc.).
- Never emit `.js`, `.js.map`, `.d.ts`, or `.d.ts.map` into `src/` or source trees.
