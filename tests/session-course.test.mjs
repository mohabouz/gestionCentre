import assert from "node:assert/strict";
import test from "node:test";
import { resolveSessionCourse } from "../src/lib/session-course.ts";

const levels = [
  { id: 1, abbreviation: "1ACF" },
  { id: 2, abbreviation: "2AC" },
  { id: 3, abbreviation: "1BAC-SEF" },
];
const courses = [
  { id: 11, name: "الرياضيات", teacher: "أشرف", levelIds: [1] },
  { id: 12, name: "الرياضيات", teacher: "أشرف", levelIds: [2] },
  { id: 13, name: "الرياضيات", teacher: "أشرف", levelIds: [3] },
];

test("resolves a session by its durable course id", () => {
  assert.equal(resolveSessionCourse({ courseId: 12, course: "", teacher: "", title: "" }, courses, levels)?.id, 12);
});

test("recovers a legacy session from teacher, subject and level abbreviation", () => {
  assert.equal(resolveSessionCourse({ courseId: null, course: "", teacher: "أشرف", title: "الرياضيات - 1ACF" }, courses, levels)?.id, 11);
});

test("does not guess when legacy data is ambiguous", () => {
  assert.equal(resolveSessionCourse({ courseId: null, course: "", teacher: "أشرف", title: "الرياضيات" }, courses, levels), undefined);
});

test("uses the school stage when an old title uses a different stream abbreviation", () => {
  assert.equal(resolveSessionCourse({ courseId: null, course: "", teacher: "أشرف", title: "الرياضيات - 1BAC Sc Ex" }, courses, levels)?.id, 13);
});
