import assert from "node:assert/strict";
import test from "node:test";
import { InvalidStateError, parseState, stateCollections } from "../src/lib/state-validation.ts";

const validState = () => Object.fromEntries(stateCollections.map((key) => [key, []]));

test("accepts a complete state payload", () => {
  const state = validState();
  state.students.push({ id: 1 });
  assert.equal(parseState(state), state);
});

test("rejects a missing collection", () => {
  const state = validState();
  delete state.payments;
  assert.throws(() => parseState(state), InvalidStateError);
});

test("rejects invalid and duplicate identifiers", () => {
  const invalid = validState();
  invalid.students.push({ id: "1" });
  assert.throws(() => parseState(invalid), /Invalid item in students/);

  const duplicate = validState();
  duplicate.students.push({ id: 1 }, { id: 1 });
  assert.throws(() => parseState(duplicate), /Duplicate id in students/);
});
