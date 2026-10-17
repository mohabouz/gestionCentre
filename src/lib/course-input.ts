export type CourseInput = {
  name: string;
  type: "مادة" | "باقة";
  price: number;
  teacher: string;
  levelIds: number[];
  subjectIds: number[];
};

export function parseCourseInput(body: unknown): CourseInput | null {
  const value = body as Record<string, unknown> | null;
  const name = String(value?.name || "").trim();
  const type = value?.type === "مادة" || value?.type === "باقة" ? value.type : null;
  const price = Number(value?.price);
  const teacher = String(value?.teacher || "").trim();
  const levelIds = uniquePositiveIntegers(value?.levelIds);
  const subjectIds = uniquePositiveIntegers(value?.subjectIds);
  if (
    !name ||
    !type ||
    !Number.isInteger(price) ||
    price < 0 ||
    !levelIds?.length ||
    (type === "مادة" && !teacher) ||
    (type === "باقة" && !subjectIds?.length)
  ) {
    return null;
  }
  return {
    name,
    type,
    price,
    teacher: type === "مادة" ? teacher : "",
    levelIds: levelIds!,
    subjectIds: type === "باقة" ? subjectIds! : [],
  };
}

function uniquePositiveIntegers(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const values = value.map(Number);
  if (values.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  return [...new Set(values)];
}
