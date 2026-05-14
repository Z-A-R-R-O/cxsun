import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { StockService } from "../../application/stock.service";

@Controller("stock")
export class StockController {
  public constructor(private readonly stockService: StockService) {}

  @Get("warehouses")
  @RequirePermissions(modulePermission("stock", "list"))
  public warehouses(@Query("companyId") companyId: string) {
    return this.stockService.listWarehouses(companyId);
  }

  @Get("balances")
  @RequirePermissions(modulePermission("stock", "report"))
  public balances(
    @Query("companyId") companyId: string,
    @Query("accountingYearId") accountingYearId: string,
    @Query("productId") productId?: string,
  ) {
    return this.stockService.listBalances({ companyId, accountingYearId, productId });
  }

  @Get("movements")
  @RequirePermissions(modulePermission("stock", "report"))
  public movements(
    @Query("companyId") companyId: string,
    @Query("accountingYearId") accountingYearId: string,
    @Query("productId") productId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockService.listMovements({
      companyId,
      accountingYearId,
      productId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
