export const sectionFieldNames: Record<string, readonly string[]> = {
  dashboard: ["students", "teachers", "courses", "enrollments", "expenses", "payments", "collections"],
  students: ["students", "courses", "levels", "enrollments", "payments", "collections"],
  teachers: ["students", "teachers"],
  courses: ["students", "teachers", "courses", "levels", "enrollments"],
  levels: ["students", "levels"],
  expenses: ["students", "expenses"],
  registrations: ["students", "courses", "levels", "enrollments"],
  payments: ["students", "courses", "levels", "enrollments", "payments", "collections"],
  "annual-fees": ["students", "payments", "collections"],
  "late-students": ["students", "courses", "levels", "enrollments", "payments", "collections"],
  payouts: ["students", "teachers", "courses", "levels", "enrollments", "payments", "collections", "payouts"],
  schedule: ["students", "teachers", "courses", "levels", "sessions", "rooms"],
  attendance: ["students", "courses", "levels", "enrollments", "sessions", "attendances"],
  settings: ["students"],
};

export function stateForSection<T extends Record<string, unknown>>(state: T, section: string): Partial<T> {
  const fields = sectionFieldNames[section] || sectionFieldNames.dashboard;
  return Object.fromEntries(fields.map((field) => [field, state[field]])) as Partial<T>;
}
