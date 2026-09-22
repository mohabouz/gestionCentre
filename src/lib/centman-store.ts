export type Student = { id: number; name: string; phone: string; whatsapp?: string; course: string; status: "نشط" | "متوقف"; due: number; lastPayment: string; enrollmentDate?: string; enrollmentFee?: number; subscriptionYear?: number };
export type Teacher = { id: number; name: string; specialty: string; commission: number; students: number; sessions: number };
export type Course = { id: number; name: string; type: "مادة" | "باقة"; teacher: string; price: number; enrolled: number; subjectIds?: number[] };
export type Enrollment = { id: number; studentId: number; courseId: number; enrolledAt: string; removedAt?: string; status: "نشط" | "متوقف" | "منتهية"; source?: "اشتراك أول" | "إضافة" };
export type Expense = { id: number; title: string; category: string; amount: number; date: string };
export type Payment = { id: number; studentId: number; student: string; amount: number; totalAmount?: number; month: string; status: "مسودة" | "مدفوع" | "جزئي" | "متأخر" | "ملغاة"; date: string; method?: "نقدي" | "تحويل بنكي" | "بطاقة"; receiptNumber?: string };
export type Session = { id: number; title: string; teacher: string; course: string; date: string; weekday?: string; time: string; endTime?: string; room: string };
export type Attendance = { id: number; sessionId: number; studentId: number; occurrenceDate: string; status: "حاضر" | "غائب" | "متأخر" };
export type Room = { id: number; name: string };
export type Payout = { id: number; teacherId: number; teacher: string; month: string; studentCount: number; revenue: number; commission: number; amount: number; status: "مسودة" | "مدفوعة" | "ملغاة"; paidAt?: string };

export const seedStudents: Student[] = [
  { id: 1, name: "ياسمين بن عمر", phone: "+212600123456", whatsapp: "+212600123456", course: "Pack Lycée", status: "نشط", due: 0, lastPayment: "2026-09-02", enrollmentDate: "2026-08-20", enrollmentFee: 200 },
  { id: 2, name: "محمد قاسمي", phone: "+212661234567", whatsapp: "+212661234567", course: "اللغة الإنجليزية", status: "نشط", due: 3500, lastPayment: "2026-07-12", enrollmentDate: "2026-07-01", enrollmentFee: 200 },
  { id: 3, name: "سارة بوعلام", phone: "+212670765432", whatsapp: "+212670765432", course: "Pack Collège", status: "نشط", due: 0, lastPayment: "2026-09-01", enrollmentDate: "2026-08-25", enrollmentFee: 200 },
  { id: 4, name: "أنس مراد", phone: "+212655987654", whatsapp: "+212655987654", course: "الرياضيات", status: "متوقف", due: 7000, lastPayment: "2026-06-08", enrollmentDate: "2026-05-14", enrollmentFee: 200 },
];
export const seedTeachers: Teacher[] = [{ id: 1, name: "أ. نادية قادري", specialty: "الرياضيات", commission: 60, students: 38, sessions: 46 }, { id: 2, name: "أ. كريم بلحاج", specialty: "اللغة الإنجليزية", commission: 60, students: 52, sessions: 61 }, { id: 3, name: "أ. ليلى عمار", specialty: "اللغة الفرنسية", commission: 60, students: 31, sessions: 39 }];
export const seedCourses: Course[] = [{ id: 1, name: "Pack Lycée", type: "باقة", teacher: "أ. نادية قادري", price: 8500, enrolled: 86 }, { id: 2, name: "اللغة الإنجليزية", type: "مادة", teacher: "أ. كريم بلحاج", price: 4500, enrolled: 68 }, { id: 3, name: "Pack Collège", type: "باقة", teacher: "أ. ليلى عمار", price: 7000, enrolled: 54 }];
export const seedEnrollments: Enrollment[] = [{ id: 1, studentId: 1, courseId: 1, enrolledAt: "2026-08-20", status: "نشط", source: "اشتراك أول" }, { id: 2, studentId: 2, courseId: 2, enrolledAt: "2026-07-01", status: "نشط", source: "اشتراك أول" }, { id: 3, studentId: 3, courseId: 3, enrolledAt: "2026-08-25", status: "نشط", source: "اشتراك أول" }, { id: 4, studentId: 4, courseId: 2, enrolledAt: "2026-05-14", status: "متوقف", source: "اشتراك أول" }];
export const seedExpenses: Expense[] = [{ id: 1, title: "كراء المركز", category: "إيجار", amount: 120000, date: "2026-09-01" }, { id: 2, title: "فاتورة الكهرباء", category: "مرافق", amount: 18500, date: "2026-09-04" }, { id: 3, title: "مستلزمات الطباعة", category: "مستلزمات", amount: 6200, date: "2026-09-08" }];
export const seedPayments: Payment[] = [{ id: 1, studentId: 1, student: "ياسمين بن عمر", amount: 8500, month: "سبتمبر 2026", status: "مدفوع", date: "2026-09-02", method: "تحويل بنكي", receiptNumber: "REC-20260902-001" }, { id: 2, studentId: 2, student: "محمد قاسمي", amount: 4500, month: "سبتمبر 2026", status: "متأخر", date: "2026-09-12" }, { id: 3, studentId: 3, student: "سارة بوعلام", amount: 7000, month: "سبتمبر 2026", status: "مدفوع", date: "2026-09-01", method: "نقدي", receiptNumber: "REC-20260901-002" }];
export const seedSessions: Session[] = [{ id: 1, title: "حصة الرياضيات", teacher: "أ. نادية قادري", course: "Pack Lycée", date: "2026-09-15", time: "16:00", room: "قاعة 1" }, { id: 2, title: "English conversation", teacher: "أ. كريم بلحاج", course: "اللغة الإنجليزية", date: "2026-09-16", time: "17:30", room: "قاعة 2" }];

export const seedPayouts: Payout[] = [];
export const money = (amount: number) => new Intl.NumberFormat("fr-MA").format(amount) + " MAD";
const currentDate = new Date();
export const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
export const currentMonth = "شتنبر 2026";
export const currentYear = 2026;
export const normalizeMoroccoPhone = (phone: string) => phone.replace(/\s+/g, "").replace(/^0/, "+212");
