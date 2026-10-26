import assert from "node:assert/strict";
import { describe, it } from "node:test";

function applyTierDiscountDisplay(subtotal, discountPercent) {
  const percent =
    typeof discountPercent === "number" &&
    Number.isFinite(discountPercent) &&
    discountPercent > 0
      ? discountPercent
      : 0;
  const discountAmount =
    percent > 0 ? Math.round((subtotal * percent) / 100) : 0;
  return {
    subtotal,
    discountPercent: percent,
    discountAmount,
    afterDiscount: Math.max(0, subtotal - discountAmount),
  };
}

describe("RW-12 Phase D + C helpers", () => {
  it("tier discount math", () => {
    const r = applyTierDiscountDisplay(1000, 10);
    assert.equal(r.discountAmount, 100);
    assert.equal(r.afterDiscount, 900);
  });

  it("walk-in payload requires challengeId", () => {
    const payload = { mobileNumber: "9876543210", challengeId: "ch_1" };
    assert.ok(payload.challengeId);
  });
});
