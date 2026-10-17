import {
  Attendance as AttendanceRecord,
  Course,
  Enrollment,
  Expense,
  Level,
  Payment,
  PaymentCollection,
  Payout,
  Room,
  Session,
  Student,
  Teacher,
} from "@/lib/centman-store";

export type Data = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  levels: Level[];
  enrollments: Enrollment[];
  expenses: Expense[];
  payments: Payment[];
  collections: PaymentCollection[];
  sessions: Session[];
  payouts: Payout[];
  rooms: Room[];
  attendances: AttendanceRecord[];
};

export const initial: Data = {
  students: [],
  teachers: [],
  courses: [],
  levels: [],
  enrollments: [],
  expenses: [],
  payments: [],
  collections: [],
  sessions: [],
  payouts: [],
  rooms: [],
  attendances: [],
};
