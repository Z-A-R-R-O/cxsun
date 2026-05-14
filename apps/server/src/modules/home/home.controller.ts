import type { FastifyReply } from 'fastify'

import { Controller, Get } from '../../core/decorators/controller.js'
import { Res } from '../../core/decorators/http-params.js'

@Controller()
export class HomeController {
  @Get()
  async index(@Res() reply: FastifyReply) {
    const timestamp = new Date().toISOString()
    const frontendUrl =
      process.env.FRONTEND_URL ??
      process.env.ELECTRON_DEV_SERVER_URL ??
      `http://localhost:${process.env.VITE_PORT ?? '6010'}`

    return reply
      .type('text/html; charset=utf-8')
      .send(renderWelcomePage({ timestamp, frontendUrl }))
  }
}

function renderWelcomePage({
  timestamp,
  frontendUrl,
}: {
  timestamp: string
  frontendUrl: string
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="8; url=${escapeHtml(frontendUrl)}">
    <title>CXSun Server</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7f9;
        color: #18181b;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }

      main {
        width: min(560px, calc(100vw - 32px));
        border: 1px solid #d7dbe0;
        border-radius: 8px;
        background: #ffffff;
        padding: 32px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
      }

      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.15;
      }

      p {
        margin: 0 0 16px;
        color: #52525b;
        line-height: 1.6;
      }

      dl {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px 16px;
        margin: 24px 0;
        padding: 16px;
        border-radius: 8px;
        background: #f4f4f5;
      }

      dt {
        color: #71717a;
      }

      dd {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      a {
        color: #0f766e;
        font-weight: 700;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          background: #09090b;
          color: #fafafa;
        }

        main {
          background: #18181b;
          border-color: #3f3f46;
          box-shadow: none;
        }

        p {
          color: #d4d4d8;
        }

        dl {
          background: #27272a;
        }

        dt {
          color: #a1a1aa;
        }

        a {
          color: #5eead4;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>CXSun server is working fine</h1>
      <p>The backend is online and ready to handle requests. You will be redirected to the frontend shortly.</p>
      <dl>
        <dt>Status</dt>
        <dd>OK</dd>
        <dt>Timestamp</dt>
        <dd>${escapeHtml(timestamp)}</dd>
        <dt>Frontend</dt>
        <dd><a href="${escapeHtml(frontendUrl)}">${escapeHtml(frontendUrl)}</a></dd>
      </dl>
      <p><a href="${escapeHtml(frontendUrl)}">Open frontend now</a></p>
    </main>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
