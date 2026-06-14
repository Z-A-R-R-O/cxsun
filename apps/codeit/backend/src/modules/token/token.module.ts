import { Module } from '../../core/decorators/module.js'
import { TokenService } from './token.service.js'

@Module({
  providers: [TokenService],
})
export class TokenModule {}
