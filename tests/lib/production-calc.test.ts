import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import {
  parseCapacityText,
  daysLate,
  daysUntil,
  hoursPerPiece,
  hoursNeededForOrder,
  nextAvailableDate,
  loadPercent,
  computeCTC,
  piecePayForOrder,
  ratingForTailor,
  deliveryUrgency,
  isPayableStatus,
  isActiveStatus,
  consumesTailorHours,
  getWeekdayName,
  DEFAULT_HOURS_PER_PIECE,
} from "@/lib/production-calc";

// Fixed "today" so tests are deterministic. Constructed via the local Date
// constructor (not an ISO string) so it isn't shifted by timezone parsing.
const TODAY = new Date(2026, 6, 15); // Wednesday, 15 Jul 2026

describe("parseCapacityText", () => {
  it("averages a simple range", () => {
    expect(parseCapacityText("3 to 3.5 trouser per day")).toBe(3.25);
  });

  it("takes the first range out of a multi-clause description", () => {
    expect(
      parseCapacityText(
        "4 to 5 shirts daily if only making shirt, 3 to 3.5 Trousers Daily if only making trousers"
      )
    ).toBe(4.5);
  });

  it("parses a single number with no range", () => {
    expect(parseCapacityText("1.25 Jacket daily, 4 to 5 Trial Jackets daily")).toBe(1.25);
  });

  it("returns null for empty or non-numeric text", () => {
    expect(parseCapacityText("")).toBeNull();
    expect(parseCapacityText(null)).toBeNull();
    expect(parseCapacityText("combined capacity limited to working hours")).toBeNull();
  });
});

describe("daysLate", () => {
  it("returns 0 when the delivery date is in the future", () => {
    expect(daysLate("2026-07-20", "IN PRODUCTION", TODAY)).toBe(0);
  });

  it("returns the positive day count when overdue and not completed", () => {
    expect(daysLate("2026-07-10", "IN PRODUCTION", TODAY)).toBe(5);
  });

  it("returns 0 for a completed status even if the date is in the past", () => {
    expect(daysLate("2026-07-10", "DELIVERED", TODAY)).toBe(0);
    expect(daysLate("2026-07-10", "DISPATCHED", TODAY)).toBe(0);
  });

  it("returns 0 when there is no delivery date", () => {
    expect(daysLate(null, "IN PRODUCTION", TODAY)).toBe(0);
  });

  it("returns 0 for an order due exactly today", () => {
    expect(daysLate("2026-07-15", "IN PRODUCTION", TODAY)).toBe(0);
  });
});

describe("daysUntil", () => {
  it("returns 0 for today, positive for future, negative for past", () => {
    expect(daysUntil("2026-07-15", TODAY)).toBe(0);
    expect(daysUntil("2026-07-18", TODAY)).toBe(3);
    expect(daysUntil("2026-07-10", TODAY)).toBe(-5);
  });
});

describe("hoursPerPiece", () => {
  it("prefers the explicit per-item estimate", () => {
    expect(
      hoursPerPiece({ estimatedHoursPerPiece: 2, tailorTotalWorkingHours: 11, tailorCapacityPcsPerDay: 4 })
    ).toBe(2);
  });

  it("falls back to tailor capacity when no item estimate exists", () => {
    expect(
      hoursPerPiece({ estimatedHoursPerPiece: null, tailorTotalWorkingHours: 11, tailorCapacityPcsPerDay: 4 })
    ).toBeCloseTo(2.75);
  });

  it("falls back to the default when neither is available", () => {
    expect(hoursPerPiece({})).toBe(DEFAULT_HOURS_PER_PIECE);
  });

  it("ignores a zero item estimate and falls through", () => {
    expect(
      hoursPerPiece({ estimatedHoursPerPiece: 0, tailorTotalWorkingHours: 10, tailorCapacityPcsPerDay: 5 })
    ).toBe(2);
  });
});

describe("hoursNeededForOrder", () => {
  it("multiplies qty by hours per piece", () => {
    expect(hoursNeededForOrder(3, 2.5)).toBe(7.5);
  });
});

describe("nextAvailableDate", () => {
  it("returns today when there is no backlog", () => {
    const result = nextAvailableDate({
      totalHoursNeeded: 0,
      totalWorkingHours: 11,
      weeklyOffDay: "FRIDAY",
      today: TODAY,
    });
    expect(result.toDateString()).toBe(TODAY.toDateString());
  });

  it("walks forward and skips the weekly off day", () => {
    // TODAY is Wed 2026-07-15. 11 hrs/day, needs 22 hrs -> clears on day 2
    // (Wed=11, Thu=22) well before hitting Friday, so off-day skip isn't
    // exercised here — bump the requirement so the walk crosses Friday.
    // Wed(11) + Thu(11) = 22, Fri is off (skipped), Sat(11) = 33
    const result = nextAvailableDate({
      totalHoursNeeded: 30,
      totalWorkingHours: 11,
      weeklyOffDay: "FRIDAY",
      today: TODAY,
    });
    // Wed=11, Thu=22, Fri skipped, Sat=33 >= 30 -> Saturday 2026-07-18
    expect(format(result, "yyyy-MM-dd")).toBe("2026-07-18");
  });

  it("never returns a date on the weekly off day itself", () => {
    // Needs exactly 22 hrs: Wed=11, Thu=22 -> clears Thursday, no off-day involved
    const result = nextAvailableDate({
      totalHoursNeeded: 22,
      totalWorkingHours: 11,
      weeklyOffDay: "FRIDAY",
      today: TODAY,
    });
    expect(getWeekdayName(result)).not.toBe("FRIDAY");
  });
});

