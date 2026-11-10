import { test, expect } from "bun:test";
import { zonedLocalToIso } from "./time";

test("Stockholm local time converts across DST", () => {
  expect(zonedLocalToIso("2026-01-17T15:00:00.000", "Europe/Stockholm")).toBe("2026-01-17T14:00:00.000Z"); // CET, UTC+1
  expect(zonedLocalToIso("2026-07-04T15:00:00.000", "Europe/Stockholm")).toBe("2026-07-04T13:00:00.000Z"); // CEST, UTC+2
  // the night of the spring switch (02:00 CET -> 03:00 CEST on 29 Mar 2026)
  expect(zonedLocalToIso("2026-03-29T01:30:00", "Europe/Stockholm")).toBe("2026-03-29T00:30:00.000Z");
  expect(zonedLocalToIso("2026-03-29T03:30:00", "Europe/Stockholm")).toBe("2026-03-29T01:30:00.000Z");
  // the night of the autumn switch (03:00 CEST -> 02:00 CET on 25 Oct 2026)
  expect(zonedLocalToIso("2026-10-25T01:30:00", "Europe/Stockholm")).toBe("2026-10-24T23:30:00.000Z");
  expect(zonedLocalToIso("2026-10-25T04:00:00", "Europe/Stockholm")).toBe("2026-10-25T03:00:00.000Z");
});

test("UTC and a trailing Z are handled", () => {
  expect(zonedLocalToIso("2026-07-04T15:00:00Z", "UTC")).toBe("2026-07-04T15:00:00.000Z");
});
