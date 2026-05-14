import { createEvent } from "@cxnext/event";

export const DUMMY_EVENT_NAME = "foundation.dummy";

export function createDummyEvent() {
  return createEvent(DUMMY_EVENT_NAME, {
    purpose: "Validate event wiring without introducing business behavior.",
  });
}
