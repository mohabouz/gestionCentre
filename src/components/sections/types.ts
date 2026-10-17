"use client";

import type { Data } from "@/lib/section-data";
import type {
  Attendance as AttendanceRecord,
  Expense,
  Room,
  Session,
  Teacher,
} from "@/lib/centman-store";


export type AdminUser = { id: number; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN"; active: boolean; createdAt: string };

export type Props = {
  data: Data;
  update: (data: Data, message?: string) => void;
  deleteStudent?: (id: number) => Promise<void>;
  createExpense?: (expense: Omit<Expense, "id">) => Promise<boolean>;
  deleteExpense?: (id: number) => Promise<void>;
  saveTeacher?: (
    teacher: Pick<Teacher, "name" | "specialty" | "commission"> & { id?: number },
  ) => Promise<boolean>;
  deleteTeacher?: (id: number) => Promise<void>;
  saveSession?: (session: Session) => Promise<boolean>;
  saveRoom?: (room: Pick<Room, "name"> & { id?: number }) => Promise<boolean>;
  deleteRoom?: (id: number) => Promise<boolean>;
  saveAttendance?: (
    sessionId: number,
    occurrenceDate: string,
    records: Array<Pick<AttendanceRecord, "studentId" | "status">>,
  ) => Promise<boolean>;
};
