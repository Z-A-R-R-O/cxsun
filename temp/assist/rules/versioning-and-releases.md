# Versioning And Releases

## Version Policy

1. Package versions must stay in numeric semantic version form `1.0.<reference>` such as `1.0.172`.
2. Git tags must use the `v-` prefix such as `v-1.0.172`.
3. Changelog entry labels must use the human-readable form `v 1.0.172`.
4. The repository uses lockstep versioning across the root package and every implemented workspace package.

## Reference Policy

1. Every meaningful batch uses a reference number such as `#10`.
2. When execution tracking is active, the batch reference in `assist/execution/task.md` must match the current batch reference in `assist/execution/planning.md`.
3. Installed app version `1.0.<reference>` must be derived directly from the same batch reference number.
4. Changelog entries must use the same reference number in the form `### [v 1.0.10] YYYY-MM-DD - Title`.
5. Commit subjects must start with the same reference number.

## Changelog Policy

1. `assist/documentation/CHANGELOG.md` must contain a `Version State` block.
2. `Version State` must record the current numeric package version and current `v-` release tag.
3. `Version State` must document the versioned changelog label format.
4. The changelog must contain a matching version section such as `## v-1.0.172`.
5. New entries belong under the active version section until the next version bump is approved.

## Release Operation Policy

1. Version updates may be synchronized through `npm run version:sync` or the git helper before commit.
2. Version, changelog, and tag naming must stay aligned in the same batch.
3. Release tags must be created with the `v-` prefix.
4. Clean validation should exist before tagging a release.

## Build Output Policy

1. TypeScript runtime builds for apps and packages belong under the local `dist/` folder configured by each workspace package.
2. Framework-managed frontend builds may use their native output folders such as `.next/` and `out/`.
3. Compiled `.js`, `.js.map`, `.d.ts`, and `.d.ts.map` files must never be emitted into `src/` or other source trees.
4. Local tooling and validation must treat generated source-tree artifacts as a repository error.
