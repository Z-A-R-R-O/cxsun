import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export interface ZetroMarkdownSource {
  id: string
  label: string
  path: string
  purpose: string
  category: ZetroMarkdownCategory
  audiences: ZetroMarkdownAudience[]
}

export type ZetroMarkdownAudience = 'public' | 'user' | 'admin' | 'developer'
export type ZetroMarkdownCategory = 'user-doc' | 'admin-doc' | 'policy-doc' | 'system-doc' | 'strategy-doc' | 'developer-doc'

export interface ZetroMarkdownDocument extends ZetroMarkdownSource {
  title: string
  content: string
  summary: string
  chunks: ZetroMarkdownChunk[]
}

export interface ZetroMarkdownChunk {
  chunkKey: string
  heading: string
  content: string
}

export const zetroMarkdownSources: ZetroMarkdownSource[] = [
  {
    id: 'zetro-docs-user-overview',
    label: 'ZETRO User Guide',
    path: 'ZRO/ZETRO/docs/user/overview.md',
    purpose: 'Safe product help and behavior boundaries for tenant users.',
    category: 'user-doc',
    audiences: ['public', 'user', 'admin'],
  },
  {
    id: 'zetro-policy-behavior',
    label: 'ZETRO Behavior Policy',
    path: 'ZRO/ZETRO/docs/policy/behavior.md',
    purpose: 'Audience behavior rules for user and admin ZETRO modes.',
    category: 'policy-doc',
    audiences: ['public', 'user', 'admin'],
  },
  {
    id: 'zetro-policy-restrictions',
    label: 'ZETRO Restrictions',
    path: 'ZRO/ZETRO/docs/policy/restrictions.md',
    purpose: 'Restricted-topic, legal, compliance, and secrets policy.',
    category: 'policy-doc',
    audiences: ['public', 'user', 'admin'],
  },
  {
    id: 'zetro-docs-admin-console',
    label: 'ZETRO Admin Console Guide',
    path: 'ZRO/ZETRO/docs/admin/console.md',
    purpose: 'Admin setup, provider, indexing, and recommended update guidance.',
    category: 'admin-doc',
    audiences: ['admin'],
  },
  {
    id: 'zetro-system-indexing',
    label: 'ZETRO Documentation Indexing',
    path: 'ZRO/ZETRO/docs/system/indexing.md',
    purpose: 'Internal source classes and audience-filtered search behavior.',
    category: 'system-doc',
    audiences: ['admin', 'developer'],
  },
  {
    id: 'zetro-docs-readme',
    label: 'ZETRO Documentation System',
    path: 'ZRO/ZETRO/README.md',
    purpose: 'Dedicated ZETRO documentation boundary and update rules.',
    category: 'system-doc',
    audiences: ['admin', 'developer'],
  },
  {
    id: 'zro-guide',
    label: 'ZRO Guide',
    path: 'ZRO/GUIDE.md',
    purpose: 'Main working guide for the project direction.',
    category: 'strategy-doc',
    audiences: ['admin', 'developer'],
  },
  {
    id: 'zro-agent-os',
    label: 'Agent OS Vision',
    path: 'ZRO/Vision/agent-os.md',
    purpose: 'Layered ZETRO and multi-agent architecture plan.',
    category: 'strategy-doc',
    audiences: ['admin', 'developer'],
  },
  {
    id: 'zro-masterplan',
    label: 'ZRO Masterplan',
    path: 'ZRO/Roadmap/masterplan.md',
    purpose: 'Execution order and product roadmap.',
    category: 'strategy-doc',
    audiences: ['admin', 'developer'],
  },
  {
    id: 'assist-agent-os',
    label: 'Assist Agent OS Context',
    path: 'assist/context/versatile-agent-os.md',
    purpose: 'Practical implementation context for future coding work.',
    category: 'developer-doc',
    audiences: ['developer'],
  },
  {
    id: 'assist-product-picture',
    label: 'Product Picture',
    path: 'assist/context/product-picture.md',
    purpose: 'Product scope and user-facing platform explanation.',
    category: 'developer-doc',
    audiences: ['developer'],
  },
  {
    id: 'assist-architecture',
    label: 'Architecture Context',
    path: 'assist/context/architecture.md',
    purpose: 'Current application architecture and boundaries.',
    category: 'developer-doc',
    audiences: ['developer'],
  },
  {
    id: 'assist-task',
    label: 'Active Task Notes',
    path: 'assist/execution/task.md',
    purpose: 'Current execution checklist.',
    category: 'developer-doc',
    audiences: ['developer'],
  },
]

