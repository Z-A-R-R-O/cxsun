const apiPrefixes = ["/api/v1", "/v1"] as const;

export function rewriteVersionedApiUrl(request: { readonly url?: string }) {
  const originalUrl = request.url ?? "";
  for (const prefix of apiPrefixes) {
    const rewrittenUrl = rewriteVersionedUrl(originalUrl, prefix);
    if (rewrittenUrl) return rewrittenUrl;
  }

  return originalUrl;
}

function rewriteVersionedUrl(originalUrl: string, prefix: string) {
  if (originalUrl !== prefix && !originalUrl.startsWith(`${prefix}/`)) {
    return null;
  }

  const rewritten = originalUrl.slice(prefix.length);
  return rewritten ? rewritten : "/";
}
