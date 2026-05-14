import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType("Product")
export class ProductModel {
  @Field()
  public id!: string;

  @Field()
  public code!: string;

  @Field()
  public name!: string;

  @Field()
  public slug!: string;

  @Field()
  public sku!: string;

  @Field(() => String, { nullable: true })
  public categoryName!: string | null;

  @Field(() => String, { nullable: true })
  public productGroupName!: string | null;

  @Field(() => Float)
  public basePrice!: number;

  @Field()
  public isActive!: boolean;
}
