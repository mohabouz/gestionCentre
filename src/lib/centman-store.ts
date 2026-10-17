export type Student = { id: number; name: string; phone: string; whatsapp?: string; course: string; status: "نشط" | "متوقف"; due: number; lastPayment: string; enrollmentDate?: string; enrollmentFee?: number; subscriptionYear?: number };
export type Teacher = { id: number; name: string; specialty: string; commission: number; students: number; sessions: number };
export type LevelCurriculum = "MOROCCAN" | "INTERNATIONAL";
export type LevelCycle = "ابتدائي" | "إعدادي" | "تأهيلي";
export type Level = { id: number; code: string; nameAr: string; nameFr: string; abbreviation: string; curriculum: LevelCurriculum; cycle: LevelCycle; sortOrder: number };
export type Course = { id: number; name: string; type: "مادة" | "باقة"; teacher: string; price: number; enrolled: number; levelId?: number | null; levelIds?: number[]; level?: Level | null; subjectIds?: number[] };
export type Enrollment = { id: number; studentId: number; courseId: number; enrolledAt: string; removedAt?: string; status: "نشط" | "متوقف" | "منتهية"; source?: "اشتراك أول" | "إضافة"; discount?: number };
export type Expense = { id: number; title: string; category: string; amount: number; date: string };
export type Payment = { id: number; studentId: number; student: string; courseId?: number | null; enrollmentId?: number | null; billingMonth?: string | null; amount: number; totalAmount?: number; month: string; status: "مسودة" | "مدفوع" | "جزئي" | "متأخر" | "ملغاة"; date: string; method?: "نقدي" | "تحويل بنكي" | "بطاقة"; receiptNumber?: string };
export type PaymentCollection = { id: number; paymentId: number; amount: number; date: string; method?: string; receiptNumber?: string };
export type Session = { id: number; title: string; teacher: string; course: string; courseId?: number | null; date: string; weekday?: string; time: string; endTime?: string; room: string };
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
export const moroccanLevels: Omit<Level, "id" | "curriculum" | "cycle">[] = [
  { code: "primary-1", abbreviation: "1AP", nameAr: "الأول ابتدائي", nameFr: "1re année primaire", sortOrder: 10 },
  { code: "primary-2", abbreviation: "2AP", nameAr: "الثاني ابتدائي", nameFr: "2e année primaire", sortOrder: 20 },
  { code: "primary-3", abbreviation: "3AP", nameAr: "الثالث ابتدائي", nameFr: "3e année primaire", sortOrder: 30 },
  { code: "primary-4", abbreviation: "4AP", nameAr: "الرابع ابتدائي", nameFr: "4e année primaire", sortOrder: 40 },
  { code: "primary-5", abbreviation: "5AP", nameAr: "الخامس ابتدائي", nameFr: "5e année primaire", sortOrder: 50 },
  { code: "primary-6", abbreviation: "6AP", nameAr: "السادس ابتدائي", nameFr: "6e année primaire", sortOrder: 60 },
  { code: "college-1", abbreviation: "1AC", nameAr: "الأولى إعدادي", nameFr: "1re année collège", sortOrder: 70 },
  { code: "college-2", abbreviation: "2AC", nameAr: "الثانية إعدادي", nameFr: "2e année collège", sortOrder: 80 },
  { code: "college-3", abbreviation: "3AC", nameAr: "الثالثة إعدادي", nameFr: "3e année collège", sortOrder: 90 },
  { code: "tronc-commun-sciences", abbreviation: "TC-SC", nameAr: "الجذع المشترك العلمي", nameFr: "Tronc commun scientifique", sortOrder: 100 },
  { code: "tronc-commun-lettres", abbreviation: "TC-LSH", nameAr: "الجذع المشترك آداب وعلوم إنسانية", nameFr: "Tronc commun lettres et sciences humaines", sortOrder: 110 },
  { code: "tronc-commun-tech", abbreviation: "TC-T", nameAr: "الجذع المشترك التكنولوجي", nameFr: "Tronc commun technologique", sortOrder: 120 },
  { code: "bac-1-experimental", abbreviation: "1BAC-SX", nameAr: "الأولى باكالوريا علوم تجريبية", nameFr: "1re Bac Sciences expérimentales", sortOrder: 130 },
  { code: "bac-1-math", abbreviation: "1BAC-SM", nameAr: "الأولى باكالوريا علوم رياضية", nameFr: "1re Bac Sciences mathématiques", sortOrder: 140 },
  { code: "bac-1-ste", abbreviation: "1BAC-STE", nameAr: "الأولى باكالوريا علوم وتكنولوجيات كهربائية", nameFr: "1re Bac Sciences et technologies électriques (STE)", sortOrder: 150 },
  { code: "bac-1-stm", abbreviation: "1BAC-STM", nameAr: "الأولى باكالوريا علوم وتكنولوجيات ميكانيكية", nameFr: "1re Bac Sciences et technologies mécaniques (STM)", sortOrder: 160 },
  { code: "bac-1-economics", abbreviation: "1BAC-SE", nameAr: "الأولى باكالوريا علوم اقتصادية", nameFr: "1re Bac Sciences économiques", sortOrder: 170 },
  { code: "bac-1-literature", abbreviation: "1BAC-L", nameAr: "الأولى باكالوريا آداب", nameFr: "1re Bac Lettres", sortOrder: 180 },
  { code: "bac-2-pc", abbreviation: "2BAC-PC", nameAr: "الثانية باكالوريا علوم فيزيائية", nameFr: "2e Bac Sciences physiques (PC)", sortOrder: 190 },
  { code: "bac-2-svt", abbreviation: "2BAC-SVT", nameAr: "الثانية باكالوريا علوم الحياة والأرض", nameFr: "2e Bac Sciences de la vie et de la terre (SVT)", sortOrder: 200 },
  { code: "bac-2-ste", abbreviation: "2BAC-STE", nameAr: "الثانية باكالوريا علوم وتكنولوجيات كهربائية", nameFr: "2e Bac Sciences et technologies électriques (STE)", sortOrder: 210 },
  { code: "bac-2-stm", abbreviation: "2BAC-STM", nameAr: "الثانية باكالوريا علوم وتكنولوجيات ميكانيكية", nameFr: "2e Bac Sciences et technologies mécaniques (STM)", sortOrder: 220 },
  { code: "bac-2-sm", abbreviation: "2BAC-SM", nameAr: "الثانية باكالوريا علوم رياضية", nameFr: "2e Bac Sciences mathématiques (A et B)", sortOrder: 230 },
  { code: "bac-2-economics", abbreviation: "2BAC-SE", nameAr: "الثانية باكالوريا علوم اقتصادية", nameFr: "2e Bac Sciences économiques", sortOrder: 250 },
  { code: "bac-2-literature", abbreviation: "2BAC-LSH", nameAr: "الثانية باكالوريا آداب وعلوم إنسانية", nameFr: "2e Bac Lettres et sciences humaines", sortOrder: 260 },
];
export const internationalLevels: Omit<Level, "id" | "curriculum" | "cycle">[] = [
  { code: "int-maternelle-ps", abbreviation: "PS", nameAr: "التعليم الأولي - القسم الصغير", nameFr: "Maternelle - Petite section", sortOrder: 1000 },
  { code: "int-maternelle-ms", abbreviation: "MS", nameAr: "التعليم الأولي - القسم المتوسط", nameFr: "Maternelle - Moyenne section", sortOrder: 1010 },
  { code: "int-maternelle-gs", abbreviation: "GS", nameAr: "التعليم الأولي - القسم الكبير", nameFr: "Maternelle - Grande section", sortOrder: 1020 },
  { code: "int-cp", abbreviation: "CP", nameAr: "الأول ابتدائي دولي", nameFr: "CP", sortOrder: 1030 },
  { code: "int-ce1", abbreviation: "CE1", nameAr: "الثاني ابتدائي دولي", nameFr: "CE1", sortOrder: 1040 },
  { code: "int-ce2", abbreviation: "CE2", nameAr: "الثالث ابتدائي دولي", nameFr: "CE2", sortOrder: 1050 },
  { code: "int-cm1", abbreviation: "CM1", nameAr: "الرابع ابتدائي دولي", nameFr: "CM1", sortOrder: 1060 },
  { code: "int-cm2", abbreviation: "CM2", nameAr: "الخامس ابتدائي دولي", nameFr: "CM2", sortOrder: 1070 },
  { code: "int-6e", abbreviation: "6e", nameAr: "السادس ابتدائي دولي", nameFr: "6e", sortOrder: 1080 },
  { code: "int-5e", abbreviation: "5e", nameAr: "الأولى إعدادي دولي", nameFr: "5e", sortOrder: 1090 },
  { code: "int-4e", abbreviation: "4e", nameAr: "الثانية إعدادي دولي", nameFr: "4e", sortOrder: 1100 },
  { code: "int-3e", abbreviation: "3e", nameAr: "الثالثة إعدادي دولي", nameFr: "3e", sortOrder: 1110 },
  { code: "int-seconde", abbreviation: "2nde", nameAr: "الجذع المشترك دولي", nameFr: "Seconde", sortOrder: 1120 },
  { code: "int-premiere", abbreviation: "1re", nameAr: "الأولى باكالوريا دولي", nameFr: "Première", sortOrder: 1130 },
  { code: "int-terminale", abbreviation: "Tle", nameAr: "الثانية باكالوريا دولي", nameFr: "Terminale", sortOrder: 1140 },
  { code: "int-tronc-commun-sciences", abbreviation: "TC-SCI-I", nameAr: "الجذع المشترك العلمي - دولي", nameFr: "Tronc commun scientifique - parcours international", sortOrder: 1200 },
  { code: "int-bac-1-experimental", abbreviation: "1BAC-SX", nameAr: "الأولى باكالوريا علوم تجريبية - دولي", nameFr: "1re Bac Sciences expérimentales - parcours international", sortOrder: 1210 },
  { code: "int-bac-1-math", abbreviation: "1BAC-SM", nameAr: "الأولى باكالوريا علوم رياضية - دولي", nameFr: "1re Bac Sciences mathématiques - parcours international", sortOrder: 1220 },
  { code: "int-bac-1-ste", abbreviation: "1BAC-STE", nameAr: "الأولى باكالوريا علوم وتكنولوجيات كهربائية - دولي", nameFr: "1re Bac Sciences et technologies électriques (STE) - parcours international", sortOrder: 1230 },
  { code: "int-bac-1-stm", abbreviation: "1BAC-STM", nameAr: "الأولى باكالوريا علوم وتكنولوجيات ميكانيكية - دولي", nameFr: "1re Bac Sciences et technologies mécaniques (STM) - parcours international", sortOrder: 1240 },
  { code: "int-bac-2-pc", abbreviation: "2BAC-PC", nameAr: "الثانية باكالوريا علوم فيزيائية - دولي", nameFr: "2e Bac Sciences physiques (PC) - parcours international", sortOrder: 1250 },
  { code: "int-bac-2-svt", abbreviation: "2BAC-SVT", nameAr: "الثانية باكالوريا علوم الحياة والأرض - دولي", nameFr: "2e Bac Sciences de la vie et de la terre (SVT) - parcours international", sortOrder: 1260 },
  { code: "int-bac-2-ste", abbreviation: "2BAC-STE", nameAr: "الثانية باكالوريا علوم وتكنولوجيات كهربائية - دولي", nameFr: "2e Bac Sciences et technologies électriques (STE) - parcours international", sortOrder: 1270 },
  { code: "int-bac-2-stm", abbreviation: "2BAC-STM", nameAr: "الثانية باكالوريا علوم وتكنولوجيات ميكانيكية - دولي", nameFr: "2e Bac Sciences et technologies mécaniques (STM) - parcours international", sortOrder: 1280 },
  { code: "int-bac-2-sm", abbreviation: "2BAC-SM", nameAr: "الثانية باكالوريا علوم رياضية - دولي", nameFr: "2e Bac Sciences mathématiques (A et B) - parcours international", sortOrder: 1290 },
];
export const money = (amount: number) => new Intl.NumberFormat("fr-MA").format(amount) + " MAD";
export const formatBillingMonth = (month: string) =>
  new Intl.DateTimeFormat("ar-MA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
const currentDate = new Date();
export const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
export const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
export const currentYear = 2026;
export const normalizeMoroccoPhone = (phone: string) => phone.replace(/\s+/g, "").replace(/^0/, "+212");
