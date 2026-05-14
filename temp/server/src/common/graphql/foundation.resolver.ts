import { Query, Resolver } from "@nestjs/graphql";

@Resolver()
export class FoundationResolver {
  @Query(() => String, {
    description: "Platform-level GraphQL root query used to keep the foundation schema valid.",
  })
  public foundation(): string {
    return "cxnext";
  }
}
