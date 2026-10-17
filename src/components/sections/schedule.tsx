"use client";

import { SpreadsheetTimetable } from "@/components/sections/timetable-spreadsheet";
import type { Props } from "@/components/sections/types";

export function Schedule({ data, update }: Props) {
  return <SpreadsheetTimetable data={data} update={update} />;
}
