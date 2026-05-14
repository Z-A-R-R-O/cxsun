import { runGitHubHelper } from "./github-helper.mjs";

process.exitCode = await runGitHubHelper(process.cwd(), { yes: true, help: false });
