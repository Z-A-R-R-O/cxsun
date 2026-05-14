import type { BaseEvent } from "./base-event";

export interface EventHandler<TEvent extends BaseEvent = BaseEvent> {
  readonly eventName: TEvent["name"];
  handle(event: TEvent): Promise<void> | void;
}

export type EventCallback<TEvent extends BaseEvent = BaseEvent> = (
  event: TEvent,
) => Promise<void> | void;
