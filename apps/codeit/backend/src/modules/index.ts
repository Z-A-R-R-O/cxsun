import { Module } from '../core/decorators/module.js'
import { HealthModule } from '../core/health/health.module.js'
import { AgentModule } from './agent/agent.module.js'
import { PipelineModule } from './pipeline/pipeline.module.js'
import { RunModule } from './run/run.module.js'
import { TokenModule } from './token/token.module.js'
import { SettingsModule } from './settings/settings.module.js'

import { ProviderRegistry } from '../providers/provider.registry.js'
import { OpenAIProvider } from '../providers/openai.provider.js'
import { OpenRouterProvider } from '../providers/openrouter.provider.js'
import { DeepSeekProvider } from '../providers/deepseek.provider.js'
import { OpenCoderProvider } from '../providers/opencoder.provider.js'
import { QueueService } from '../infrastructure/queue/queue.service.js'

@Module({
  imports: [
    HealthModule,
    AgentModule,
    PipelineModule,
    RunModule,
    TokenModule,
    SettingsModule,
  ],
  providers: [
    QueueService,
    OpenAIProvider,
    OpenRouterProvider,
    DeepSeekProvider,
    OpenCoderProvider,
    ProviderRegistry,
  ],
})
export class AppModule {}
