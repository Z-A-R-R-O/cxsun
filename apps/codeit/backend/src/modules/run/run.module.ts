import { Module } from '../../core/decorators/module.js'
import { RunController } from './run.controller.js'
import { RunService } from './run.service.js'
import { RunStore } from './run.store.js'

@Module({
  controllers: [RunController],
  providers: [RunService, RunStore],
})
export class RunModule {}
