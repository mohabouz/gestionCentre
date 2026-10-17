import assert from "node:assert/strict";
import test from "node:test";
import { discountedPrice, enrollmentAppliesToMonth, paymentBillingMonth, remainingPaymentAmount } from "../src/lib/monthly-billing.ts";

test("an enrollment recurs from its first month onward", () => {
  const enrollment = { enrolledAt: "2026-09-20", status: "نشط" };
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-08"), false);
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-09"), true);
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-10"), true);
});

test("a removed enrollment remains applicable through its removal month", () => {
  const enrollment = { enrolledAt: "2026-07-01", removedAt: "2026-09-03", status: "متوقف" };
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-09"), true);
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-10"), false);
});

test("a stopped enrollment without a removal date does not generate future charges", () => {
  const enrollment = { enrolledAt: "2026-07-01", status: "متوقف" };
  assert.equal(enrollmentAppliesToMonth(enrollment, "2026-10"), false);
});

test("billing month prefers the durable field and supports legacy dates", () => {
  assert.equal(paymentBillingMonth({ billingMonth: "2026-11", date: "2026-10-01" }), "2026-11");
  assert.equal(paymentBillingMonth({ date: "2026-10-17" }), "2026-10");
});

test("discount is applied per enrollment and cannot make its price negative", () => {
  assert.equal(discountedPrice(500, 75), 425);
  assert.equal(discountedPrice(500, 900), 0);
  assert.equal(discountedPrice(500, -20), 500);
});

test("remaining amount supports partial payments without becoming negative", () => {
  assert.equal(remainingPaymentAmount({ amount: 150, totalAmount: 500 }), 350);
  assert.equal(remainingPaymentAmount({ amount: 600, totalAmount: 500 }), 0);
});
