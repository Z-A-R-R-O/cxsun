import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("Industry")
export class IndustryModel {
  @Field()
  public id!: string;

  @Field()
  public code!: string;

  @Field()
  public name!: string;

  @Field()
  public isActive!: boolean;

  @Field()
  public createdAt!: string;

  @Field()
  public updatedAt!: string;

  @Field(() => String, { nullable: true })
  public deletedAt!: string | null;
}
