import { Body } from '../../decorators/http-params.js'
import { Controller, Get, Post } from '../../decorators/controller.js'
import { Inject } from '../../decorators/inject.js'
import { UseGuards } from '../../decorators/guards.js'
import { AuthGuard } from '../../guards/auth.guard.js'
import { DatabaseManagerService } from './database-manager.service.js'

@Controller('api/system/database-manager')
@UseGuards(AuthGuard)
export class DatabaseManagerController {
  constructor(
    @Inject(DatabaseManagerService)
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  @Get('overview')
  overview() {
    return this.databaseManager.overview()
  }

  @Get('backups')
  backups() {
    return { backups: this.databaseManager.listBackups() }
  }

  @Post('backup')
  backup() {
    return this.databaseManager.startBackup()
  }

  @Post('restore')
  restore(@Body() body: { backupId?: string }) {
    return this.databaseManager.startRestore(body?.backupId ?? 'latest')
  }
}
