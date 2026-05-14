import { CxModule } from "@cxnext/core";

export class TenantsDefinition extends CxModule {
  public readonly name = "tenants";
  public readonly boundedContext = "organisation";
}