export function readZetroMarkdownDocuments(options: { audience?: ZetroMarkdownAudience } = {}) {
  return zetroMarkdownSources
    .filter((source) => sourceAllowedForAudience(source, options.audience ?? 'admin'))
    .map((source) => readZetroMarkdownDocument(source))
    .filter((document): document is ZetroMarkdownDocument => Boolean(document))
}

export function searchZetroMarkdownDocuments(query: string, limit = 8, options: { audience?: ZetroMarkdownAudience } = {}) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1)

  const documents = readZetroMarkdownDocuments(options)
  const chunks = documents.flatMap((document) =>
    document.chunks.map((chunk) => ({
      source: {
        id: document.id,
        label: document.label,
        path: document.path,
        purpose: document.purpose,
        title: document.title,
        category: document.category,
      },
      chunk,
      score: scoreChunk(chunk, terms),
    })),
  )

  return chunks
    .filter((result) => result.score > 0 || terms.length === 0)
    .sort((left, right) => right.score - left.score || left.source.path.localeCompare(right.source.path))
    .slice(0, limit)
    .map((result) => ({
      ...result.source,
      chunk_key: result.chunk.chunkKey,
      heading: result.chunk.heading,
      excerpt: excerpt(result.chunk.content, 520),
      score: result.score,
    }))
}

function sourceAllowedForAudience(source: ZetroMarkdownSource, audience: ZetroMarkdownAudience) {
  if (audience === 'developer') return true
  if (audience === 'admin') return source.audiences.includes('admin') || source.audiences.includes('public')
  if (audience === 'user') return source.audiences.includes('user') || source.audiences.includes('public')
  return source.audiences.includes('public')
}

function readZetroMarkdownDocument(source: ZetroMarkdownSource): ZetroMarkdownDocument | null {
  const absolutePath = resolve(workspaceRoot(), source.path)
  if (!existsSync(absolutePath)) return null

  const content = readFileSync(absolutePath, 'utf8')
  const title = firstHeading(content) ?? source.label
  return {
    ...source,
    title,
    content,
    summary: firstParagraph(content),
    chunks: chunkMarkdown(source.id, content),
  }
}

function chunkMarkdown(sourceId: string, content: string): ZetroMarkdownChunk[] {
  const lines = content.split(/\r?\n/)
  const chunks: ZetroMarkdownChunk[] = []
  let heading = 'Overview'
  let buffer: string[] = []
  let index = 0

  function flush() {
    const text = buffer.join('\n').trim()
    if (!text) return
    chunks.push({
      chunkKey: `${sourceId}:${slugify(heading)}:${index}`,
      heading,
      content: text,
    })
    index += 1
    buffer = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      flush()
      heading = headingMatch[1].trim()
      buffer.push(line)
      continue
    }
    buffer.push(line)
  }
  flush()

  return chunks.length ? chunks : [{ chunkKey: `${sourceId}:overview:0`, heading: 'Overview', content: content.trim() }]
}

function scoreChunk(chunk: ZetroMarkdownChunk, terms: string[]) {
  if (!terms.length) return 1
  const haystack = `${chunk.heading}\n${chunk.content}`.toLowerCase()
  return terms.reduce((score, term) => {
    const matches = haystack.split(term).length - 1
    return score + matches
  }, 0)
}

function firstHeading(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function firstParagraph(content: string) {
  const paragraph = content
    .replace(/^#\s+.+$/m, '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find(Boolean)
  return excerpt(paragraph ?? '', 240)
}

function excerpt(content: string, length: number) {
  const text = content.replace(/[#*_`>~-]/g, '').replace(/\s+/g, ' ').trim()
  return text.length <= length ? text : `${text.slice(0, length - 1).trim()}...`
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section'
}

function workspaceRoot() {
  const cwd = process.cwd()
  return cwd.replaceAll('\\', '/').endsWith('/apps/server') ? resolve(cwd, '../..') : cwd
}
