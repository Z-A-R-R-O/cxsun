import type {
  AuthGate,
  AuthPermissionModule,
  AuthPermissionModuleInput,
  AuthPolicy,
  AuthPolicyInput,
  AuthRole,
  AuthRoleInput,
  AuthSession,
  AuthUser,
  AuthUserInput,
} from "../domain/auth";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { clearStoredAuthSession, getStoredAccessToken } from "./session-storage";

export {
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "./session-storage";

export async function login(input: { readonly login: string; readonly password: string }) {
  const response = await fetch(`${apiBaseUrl()}/auth/login`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Username or password is wrong."));
  }

  return (await response.json()) as AuthSession;
}

export async function listAuthUsers() {
  const response = await authFetch(`${apiBaseUrl()}/auth/users`);
  if (!response.ok) throw new Error(`User list failed with status ${response.status}.`);
  return (await response.json()) as AuthUser[];
}

export async function getAuthUser(userId: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/users/${userId}`);
  if (!response.ok) throw new Error(`User detail failed with status ${response.status}.`);
  return (await response.json()) as AuthUser;
}

export async function upsertAuthUser(input: AuthUserInput, userId?: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/users${userId ? `/${userId}` : ""}`, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: userId ? "PATCH" : "POST",
  });

  if (!response.ok) throw new Error(`User save failed with status ${response.status}.`);
  return (await response.json()) as AuthUser;
}

export async function logout() {
  try {
    const response = await authFetch(`${apiBaseUrl()}/auth/logout`, {
      method: "POST",
    });

    if (!response.ok && response.status !== 401) {
      throw new Error(`Logout failed with status ${response.status}.`);
    }
  } finally {
    clearStoredAuthSession();
  }
}

export async function changeOwnPassword(input: {
  readonly currentPassword: string;
  readonly nextPassword: string;
}) {
  const response = await authFetch(`${apiBaseUrl()}/auth/me/password`, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, `Password change failed with status ${response.status}.`),
    );
  }

  return (await response.json()) as { readonly changed: boolean };
}

export async function listAuthRoles() {
  const response = await authFetch(`${apiBaseUrl()}/auth/roles`);
  if (!response.ok) throw new Error(`Role list failed with status ${response.status}.`);
  return (await response.json()) as AuthRole[];
}

export async function upsertAuthRole(input: AuthRoleInput, roleId?: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/roles${roleId ? `/${roleId}` : ""}`, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: roleId ? "PATCH" : "POST",
  });

  if (!response.ok) throw new Error(`Role save failed with status ${response.status}.`);
  return (await response.json()) as AuthRole;
}

export async function deleteAuthRole(roleId: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/roles/${roleId}`, {
    method: "DELETE",
  });

  if (!response.ok) throw new Error(`Role delete failed with status ${response.status}.`);
  return (await response.json()) as { readonly deleted: boolean };
}

export async function listAuthPermissions() {
  const response = await authFetch(`${apiBaseUrl()}/auth/permissions`);
  if (!response.ok) throw new Error(`Permission list failed with status ${response.status}.`);
  return (await response.json()) as AuthPermissionModule[];
}

export async function upsertAuthPermissionModule(
  input: AuthPermissionModuleInput,
  moduleId?: string,
) {
  const response = await authFetch(
    `${apiBaseUrl()}/auth/permissions${moduleId ? `/${moduleId}` : ""}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: moduleId ? "PATCH" : "POST",
    },
  );

  if (!response.ok)
    throw new Error(`Permission module save failed with status ${response.status}.`);
  return (await response.json()) as AuthPermissionModule;
}

export async function deleteAuthPermissionModule(moduleId: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/permissions/${moduleId}`, {
    method: "DELETE",
  });

  if (!response.ok)
    throw new Error(`Permission module delete failed with status ${response.status}.`);
  return (await response.json()) as { readonly deleted: boolean };
}

export async function listAuthPolicies() {
  const response = await authFetch(`${apiBaseUrl()}/auth/policies`);
  if (!response.ok) throw new Error(`Policy list failed with status ${response.status}.`);
  return (await response.json()) as AuthPolicy[];
}

export async function upsertAuthPolicy(input: AuthPolicyInput, policyId?: string) {
  const response = await authFetch(
    `${apiBaseUrl()}/auth/policies${policyId ? `/${policyId}` : ""}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: policyId ? "PATCH" : "POST",
    },
  );

  if (!response.ok) throw new Error(`Policy save failed with status ${response.status}.`);
  return (await response.json()) as AuthPolicy;
}

export async function deleteAuthPolicy(policyId: string) {
  const response = await authFetch(`${apiBaseUrl()}/auth/policies/${policyId}`, {
    method: "DELETE",
  });

  if (!response.ok) throw new Error(`Policy delete failed with status ${response.status}.`);
  return (await response.json()) as { readonly deleted: boolean };
}

export async function listAuthGates() {
  const response = await authFetch(`${apiBaseUrl()}/auth/gates`);
  if (!response.ok) throw new Error(`Gate list failed with status ${response.status}.`);
  return (await response.json()) as AuthGate[];
}

export async function listTenants() {
  const response = await authFetch(`${apiBaseUrl()}/tenants`);
  if (!response.ok) throw new Error(`Tenant list failed with status ${response.status}.`);
  return (await response.json()) as Array<{ id: string; name: string; slug: string }>;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getStoredAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, cache: "no-store", headers });

  if (response.status === 401) {
    handleUnauthorizedResponse();
  }

  return response;
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      readonly message?: unknown;
      readonly error?: unknown;
    };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Some failures are not JSON responses.
  }

  return fallback;
}

function handleUnauthorizedResponse() {
  clearStoredAuthSession();

  if (typeof window === "undefined") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window.location.pathname === "/login") {
    return;
  }

  window.location.assign(`/login?next=${encodeURIComponent(currentPath)}`);
}
