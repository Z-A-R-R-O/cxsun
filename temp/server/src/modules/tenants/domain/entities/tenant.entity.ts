import { Entity } from "@cxnext/core";
import type { TenantSlug } from "../value-objects/tenant-slug.value-object";

export interface TenantEntityProps {
  readonly name: string;
  readonly slug: TenantSlug;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export class TenantEntity extends Entity<string> {
  public constructor(
    id: string,
    private readonly props: TenantEntityProps,
  ) {
    super(id);
  }

  public get name(): string {
    return this.props.name;
  }

  public get slug(): TenantSlug {
    return this.props.slug;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
}
