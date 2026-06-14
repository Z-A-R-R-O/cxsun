const blockedObjectKeys = new Set(['__proto__', 'constructor', 'prototype'])
const sensitiveKeyPattern = /(authorization|password|secret|token|hash|signature)/i
const controlCharsPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const dangerousQueryPatterns = [
  /(?:^|[\s;])--/,
  /\/\*/,
  /\*\//,
  /;\s*(?:drop|alter|truncate|delete|insert|update|select|create)\b/i,
  /\bunion\s+(?:all\s+)?select\b/i,
  /\bor\s+1\s*=\s*1\b/i,
]

export type SanitizedRequestParts = {
  body: unknown
  params: unknown
  query: unknown
}

export function sanitizeRequestParts(input: SanitizedRequestParts) {
  const issues: string[] = []

  const query = sanitizeUnknown(input.query, { issues, mode: 'query' })
  const params = sanitizeUnknown(input.params, { issues, mode: 'query' })
  const body = sanitizeUnknown(input.body, { issues, mode: 'body' })

  return {
    body,
    issues,
    params,
    query,
  }
}

function sanitizeUnknown(
  value: unknown,
  context: { issues: string[]; key?: string; mode: 'body' | 'query' },
  depth = 0,
): unknown {
  if (depth > 30) {
    context.issues.push('Request payload is too deeply nested.')
    return undefined
  }

  if (typeof value === 'string') {
    return sanitizeString(value, context)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, context, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (blockedObjectKeys.has(key)) {
      context.issues.push(`Blocked unsafe request key: ${key}.`)
      continue
    }

    sanitized[key] = sanitizeUnknown(child, { ...context, key }, depth + 1)
  }

  return sanitized
}

function sanitizeString(value: string, context: { issues: string[]; key?: string; mode: 'body' | 'query' }) {
  const cleaned = sensitiveKeyPattern.test(context.key ?? '')
    ? value.replace(/\u0000/g, '')
    : value.replace(controlCharsPattern, '')

  if (context.mode === 'query' && hasDangerousQueryPattern(cleaned)) {
    context.issues.push('Blocked unsafe query value.')
  }

  return cleaned
}

function hasDangerousQueryPattern(value: string) {
  return dangerousQueryPatterns.some((pattern) => pattern.test(value))
}
