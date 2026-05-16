import 'reflect-metadata'
import { Injectable } from '../decorators/injectable.js'

export interface HealthStatus {
  status: 'ok'
  uptime: number
  timestamp: string
  version: string
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now()

  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.0',
    }
  }
}
