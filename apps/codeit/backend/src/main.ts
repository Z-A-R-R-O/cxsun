import 'reflect-metadata'
import { CodeItApp } from './core/bootstrap.js'
import { AppModule } from './modules/index.js'

async function bootstrap() {
  try {
    const app = await CodeItApp.create(AppModule)
    await app.start()
  } catch (err) {
    console.error('Failed to bootstrap CodeIt application:', err)
    process.exit(1)
  }
}

bootstrap()
