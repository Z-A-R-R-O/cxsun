import "./bootstrap-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { loadBaseEnv } from "@cxnext/config";
import { AppModule } from "./app.module";
import { rewriteVersionedApiUrl } from "./http/versioned-api-surface";

function corsOrigins(frontendUrl: string): string[] {
  const origins = new Set([frontendUrl]);
  const configuredOrigins = process.env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins ?? []) {
    origins.add(origin.replace(/\/$/, ""));
  }

  try {
    const url = new URL(frontendUrl);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
      origins.add(url.toString().replace(/\/$/, ""));
    }
  } catch {
    // loadBaseEnv already validates this value; keep the original origin if parsing ever changes.
  }

  return [...origins];
}

async function bootstrap(): Promise<void> {
  const env = loadBaseEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ rewriteUrl: rewriteVersionedApiUrl }),
    {
      bufferLogs: true,
    },
  );
  let isClosing = false;

  app.enableCors({
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    origin: corsOrigins(env.FRONTEND_URL),
  });
  app.enableShutdownHooks();

  async function shutdown(signal: string): Promise<void> {
    if (isClosing) {
      return;
    }

    isClosing = true;
    await app.close();
    process.stdout.write(`cxnext server stopped after ${signal}\n`);
  }

  process.once("SIGINT", () => {
    void shutdown("SIGINT").finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => process.exit(0));
  });

  const port = env.PORT;
  await app.listen(port, "0.0.0.0");
  process.stdout.write(`cxnext server listening on http://localhost:${port}\n`);
}

void bootstrap();
