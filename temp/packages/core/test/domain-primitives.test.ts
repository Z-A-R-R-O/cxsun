import { describe, expect, it } from "vitest";
import { AggregateRoot, DomainEvent, Entity, ValueObject } from "../src";

class TestEntity extends Entity<string> {}

class TestValueObject extends ValueObject<{ readonly code: string; readonly amount: number }> {}

class TestEvent extends DomainEvent<{ readonly reason: string }> {
  public constructor(aggregateId: string) {
    super("test.aggregate.changed", aggregateId, { reason: "foundation-check" });
  }
}

class TestAggregate extends AggregateRoot<string> {
  public markChanged(): void {
    this.addDomainEvent(new TestEvent(this.id));
  }
}

describe("DDD primitives", () => {
  it("compares entities by identity", () => {
    expect(new TestEntity("same").equals(new TestEntity("same"))).toBe(true);
    expect(new TestEntity("same").equals(new TestEntity("different"))).toBe(false);
  });

  it("compares value objects by value", () => {
    const first = new TestValueObject({ code: "A", amount: 1 });
    const second = new TestValueObject({ code: "A", amount: 1 });
    const third = new TestValueObject({ code: "B", amount: 1 });

    expect(first.equals(second)).toBe(true);
    expect(first.equals(third)).toBe(false);
  });

  it("collects and clears aggregate domain events", () => {
    const aggregate = new TestAggregate("aggregate-1");

    aggregate.markChanged();

    const events = aggregate.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("test.aggregate.changed");
    expect(aggregate.pullDomainEvents()).toEqual([]);
  });
});
