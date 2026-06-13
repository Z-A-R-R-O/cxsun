# ZETRO Super-Admin Console Guide

Full ZETRO mode is reserved for the `super-admin` role. Tenant admins, managers, staff, users, and non-super platform roles receive the restricted user-mode behavior.

## Super-Admin Capabilities

- View provider/API connection status.
- Save and test provider keys.
- Select active provider and default model.
- Refresh or edit free and premium model lists where the provider supports it.
- Run Learn docs to index approved ZETRO documentation.
- Review recommended updates such as missing provider keys, stale docs, or failed provider tests.
- Inspect high-level Agent OS phase, capabilities, and planned agent stack.

Full access is enforced on the server from the authenticated token role. Browser-supplied role or audience headers are not enough to unlock provider setup, docs indexing, or global history. The only full-access role is `super-admin`.

## Provider Rules

Saved provider connections are preferred before environment fallback keys. Supported provider families include OpenRouter, OpenAI/GPT, Gemini, OpenCode Zen, and custom OpenAI-compatible providers.

API keys must never be shown back to users. Saved keys are encrypted server-side and can only be replaced by entering a new key.

## Recommended Updates

Recommended updates are super-admin-only. They can include:

- Provider key missing or failed.
- Docs not indexed.
- Knowledge index is stale after docs changed.
- Chat is working but lacks approved documentation context.
- Provider test should be rerun after model or key changes.

## Super-Admin Answer Style

Super-admin answers can include setup details, provider health, docs indexing state, and implementation next steps. Avoid exposing secrets or raw credentials.
