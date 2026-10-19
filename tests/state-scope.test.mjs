import assert from "node:assert/strict";
import test from "node:test";
import { stateForSection } from "../src/lib/state-scope.ts";

const state = Object.fromEntries(
  ["students", "teachers", "courses", "levels", "enrollments", "expenses", "payments", "collections", "sessions", "payouts", "rooms", "attendances"]
    .map((field) => [field, [field]]),
);

test("section state contains only the data needed by that page", () => {
  assert.deepEqual(Object.keys(stateForSection(state, "levels")).sort(), ["levels", "students"]);
  assert.deepEqual(
    Object.keys(stateForSection(state, "schedule")).sort(),
    ["courses", "levels", "rooms", "sessions", "students", "teachers"],
  );
  assert.equal("payments" in stateForSection(state, "schedule"), false);
});

test("unknown sections receive the dashboard scope", () => {
  const scoped = stateForSection(state, "unknown");
  assert.equal("expenses" in scoped, true);
  assert.equal("payouts" in scoped, false);
});
