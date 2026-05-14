import { CxModule } from "@cxnext/core";

export class StockDefinition extends CxModule {
  public readonly name = "stock";
  public readonly boundedContext = "billing";
}
