# Auth

## Summary
Session management, login, token validation, and cross-surface authentication (tenant/admin/super-admin).

## What We Done
- `auth-client.ts` — `login` (POST /api/v1/auth/login with corporateId/email/password, surface-based role checking), `refreshSession` (GET /api/v1/auth/session), `getStoredSession` / `storeSession` / `clearSession` / `clearAuthCache` / `clearAllSessions` (localStorage with surface-prefixed keys), `switchTenant` (updates selected tenant in stored session), `authHeaders` (Bearer token + x-tenant-code + optional x-login-domain for CORS), `notifyAuthInvalid` (dispatches `cxsun:auth-invalid` event). JWT expiry validation via `isUsableToken` (decodes base64 payload body, checks exp > now). `roleMatchesSurface` maps roles to surfaces. Types: `AuthSession`, `AuthTenant`, `AuthSurface`.

## Gaps
- No multi-factor authentication or OTP login.
- No password reset/forgot-password flow.
- No session timeout/auto-logout timer (relies on manual token expiry check only).
- No SSO or OAuth provider integration.
- No registration or invitation flow.

## Future Concepts
- MFA with TOTP/authenticator app.
- Social login / OAuth (Google, Microsoft).
- Session activity log and concurrent session management.
- API token management for integrations.
