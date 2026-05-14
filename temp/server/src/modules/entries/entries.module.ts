import { Module } from "@nestjs/common";
import { DocumentSettingsModule } from "../document-settings/document-settings.module";
import { StockModule } from "../stock/stock.module";
import { CreateBillingEntryUseCase } from "./application/use-cases/create-billing-entry.use-case";
import { CreateMoneyEntryUseCase } from "./application/use-cases/create-money-entry.use-case";
import { DeleteBillingEntryUseCase } from "./application/use-cases/delete-billing-entry.use-case";
import { DeleteMoneyEntryUseCase } from "./application/use-cases/delete-money-entry.use-case";
import { GetBillingEntryUseCase } from "./application/use-cases/get-billing-entry.use-case";
import { GetMoneyEntryUseCase } from "./application/use-cases/get-money-entry.use-case";
import { ListBillingEntriesUseCase } from "./application/use-cases/list-billing-entries.use-case";
import { ListMoneyEntriesUseCase } from "./application/use-cases/list-money-entries.use-case";
import { UpdateBillingEntryUseCase } from "./application/use-cases/update-billing-entry.use-case";
import { UpdateMoneyEntryUseCase } from "./application/use-cases/update-money-entry.use-case";
import { EntriesRegistryBootstrap } from "./entries.registry";
import { entriesProviders } from "./infrastructure/entries.providers";
import { EntriesResolver } from "./interface/graphql/entries.resolver";
import { EntriesController } from "./interface/http/entries.controller";

@Module({
  imports: [DocumentSettingsModule, StockModule],
  controllers: [EntriesController],
  providers: [
    EntriesRegistryBootstrap,
    ListBillingEntriesUseCase,
    GetBillingEntryUseCase,
    CreateBillingEntryUseCase,
    UpdateBillingEntryUseCase,
    DeleteBillingEntryUseCase,
    ListMoneyEntriesUseCase,
    GetMoneyEntryUseCase,
    CreateMoneyEntryUseCase,
    UpdateMoneyEntryUseCase,
    DeleteMoneyEntryUseCase,
    EntriesResolver,
    ...entriesProviders,
  ],
})
export class EntriesModule {}
