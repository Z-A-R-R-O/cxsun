import { Query, Resolver } from "@nestjs/graphql";
import { EntryModel } from "./entry.model";

@Resolver(() => EntryModel)
export class EntriesResolver {
  @Query(() => String)
  public entriesGraphqlPlaceholder() {
    return "entries";
  }
}
