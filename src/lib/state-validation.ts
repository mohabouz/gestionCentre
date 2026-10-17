export const stateCollections = [
  "students",
  "teachers",
  "courses",
  "levels",
  "enrollments",
  "expenses",
  "payments",
  "collections",
  "sessions",
  "payouts",
  "rooms",
  "attendances",
] as const;

export type BulkState = Record<(typeof stateCollections)[number], Array<{ id: number }>>;

export class InvalidStateError extends Error {}

export function parseState<T extends BulkState>(input: unknown): T {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidStateError("Invalid state payload");
  }

  const record = input as Record<string, unknown>;
  for (const key of stateCollections) {
    if (!Array.isArray(record[key])) throw new InvalidStateError(`Invalid ${key} collection`);

    const ids = new Set<number>();
    for (const item of record[key]) {
      if (!item || typeof item !== "object" || !Number.isInteger((item as { id?: unknown }).id)) {
        throw new InvalidStateError(`Invalid item in ${key}`);
      }
      const id = (item as { id: number }).id;
      if (ids.has(id)) throw new InvalidStateError(`Duplicate id in ${key}`);
      ids.add(id);
    }
  }

  return record as T;
}
