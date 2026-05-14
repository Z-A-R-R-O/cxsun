import { AggregateRoot } from "@cxnext/core";
import { TenantCreatedEvent } from "../events/tenant-created.event";
import { TenantSlug } from "../value-objects/tenant-slug.value-object";

export interface TenantAggregateState {
  readonly name: string;
  readonly slug: TenantSlug;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export class TenantAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly state: TenantAggregateState,
  ) {
    super(id);
  }

  public static create(params: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly isActive: boolean;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly deletedAt?: Date | null;
  }): TenantAggregate {
    const createdAt = params.createdAt ?? new Date();
    const updatedAt = params.updatedAt ?? createdAt;
    const aggregate = new TenantAggregate(params.id, {
      name: params.name.trim(),
      slug: TenantSlug.create(params.slug),
      isActive: params.isActive,
      createdAt,
      updatedAt,
      deletedAt: params.deletedAt ?? null,
    });

    if (!params.createdAt) {
      aggregate.addDomainEvent(
        new TenantCreatedEvent(params.id, {
          name: aggregate.name,
          slug: aggregate.slug,
          isActive: aggregate.isActive,
        }),
      );
    }

    return aggregate;
  }

  public get name(): string {
    return this.state.name;
  }

  public get slug(): string {
    return this.state.slug.value;
  }

  public get isActive(): boolean {
    return this.state.isActive;
  }

  public get createdAt(): Date {
    return this.state.createdAt;
  }

  public get updatedAt(): Date {
    return this.state.updatedAt;
  }

  public get deletedAt(): Date | null {
    return this.state.deletedAt;
  }
}
