export function getRequiredApiUrl() {
  return resolveRequiredApiUrl({
    explicitValue: process.env.NEXT_PUBLIC_API_URL,
    fallbackPath: "/api/v1",
    fallbackEnvValue: process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL,
    missingMessage:
      "NEXT_PUBLIC_API_URL or BACKEND_URL is required in the frontend environment.",
  });
}

function resolveRequiredApiUrl(params: {
  readonly explicitValue?: string;
  readonly fallbackEnvValue?: string;
  readonly fallbackPath: string;
  readonly missingMessage: string;
}) {
  const explicitValue = params.explicitValue?.trim();
  if (explicitValue) return explicitValue.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return `${window.location.origin}${params.fallbackPath}`;
  }

  const fallbackEnvValue = params.fallbackEnvValue?.trim();
  if (fallbackEnvValue) {
    const baseUrl = fallbackEnvValue.replace(/\/$/, "");
    const suffix = baseUrl.endsWith("/api")
      ? params.fallbackPath.replace(/^\/api/, "")
      : params.fallbackPath;
    return `${baseUrl}${suffix}`;
  }

  throw new Error(params.missingMessage);
}

export function isSetupLookupEnabled() {
  const value = process.env.NEXT_PUBLIC_SETUP_LOOKUP_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
