import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ContactModel {
  @Field()
  public id!: string;

  @Field()
  public code!: string;

  @Field()
  public name!: string;

  @Field(() => String, { nullable: true })
  public contactTypeId!: string | null;

  @Field(() => String, { nullable: true })
  public ledgerId!: string | null;

  @Field()
  public isActive!: boolean;
}
