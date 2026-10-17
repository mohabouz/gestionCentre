import assert from "node:assert/strict";
import test from "node:test";
import { hasSessionConflict, intervalsOverlap, snapByCoverage } from "../src/lib/timetable.ts";

test("snaps only after more than half of a slot is covered", () => {
  assert.equal(snapByCoverage(2.49), 2);
  assert.equal(snapByCoverage(2.5), 2);
  assert.equal(snapByCoverage(2.51), 3);
});

test("detects partial overlap but permits touching edges", () => {
  assert.equal(intervalsOverlap(2, 4, 3, 5), true);
  assert.equal(intervalsOverlap(2, 4, 4, 6), false);
});

test("rejects room and teacher conflicts while ignoring the moved session", () => {
  const sessions = [
    { id: 1, title: "A", teacher: "Teacher A", course: "Math", weekday: "الاثنين", room: "Room 1", time: "09:00", endTime: "10:00", date: "" },
    { id: 2, title: "B", teacher: "Teacher B", course: "French", weekday: "الاثنين", room: "Room 2", time: "09:00", endTime: "10:00", date: "" },
  ];
  const indexOf = (time) => { const [hour, minute] = time.split(":").map(Number); return (hour * 60 + minute - 480) / 30; };
  const base = { sessions, sessionId: 9, weekday: "الاثنين", startIndex: 3, endIndex: 5, indexOf };
  assert.equal(hasSessionConflict({ ...base, room: "Room 1", teacher: "Teacher C" }), true);
  assert.equal(hasSessionConflict({ ...base, room: "Room 3", teacher: "Teacher B" }), true);
  assert.equal(hasSessionConflict({ ...base, room: "Room 3", teacher: "Teacher C" }), false);
  assert.equal(hasSessionConflict({ ...base, sessionId: 1, room: "Room 1", teacher: "Teacher A" }), false);
});
