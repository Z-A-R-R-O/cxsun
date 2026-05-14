import { describe, expect, it } from "vitest";
import { createEvent, InMemoryEventBus, type EventHandler } from "../src";

describe("InMemoryEventBus", () => {
  it("publishes events to subscribed callbacks", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.subscribe("foundation.checked", (event) => {
      received.push(String(event.payload));
    });

    await bus.publish(createEvent("foundation.checked", "ready"));

    expect(received).toEqual(["ready"]);
  });

  it("registers event handler objects", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    const handler: EventHandler = {
      eventName: "foundation.handled",
      handle(event) {
        received.push(event.name);
      },
    };

    bus.register(handler);
    await bus.publish(createEvent("foundation.handled", { ok: true }));

    expect(received).toEqual(["foundation.handled"]);
  });

  it("publishes events sequentially through publishAll", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.subscribe("foundation.batch", (event) => {
      received.push(String(event.payload));
    });

    await bus.publishAll([
      createEvent("foundation.batch", "first"),
      createEvent("foundation.batch", "second"),
    ]);

    expect(received).toEqual(["first", "second"]);
  });
});
