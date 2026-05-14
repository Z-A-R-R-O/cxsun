import { Module } from "@nestjs/common";
import { StockService } from "./application/stock.service";
import { StockController } from "./interface/http/stock.controller";
import { StockRegistryBootstrap } from "./stock.registry";

@Module({
  controllers: [StockController],
  providers: [StockRegistryBootstrap, StockService],
  exports: [StockService],
})
export class StockModule {}
