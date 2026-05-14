import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("Company")
export class CompanyModel {
  @Field()
  public id!: string;

  @Field()
  public tenantId!: string;

  @Field()
  public tenantName!: string;

  @Field()
  public industryId!: string;

  @Field()
  public industryCode!: string;

  @Field()
  public industryName!: string;

  @Field()
  public code!: string;

  @Field()
  public name!: string;

  @Field(() => String, { nullable: true })
  public legalName!: string | null;

  @Field(() => String, { nullable: true })
  public tagline!: string | null;

  @Field(() => String, { nullable: true })
  public shortAbout!: string | null;

  @Field(() => String, { nullable: true })
  public gstinUin!: string | null;

  @Field(() => String, { nullable: true })
  public pan!: string | null;

  @Field(() => String, { nullable: true })
  public dateOfIncorporation!: string | null;

  @Field(() => String, { nullable: true })
  public msmeNo!: string | null;

  @Field(() => String, { nullable: true })
  public msmeCategory!: string | null;

  @Field(() => String, { nullable: true })
  public tan!: string | null;

  @Field()
  public tdsAvailable!: boolean;

  @Field(() => String, { nullable: true })
  public tdsSection!: string | null;

  @Field(() => Number, { nullable: true })
  public tdsRatePercent!: number | null;

  @Field()
  public tcsAvailable!: boolean;

  @Field(() => String, { nullable: true })
  public tcsSection!: string | null;

  @Field(() => Number, { nullable: true })
  public tcsRatePercent!: number | null;

  @Field(() => String, { nullable: true })
  public primaryEmail!: string | null;

  @Field(() => String, { nullable: true })
  public primaryPhone!: string | null;

  @Field()
  public isPrimary!: boolean;

  @Field()
  public isActive!: boolean;

  @Field()
  public createdAt!: string;

  @Field()
  public updatedAt!: string;

  @Field(() => String, { nullable: true })
  public deletedAt!: string | null;
}
