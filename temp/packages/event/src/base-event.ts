export interface BaseEvent<TPayload = unknown> {
  readonly id: string;
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
  readonly metadata?: Record<string, unknown>;
}

export function createEvent<TPayload>(
  name: string,
  payload: TPayload,
  metadata: Record<string, unknown> = {},
): BaseEvent<TPayload> {
  return {
    id: crypto.randomUUID(),
    name,
    occurredAt: new Date(),
    payload,
    metadata,
  };
}
