import type { BaseEvent } from "./base-event";
import type { EventCallback, EventHandler } from "./event-handler";

export interface EventBus {
  publish<TEvent extends BaseEvent>(event: TEvent): Promise<void>;
  publishAll<TEvent extends BaseEvent>(events: readonly TEvent[]): Promise<void>;
  subscribe<TEvent extends BaseEvent>(
    eventName: TEvent["name"],
    handler: EventCallback<TEvent>,
  ): void;
  register<TEvent extends BaseEvent>(handler: EventHandler<TEvent>): void;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventCallback>>();

  public async publish<TEvent extends BaseEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.name);
    if (!handlers) return;

    await Promise.all([...handlers].map((handler) => handler(event)));
  }

  public async publishAll<TEvent extends BaseEvent>(events: readonly TEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  public subscribe<TEvent extends BaseEvent>(
    eventName: TEvent["name"],
    handler: EventCallback<TEvent>,
  ): void {
    const handlers = this.handlers.get(eventName) ?? new Set<EventCallback>();
    handlers.add(handler as EventCallback);
    this.handlers.set(eventName, handlers);
  }

  public register<TEvent extends BaseEvent>(handler: EventHandler<TEvent>): void {
    this.subscribe(handler.eventName, handler.handle.bind(handler));
  }
}
