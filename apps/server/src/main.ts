import Fastify from 'fastify'
import cors from '@fastify/cors'

const PORT = Number(process.env.PORT) || 6001
const HOST = process.env.HOST || '0.0.0.0'
const GRACE = 5_000

let started = false
const startTime = Date.now()

const app = Fastify({ logger: true })

// ── Hooks ────────────────────────────────────────────
app.addHook('onRequest', (_req, _reply, done) => {
  if (!started) return _reply.code(503).send({ status: 'starting' })
  done()
})

app.addHook('onError', async (_req, _reply, error) => {
  app.log.error({ err: error })
})

// ── Routes ───────────────────────────────────────────
await app.register(cors, { origin: true })

app.get('/health', async () => ({
  status: 'ok',
  uptime: Date.now() - startTime,
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '0.0.0',
}))

// ── Shutdown ─────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n  ╰ Received ${signal}, shutting down gracefully...`)
  started = false

  const timeout = setTimeout(() => {
    console.error('  ✗ Forced exit after timeout')
    process.exit(1)
  }, GRACE)

  try {
    await app.close()
    clearTimeout(timeout)
    console.log('  ✓ Server closed')
    process.exit(0)
  } catch (err) {
    clearTimeout(timeout)
    console.error('  ✗ Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('uncaughtException', (err) => {
  app.log.error({ err }, 'Uncaught exception')
  shutdown('uncaughtException')
})
process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'Unhandled rejection')
})

// ── Start ────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: HOST })
  started = true

  console.log(`\n  ✓ Server running at http://localhost:${PORT}`)
  console.log(`  ✓ Health check at http://localhost:${PORT}/health\n`)

  // Smoke test — verify health endpoint on startup
  try {
    const res = await fetch(`http://localhost:${PORT}/health`)
    const body = await res.json()
    console.log(`  ✓ Smoke test: /health → ${JSON.stringify(body)}`)
  } catch {
    console.log(`  ⚠ Smoke test: /health unreachable`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
