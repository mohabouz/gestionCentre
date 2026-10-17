"use client";

import { SpreadsheetTimetable } from "@/components/sections/timetable-spreadsheet";
import type { Props } from "@/components/sections/types";

export function Schedule(props: Props) {
  return <SpreadsheetTimetable {...props} />;
}
