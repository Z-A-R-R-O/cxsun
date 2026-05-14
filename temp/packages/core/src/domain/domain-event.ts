export interface DomainEventMetadata {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly actorId?: string;
  readonly [key: string]: unknown;
}

export abstract class DomainEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  public readonly occurredAt: Date;

  protected constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: TPayload,
    public readonly metadata: DomainEventMetadata = {},
  ) {
    this.occurredAt = new Date();
  }
}
