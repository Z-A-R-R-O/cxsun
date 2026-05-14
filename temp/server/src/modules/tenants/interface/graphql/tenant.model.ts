import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("Tenant")
export class TenantModel {
  @Field()
  public id!: string;

  @Field()
  public name!: string;

  @Field()
  public slug!: string;

  @Field()
  public isActive!: boolean;

  @Field()
  public createdAt!: string;

  @Field()
  public updatedAt!: string;

  @Field(() => String, { nullable: true })
  public deletedAt!: string | null;
}