describe("loadPercent", () => {
  it("computes load against a 6-day week when there is a weekly off day", () => {
    // 33 hrs needed / (11 hrs * 6 days = 66) = 50%
    expect(loadPercent({ hoursNeeded: 33, totalWorkingHours: 11, weeklyOffDay: "FRIDAY" })).toBe(50);
  });

  it("computes load against a 7-day week when there is no off day", () => {
    expect(loadPercent({ hoursNeeded: 77, totalWorkingHours: 11, weeklyOffDay: null })).toBe(100);
  });

  it("returns 0 when weekly capacity is 0 rather than dividing by zero", () => {
    expect(loadPercent({ hoursNeeded: 10, totalWorkingHours: 0, weeklyOffDay: "FRIDAY" })).toBe(0);
  });
});

describe("computeCTC", () => {
  it("always sums the three components, ignoring any stored total", () => {
    expect(computeCTC(2200, 300, 500)).toBe(3000);
    expect(computeCTC(0, 300, 500)).toBe(800);
  });
});

describe("piecePayForOrder / isPayableStatus", () => {
  it("pays for payable statuses", () => {
    expect(piecePayForOrder(2, 90, "DISPATCHED")).toBe(180);
    expect(piecePayForOrder(2, 90, "DELIVERED")).toBe(180);
    expect(piecePayForOrder(2, 90, "READY FOR DELIVERY")).toBe(180);
    expect(piecePayForOrder(2, 90, "READY FOR DISPATCH")).toBe(180);
    expect(piecePayForOrder(2, 90, "TRIAL READY")).toBe(180);
  });

  it("pays nothing for non-payable statuses", () => {
    expect(piecePayForOrder(2, 90, "IN PRODUCTION")).toBe(0);
    expect(piecePayForOrder(2, 90, "PENDING")).toBe(0);
    expect(piecePayForOrder(2, 90, "CANCELLED")).toBe(0);
    expect(piecePayForOrder(2, 90, "CUTTING NOT RECEIVED")).toBe(0);
  });

  it("isPayableStatus matches piecePayForOrder's behavior", () => {
    expect(isPayableStatus("DISPATCHED")).toBe(true);
    expect(isPayableStatus("ON HOLD")).toBe(false);
  });
});

describe("ratingForTailor", () => {
  it("is NEW when there are no orders yet", () => {
    expect(ratingForTailor({ totalOrders: 0, pcsDone: 0, delayedCount: 0 })).toBe("NEW");
  });

  it("is NEEDS ATTENTION when delayed ratio exceeds 15%", () => {
    expect(ratingForTailor({ totalOrders: 10, pcsDone: 5, delayedCount: 2 })).toBe("NEEDS ATTENTION");
  });

  it("is EXCELLENT when delayed ratio is under 5% and output is above 10 pcs", () => {
    expect(ratingForTailor({ totalOrders: 100, pcsDone: 50, delayedCount: 2 })).toBe("EXCELLENT");
  });

  it("is STANDARD in the middle band", () => {
    expect(ratingForTailor({ totalOrders: 100, pcsDone: 5, delayedCount: 3 })).toBe("STANDARD");
  });

  it("does not reach EXCELLENT on a low delayed ratio alone if pcsDone is too low", () => {
    expect(ratingForTailor({ totalOrders: 100, pcsDone: 3, delayedCount: 1 })).toBe("STANDARD");
  });
});

describe("isActiveStatus / consumesTailorHours", () => {
  it("treats DELIVERED, DISPATCHED and CANCELLED as terminal (not active)", () => {
    expect(isActiveStatus("DELIVERED")).toBe(false);
    expect(isActiveStatus("DISPATCHED")).toBe(false);
    expect(isActiveStatus("CANCELLED")).toBe(false);
  });

  it("treats everything else as active, including RETURN ITEMS", () => {
    expect(isActiveStatus("IN PRODUCTION")).toBe(true);
    expect(isActiveStatus("RETURN ITEMS")).toBe(true);
    expect(isActiveStatus("PENDING")).toBe(true);
  });

  it("only counts pre-finish statuses as consuming tailor hours", () => {
    expect(consumesTailorHours("IN PRODUCTION")).toBe(true);
    expect(consumesTailorHours("PENDING")).toBe(true);
    expect(consumesTailorHours("TRIAL READY")).toBe(false);
    expect(consumesTailorHours("READY FOR DELIVERY")).toBe(false);
    expect(consumesTailorHours("DISPATCHED")).toBe(false);
  });
});

describe("deliveryUrgency", () => {
  it("buckets overdue, today, tomorrow, nearing and later correctly", () => {
    expect(deliveryUrgency("2026-07-14", "IN PRODUCTION", TODAY)).toBe("overdue");
    expect(deliveryUrgency("2026-07-15", "IN PRODUCTION", TODAY)).toBe("today");
    expect(deliveryUrgency("2026-07-16", "IN PRODUCTION", TODAY)).toBe("tomorrow");
    expect(deliveryUrgency("2026-07-18", "IN PRODUCTION", TODAY)).toBe("nearing");
    expect(deliveryUrgency("2026-07-25", "IN PRODUCTION", TODAY)).toBe("later");
  });

  it("returns none for completed orders or missing dates", () => {
    expect(deliveryUrgency("2026-07-10", "DELIVERED", TODAY)).toBe("none");
    expect(deliveryUrgency(null, "IN PRODUCTION", TODAY)).toBe("none");
  });
});
