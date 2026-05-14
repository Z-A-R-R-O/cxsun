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
- Changelog entries use the same ref: `### [v 1.0.10] YYYY-MM-DD - Title`.
- Commit subjects start with the same reference number.

## Changelog Policy

- `assist/documentation/CHANGELOG.md` must contain a `Version State` block at the top.
- `Version State` records: current numeric package version, current `v-` release tag, and the versioned changelog label format.
- New entries belong under the active version section until the next version bump is approved.

## Release Operation

- Version, changelog, and tag naming must stay aligned in the same batch.
- Release tags use `v-` prefix.
- Validate before tagging a release.

## Build Output

- TypeScript builds go to `dist/` per workspace package.
- Framework frontend builds may use native folders (`.next/`, `out/`, etc.).
- Never emit `.js`, `.js.map`, `.d.ts`, or `.d.ts.map` into `src/` or source trees.
