import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { HomeController } from './home.controller.js'

@Module({
  controllers: [HomeController],
})
export class HomeModule {}
