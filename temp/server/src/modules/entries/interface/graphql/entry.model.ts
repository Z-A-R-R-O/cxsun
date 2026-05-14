import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType("Entry")
export class EntryModel {
  @Field()
  public id!: string;

  @Field()
  public kind!: string;

  @Field()
  public documentNo!: string;

  @Field()
  public partyName!: string;

  @Field(() => Float)
  public total!: number;
}
