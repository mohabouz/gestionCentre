"use client";

import {
  Children,
  FormEvent,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  Check,
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CentmanShell,
  ConfirmDialog,
  PageTitle,
  Toast,
} from "@/components/centman-shell";
import {
  Attendance as AttendanceRecord,
  Course,
  Enrollment,
  Expense,
  Payment,
  Payout,
  Room,
  Session,
  Student,
  Teacher,
  currentMonth,
  money,
  normalizeMoroccoPhone,
  seedCourses,
  seedEnrollments,
  seedExpenses,
  seedPayments,
  seedPayouts,
  seedSessions,
  seedStudents,
  seedTeachers,
  today,
} from "@/lib/centman-store";
import { CourseManagement } from "@/components/course-management";
import { AppLanguage, useLanguage } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";

type Data = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  enrollments: Enrollment[];
  expenses: Expense[];
  payments: Payment[];
  sessions: Session[];
  payouts: Payout[];
  rooms: Room[];
  attendances: AttendanceRecord[];
};
type AdminUser = { id: number; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN"; active: boolean; createdAt: string };
const initial: Data = {
  students: [],
  teachers: [],
  courses: [],
  enrollments: [],
  expenses: [],
  payments: [],
  sessions: [],
  payouts: [],
  rooms: [],
  attendances: [],
};

export default function SectionPage() {
  const pathname = usePathname();
  const section = pathname.split("/")[1] || "students";
  const [data, setData] = useState<Data>(initial);
  const [toast, setToast] = useState("جاري تحميل البيانات...");
  const { user } = useAuth();
  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("database")),
      )
      .then((saved) => {
        setData({ ...initial, ...saved });
        setToast("");
      })
      .catch(() => setToast("تعذر تحميل البيانات من قاعدة البيانات"));
  }, []);
  const update = async (next: Data, message = "تم حفظ التغييرات") => {
    setData(next);
    try {
      const removedStudentIds = data.students
        .filter(
          (student) => !next.students.some((item) => item.id === student.id),
        )
        .map((student) => student.id);
      if (removedStudentIds.length) {
        const deletions = await Promise.all(
          removedStudentIds.map((id) =>
            fetch(`/api/students/${id}`, { method: "DELETE" }),
          ),
        );
        if (deletions.some((response) => !response.ok))
          throw new Error("delete");
        setToast(message);
        window.setTimeout(() => setToast(""), 2200);
        return;
      }
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
        cache: "no-store",
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      setToast(message);
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ البيانات في قاعدة البيانات",
      );
    }
    window.setTimeout(() => setToast(""), 2200);
  };
  const deleteStudent = async (id: number) => {
    const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("delete");
    const next = {
      ...data,
      students: data.students.filter((student) => student.id !== id),
      enrollments: data.enrollments.filter(
        (enrollment) => enrollment.studentId !== id,
      ),
      payments: data.payments.filter((payment) => payment.studentId !== id),
    };
    setData(next);
    setToast("تم حذف الطالب");
  };
  const restricted =
    user?.role === "ADMIN" &&
    [
      "expenses",
      "registrations",
      "payments",
      "late-students",
      "payouts",
      "settings",
    ].includes(section);
  const content = restricted ? (
    <Card>
      <div className="py-16 text-center">
        <p className="text-lg font-black text-[#17251f]">
          ليس لديك صلاحية للوصول إلى هذه الصفحة
        </p>
        <p className="mt-2 text-xs text-[#84938b]">
          هذه المعلومات متاحة للسوبر-أدمن فقط.
        </p>
      </div>
    </Card>
  ) : section === "students" ? (
    <Students data={data} update={update} deleteStudent={deleteStudent} />
  ) : section === "teachers" ? (
    <Teachers data={data} update={update} />
  ) : section === "courses" ? (
    <CourseManagement
      data={{
        students: data.students,
        teachers: data.teachers,
        courses: data.courses,
        enrollments: data.enrollments,
      }}
      update={(next, message) => update({ ...data, ...next }, message)}
    />
  ) : section === "expenses" ? (
    <Expenses data={data} update={update} />
  ) : section === "registrations" || section === "payments" ? (
    <Payments data={data} update={update} monthly={section === "payments"} />
  ) : section === "late-students" ? (
    <LateStudents data={data} update={update} />
  ) : section === "payouts" ? (
    <Payouts data={data} update={update} />
  ) : section === "schedule" ? (
    <Schedule data={data} update={update} />
  ) : section === "attendance" ? (
    <Attendance data={data} update={update} />
  ) : (
    <SettingsPage />
  );
  return (
    <CentmanShell>
      <div className="mx-auto max-w-[1450px]">{content}</div>
      <Toast message={toast} />
    </CentmanShell>
  );
}

type Props = {
  data: Data;
  update: (data: Data, message?: string) => void;
  deleteStudent?: (id: number) => Promise<void>;
};
function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#15231d]/30 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <h3 className="text-lg font-black text-[#17251f]">{title}</h3>
          <button onClick={onClose} className="text-[#84938b]">
            <X size={19} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pl-1">{children}</div>
        {footer && (
          <div className="mt-5 flex shrink-0 justify-end gap-2 border-t border-[#e5e5e5] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-right">
      <span className="mb-2 block text-xs font-bold text-[#64786c]">
        {label}
      </span>
      <input
        required={type !== "search"}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none focus:border-[#00a060]"
      />
    </label>
  );
}
function Table({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  const headerItems: React.ReactNode[] = [];
  let rowStart = 0;
  while (rowStart < items.length) {
    const item = items[rowStart];
    if (!isValidElement(item) || item.type !== Th) break;
    headerItems.push(item);
    rowStart += 1;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-right text-xs">
        <thead>
          <tr className="border-b border-[#e9efeb] text-[#96a69d]">
            {headerItems}
          </tr>
        </thead>
        <tbody>{items.slice(rowStart)}</tbody>
      </table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[#eef3ef] px-4 py-4 text-[#4b6054] ${className}`}
    >
      {children}
    </td>
  );
}
function Actions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      {confirming && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء."
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete?.();
          }}
        />
      )}
      <div className="flex gap-2">
        {onEdit && (
          <button
            aria-label="تعديل"
            onClick={onEdit}
            className="rounded-lg bg-[#eff8f2] p-2 text-[#00a060]"
          >
            <Edit3 size={14} />
          </button>
        )}
        {onDelete && (
          <button
            aria-label="حذف"
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-[#fff0ee] p-2 text-[#d56558]"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </>
  );
}
function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-[#92a29a]">{text}</div>;
}
function ReceiptActions({
  payment,
  whatsapp,
}: {
  payment: Payment;
  whatsapp?: string;
}) {
  const message = `وصل أداء ${payment.student} - ${money(payment.amount)} - ${payment.month} - رقم الوصل ${payment.receiptNumber || "غير متوفر"}`;
  const printReceipt = () => {
    const receipt = window.open("", "_blank", "width=480,height=640");
    if (!receipt) return;
    receipt.document.write(
      `<html dir="rtl"><head><title>وصل ${payment.receiptNumber || "الدفع"}</title><style>body{font-family:Tahoma,sans-serif;padding:32px;color:#292929}h1{color:#5054c0}hr{border:0;border-top:1px solid #e5e5e5;margin:24px 0}.row{display:flex;justify-content:space-between;padding:10px 0}</style></head><body><h1>CentMan</h1><p>وصل أداء مالي</p><hr/><div class="row"><b>الطالب</b><span>${payment.student}</span></div><div class="row"><b>الشهر</b><span>${payment.month}</span></div><div class="row"><b>المبلغ</b><span>${money(payment.amount)}</span></div><div class="row"><b>طريقة الدفع</b><span>${payment.method || "غير محددة"}</span></div><div class="row"><b>رقم الوصل</b><span>${payment.receiptNumber || "غير متوفر"}</span></div><div class="row"><b>التاريخ</b><span>${payment.date}</span></div><hr/><p>شكراً لثقتكم بمركز CentMan</p><script>window.print();</script></body></html>`,
    );
    receipt.document.close();
  };
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={printReceipt}
        className="rounded-lg bg-[#e4e8fd] px-2 py-1 text-[10px] font-bold text-[#4343b3]"
      >
        طباعة الوصل
      </button>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace("+", "")}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]"
        >
          واتساب
        </a>
      )}
    </div>
  );
}

function Students({ data, update }: Props) {
  const [query, setQuery] = useState("");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const enrolledCourseNames = (studentId: number) =>
    data.enrollments
      .filter(
        (enrollment) =>
          enrollment.studentId === studentId && enrollment.status === "نشط",
      )
      .map(
        (enrollment) =>
          data.courses.find((course) => course.id === enrollment.courseId)
            ?.name,
      )
      .filter((name): name is string => Boolean(name));
  const courseLabel = (student: Student) => {
    const enrolled = enrolledCourseNames(student.id);
    return enrolled.length ? enrolled.join(" • ") : student.course;
  };
  const filtered = data.students.filter((student) => {
    const matchesQuery = `${student.name} ${student.phone} ${courseLabel(student)}`.includes(query);
    const matchesEnrollment =
      enrollmentFilter === "all" ||
      data.enrollments.some(
        (enrollment) =>
          enrollment.studentId === student.id &&
          enrollment.courseId === Number(enrollmentFilter) &&
          enrollment.status === "نشط",
      );
    return matchesQuery && matchesEnrollment;
  });
  const save = (
    student: Student,
    courseIds: number[],
    paidAmounts: { annual: number; courses: Record<number, number> },
  ) => {
    const id = student.id || Date.now();
    const existingStudent = data.students.find((item) => item.id === id);
    const active = data.enrollments.filter(
      (enrollment) =>
        enrollment.studentId === id && enrollment.status === "نشط",
    );
    const ended = data.enrollments.map((enrollment) =>
      active.some((item) => item.id === enrollment.id) &&
        !courseIds.includes(enrollment.courseId)
        ? { ...enrollment, status: "منتهية" as const, removedAt: today }
        : enrollment,
    );
    const additions = courseIds
      .filter(
        (courseId) =>
          !active.some((enrollment) => enrollment.courseId === courseId),
      )
      .map((courseId) => ({
        id: Date.now() + courseId,
        studentId: id,
        courseId,
        enrolledAt: today,
        status: "نشط" as const,
        source: student.id ? ("إضافة" as const) : ("اشتراك أول" as const),
      }));
    const updatedStudent = {
      ...student,
      id,
      course:
        data.courses.find((course) => course.id === courseIds[0])?.name ||
        student.course,
    };
    const students = student.id
      ? data.students.map((item) => (item.id === id ? updatedStudent : item))
      : [...data.students, updatedStudent];
    const yearChanged = Boolean(
      existingStudent &&
      student.subscriptionYear &&
      student.subscriptionYear !== existingStudent.subscriptionYear,
    );
    const charges =
      !student.id || yearChanged
        ? [
          {
            label: `رسوم الاشتراك ${student.subscriptionYear || 2026}`,
            total: student.enrollmentFee || 0,
            paid: paidAmounts.annual,
          },
          ...(!student.id
            ? courseIds.map((courseId) => {
              const course = data.courses.find(
                (item) => item.id === courseId,
              );
              return {
                label: `${course?.type || "المادة"}: ${course?.name || "تسجيل"}`,
                total: course?.price || 0,
                paid: paidAmounts.courses[courseId] || 0,
              };
            })
            : []),
        ]
        : [];
    const registrationPayments = charges
      .filter((charge) => charge.total > 0)
      .map((charge, index): Payment => {
        const paid = Math.max(0, Math.min(charge.paid, charge.total));
        return {
          id: Date.now() + index,
          studentId: id,
          student: student.name,
          amount: paid,
          totalAmount: charge.total,
          month: charge.label,
          status: paid === charge.total ? "مدفوع" : paid > 0 ? "جزئي" : "متأخر",
          date: today,
          method: paid > 0 ? "نقدي" : undefined,
          receiptNumber:
            paid > 0
              ? `REC-${today.replaceAll("-", "")}-${String(id).slice(-4)}-${index + 1}`
              : undefined,
        };
      });
    const due = charges.reduce(
      (sum, charge) =>
        sum + Math.max(0, charge.total - Math.min(charge.paid, charge.total)),
      0,
    );
    update(
      {
        ...data,
        students: students.map((item) =>
          item.id === id && !student.id
            ? {
              ...item,
              due,
              lastPayment: registrationPayments.some(
                (payment) => payment.amount > 0,
              )
                ? today
                : "",
            }
            : item,
        ),
        enrollments: [...ended, ...additions],
        payments: registrationPayments.length
          ? [...data.payments, ...registrationPayments]
          : data.payments,
      },
      student.id
        ? "تم حفظ بيانات الطالب وتحديث التسجيلات"
        : "تم حفظ الطالب وتسجيل الدفعات",
    );
  };
  return (
    <>
      <PageTitle
        eyebrow="إدارة الطلاب"
        title="الطلاب"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={15} className="ml-2 inline" />
            اشتراك طالب
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
          <div>
            <p className="text-sm font-black text-[#17251f]">قائمة الطلاب</p>
            <p className="mt-1 text-xs text-[#94a49b]">
              {data.students.length} طالب مسجل في المركز
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={enrollmentFilter}
              onChange={(event) => setEnrollmentFilter(event.target.value)}
              className="rounded-xl border border-[#dce7df] bg-white px-3 py-2 text-xs text-[#64786c] outline-none"
            >
              <option value="all">كل التسجيلات</option>
              {data.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] px-3 text-[#9aaba1]">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-48 bg-transparent py-2 text-xs outline-none"
                placeholder="ابحث عن طالب..."
              />
            </div>
          </div>
        </div>
        <Table>
          <Th>الطالب</Th>
          <Th>واتساب</Th>
          <Th>الدورة</Th>
          <Th>الحالة</Th>
          <Th>المستحقات</Th>
          <Th>إجراء</Th>
          {filtered.map((student) => (
            <tr key={student.id}>
              <Td>
                <button
                  onClick={() => setHistoryStudent(student)}
                  className="font-bold text-[#5054c0] hover:underline"
                >
                  {student.name}
                </button>
              </Td>
              <Td>{student.whatsapp || student.phone}</Td>
              <Td>{courseLabel(student) || "غير مسجل"}</Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${student.status === "نشط" ? "bg-[#e4e8fd] text-[#3a3b9b]" : "bg-[#f1f1f1] text-[#6c6c6c]"}`}
                >
                  {student.status}
                </span>
              </Td>
              <Td
                className={
                  student.due ? "font-bold text-[#d56558]" : "text-[#5054c0]"
                }
              >
                {student.due ? money(student.due) : "مسدد"}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  {student.due > 0 && (
                    <button
                      onClick={() => setPaymentStudent(student)}
                      className="rounded-lg bg-[#e9f8ef] px-2 py-1 text-[10px] font-bold text-[#008a55]"
                    >
                      دفعة
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryStudent(student)}
                    className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]"
                  >
                    السجل
                  </button>
                  <Actions
                    onEdit={() => {
                      setEditing(student);
                      setOpen(true);
                    }}
                    onDelete={() =>
                      update(
                        {
                          ...data,
                          students: data.students.filter(
                            (s) => s.id !== student.id,
                          ),
                        },
                        "تم حذف الطالب",
                      )
                    }
                  />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!filtered.length && <EmptyState text="لا توجد نتائج" />}
      </Card>
      {open && (
        <StudentEnrollmentForm
          student={editing}
          courses={data.courses}
          enrollments={data.enrollments}
          onClose={() => setOpen(false)}
          onSave={(student, courseIds, paidAmounts) => {
            save(student, courseIds, paidAmounts);
            setOpen(false);
          }}
        />
      )}
      {historyStudent && (
        <StudentHistory
          student={historyStudent}
          courseLabel={courseLabel(historyStudent)}
          payments={data.payments.filter(
            (payment) => payment.studentId === historyStudent.id,
          )}
          enrollments={data.enrollments.filter(
            (enrollment) => enrollment.studentId === historyStudent.id,
          )}
          courses={data.courses}
          onClose={() => setHistoryStudent(null)}
        />
      )}
      {paymentStudent && (
        <StudentPaymentModal
          student={paymentStudent}
          onClose={() => setPaymentStudent(null)}
          onSave={(amount) => {
            const paid = Math.min(amount, paymentStudent.due);
            if (paid <= 0) return;
            const payment: Payment = {
              id: Date.now(),
              studentId: paymentStudent.id,
              student: paymentStudent.name,
              amount: paid,
              totalAmount: paid,
              month: "دفعة إضافية",
              status: "مدفوع",
              date: today,
              method: "نقدي",
              receiptNumber: `REC-${today.replaceAll("-", "")}-${String(paymentStudent.id).slice(-4)}-${String(Date.now()).slice(-4)}`,
            };
            update(
              {
                ...data,
                payments: [...data.payments, payment],
                students: data.students.map((student) =>
                  student.id === paymentStudent.id
                    ? {
                      ...student,
                      due: Math.max(0, student.due - paid),
                      lastPayment: today,
                    }
                    : student,
                ),
              },
              "تم تسجيل الدفعة",
            );
            setPaymentStudent(null);
          }}
        />
      )}
    </>
  );
}

function StudentPaymentModal({
  student,
  onClose,
  onSave,
}: {
  student: Student;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(String(student.due));
  return (
    <Modal title={`إضافة دفعة: ${student.name}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(Number(amount));
        }}
        className="space-y-4"
      >
        <p className="text-xs text-[#6c6c6c]">
          المتبقي: {money(student.due)}
        </p>
        <Input
          label={`المبلغ المدفوع (الحد الأقصى ${money(student.due)})`}
          type="number"
          value={amount}
          onChange={setAmount}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={Number(amount) <= 0}>
            تسجيل الدفعة
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StudentHistory({
  student,
  courseLabel,
  payments,
  enrollments,
  courses,
  onClose,
}: {
  student: Student;
  courseLabel: string;
  payments: Payment[];
  enrollments: Enrollment[];
  courses: Course[];
  onClose: () => void;
}) {
  return (
    <Modal title={`السجل الكامل: ${student.name}`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-[#f5f7ff] p-4">
          <b>الاشتراك السنوي</b>
          <p className="mt-1 text-[#6c6c6c]">
            رسوم الاشتراك: {money(student.enrollmentFee || 0)} • الدورة الحالية: {""}
            {courseLabel || "غير مسجل"}
          </p>
          <p className="mt-1 text-[#6c6c6c]">
            رسوم الاشتراك: {money(student.enrollmentFee || 0)} • الدورة الحالية:{" "}
            {student.course}
          </p>
        </div>
        <div>
          <b className="mb-2 block">تاريخ التسجيلات</b>
          {enrollments.length ? (
            enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="mb-2 flex items-center justify-between rounded-xl border border-[#e5e5e5] p-3"
              >
                <span>
                  {courses.find((course) => course.id === enrollment.courseId)
                    ?.name || "عنصر محذوف"}{" "}
                  • بدأ {enrollment.enrolledAt}
                  {enrollment.removedAt
                    ? ` • انتهى ${enrollment.removedAt}`
                    : ""}
                </span>
                <b
                  className={
                    enrollment.status === "نشط"
                      ? "text-[#5054c0]"
                      : "text-[#a08500]"
                  }
                >
                  {enrollment.status}
                </b>
              </div>
            ))
          ) : (
            <EmptyState text="لا توجد تسجيلات محفوظة" />
          )}
        </div>
        {payments.length ? (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-[#e5e5e5] p-4"
            >
              <span>
                {payment.month} • {payment.method || "طريقة غير محددة"}
              </span>
              <b
                className={
                  payment.status === "مدفوع"
                    ? "text-[#5054c0]"
                    : "text-[#a08500]"
                }
              >
                {money(payment.amount)} • {payment.status}
              </b>
            </div>
          ))
        ) : (
          <EmptyState text="لا توجد دفعات مسجلة" />
        )}
        <div className="rounded-xl bg-[#faf4de] p-4 font-bold text-[#a08500]">
          المتأخرات الحالية: {money(student.due)}
        </div>
      </div>
    </Modal>
  );
}
function StudentForm({
  student,
  courses,
  onClose,
  onSave,
}: {
  student: Student | null;
  courses: Course[];
  onClose: () => void;
  onSave: (student: Student) => void;
}) {
  const [form, setForm] = useState<Student>(
    student || {
      id: 0,
      name: "",
      phone: "+212",
      whatsapp: "+212",
      course: courses[0]?.name || "",
      status: "نشط",
      due: 0,
      lastPayment: today,
      enrollmentDate: today,
      enrollmentFee: 200,
    },
  );
  const field = (name: keyof Student) => (value: string) =>
    setForm({
      ...form,
      [name]:
        name === "due" || name === "enrollmentFee" ? Number(value) : value,
    });
  return (
    <Modal
      title={student ? "تعديل بيانات الطالب" : "اشتراك طالب مغربي"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            phone: normalizeMoroccoPhone(form.phone),
            whatsapp: normalizeMoroccoPhone(form.whatsapp || form.phone),
          });
        }}
        className="space-y-4"
      >
        <Input label="اسم الطالب" value={form.name} onChange={field("name")} />
        <Input
          label="رقم الهاتف المغربي"
          placeholder="+212 6 00 00 00 00"
          value={form.phone}
          onChange={field("phone")}
        />
        <Input
          label="رقم واتساب لإرسال الوصل"
          value={form.whatsapp || ""}
          onChange={field("whatsapp")}
        />
        <Input label="الدورة" value={form.course} onChange={field("course")} />
        <Input
          label="واجب التسجيل (MAD)"
          type="number"
          value={form.enrollmentFee || 0}
          onChange={field("enrollmentFee")}
        />
        <Input
          label="المبلغ المستحق (MAD)"
          type="number"
          value={form.due}
          onChange={field("due")}
        />
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit">حفظ الاشتراك</Button>
        </div>
      </form>
    </Modal>
  );
}

function StudentEnrollmentForm({
  student,
  courses,
  enrollments,
  onClose,
  onSave,
}: {
  student: Student | null;
  courses: Course[];
  enrollments: Enrollment[];
  onClose: () => void;
  onSave: (
    student: Student,
    courseIds: number[],
    paidAmounts: { annual: number; courses: Record<number, number> },
  ) => void;
}) {
  const activeIds = enrollments
    .filter(
      (enrollment) =>
        enrollment.studentId === student?.id && enrollment.status === "نشط",
    )
    .map((enrollment) => enrollment.courseId);
  const [form, setForm] = useState<Student>(
    student || {
      id: 0,
      name: "",
      phone: "+212",
      whatsapp: "+212",
      course: "",
      status: "نشط",
      due: 0,
      lastPayment: today,
      enrollmentDate: today,
      enrollmentFee: 200,
      subscriptionYear: 2026,
    },
  );
  const [courseIds, setCourseIds] = useState<number[]>(activeIds);
  const [annualPaid, setAnnualPaid] = useState(student?.enrollmentFee || 0);
  const [coursePaid, setCoursePaid] = useState<Record<number, number>>(() =>
    Object.fromEntries(activeIds.map((courseId) => [courseId, 0])),
  );
  const field = (name: keyof Student) => (value: string) =>
    setForm({
      ...form,
      [name]:
        name === "due" ||
          name === "enrollmentFee" ||
          name === "subscriptionYear"
          ? Number(value)
          : value,
    });
  const available = courses.filter((course) => !courseIds.includes(course.id));
  return (
    <Modal
      title={student ? "تعديل الطالب والتسجيلات" : "اشتراك أول للطالب"}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            form="student-enrollment-form"
            disabled={!form.name || !courseIds.length}
          >
            حفظ الطالب والتسجيلات
          </Button>
        </>
      }
    >
      <form
        id="student-enrollment-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name || !courseIds.length) return;
          onSave(
            {
              ...form,
              phone: normalizeMoroccoPhone(form.phone),
              whatsapp: normalizeMoroccoPhone(form.whatsapp || form.phone),
            },
            courseIds,
            { annual: annualPaid, courses: coursePaid },
          );
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="اسم الطالب"
            value={form.name}
            onChange={field("name")}
          />
          <Input
            label="رقم الهاتف المغربي"
            placeholder="+212 6 00 00 00 00"
            value={form.phone}
            onChange={field("phone")}
          />
        </div>
        <Input
          label="رقم واتساب لإرسال الوصل"
          value={form.whatsapp || ""}
          onChange={field("whatsapp")}
        />
        <label className="block text-right">
          <span className="mb-2 block text-xs font-bold text-[#6c6c6c]">
            حالة الطالب
          </span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as Student["status"],
              })
            }
            className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-sm outline-none focus:border-[#5054c0]"
          >
            <option value="نشط">نشط / Active</option>
            <option value="متوقف">متوقف / Inactive</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="رسوم الاشتراك السنوية (MAD)"
            type="number"
            value={form.enrollmentFee || 0}
            onChange={field("enrollmentFee")}
          />
          <Input
            label="سنة الاشتراك"
            type="number"
            value={form.subscriptionYear || 2026}
            onChange={field("subscriptionYear")}
          />
        </div>
        {!student && (
          <div className="rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-4">
            <p className="mb-3 text-xs font-black text-[#292929]">
              دفعة التسجيل السنوي
            </p>
            <Input
              label="المبلغ المدفوع الآن (MAD)"
              type="number"
              value={annualPaid}
              onChange={(value) => setAnnualPaid(Number(value))}
            />
            <p className="mt-2 text-[10px] text-[#6c6c6c]">
              المطلوب: {money(form.enrollmentFee || 0)} •{" "}
              {annualPaid >= (form.enrollmentFee || 0)
                ? "مدفوع بالكامل"
                : annualPaid > 0
                  ? "دفع جزئي"
                  : "لم يدفع"}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#292929]">
                تسجيلات الطالب
              </p>
              <p className="mt-1 text-[10px] text-[#6c6c6c]">
                اختر مادة أو باقة أو أكثر
              </p>
            </div>
            <button
              type="button"
              aria-label="إضافة تسجيل"
              disabled={!available.length}
              onClick={() => setCourseIds([...courseIds, available[0].id])}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5054c0] text-white disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          {courseIds.map((courseId, index) => (
            <div
              key={`${courseId}-${index}`}
              className="mb-2 flex items-center gap-2"
            >
              <select
                value={courseId}
                onChange={(event) =>
                  setCourseIds(
                    courseIds.map((id, itemIndex) =>
                      itemIndex === index ? Number(event.target.value) : id,
                    ),
                  )
                }
                className="flex-1 rounded-lg border border-[#e5e5e5] bg-white p-2.5 text-xs"
              >
                {courses
                  .filter(
                    (course) =>
                      course.id === courseId || !courseIds.includes(course.id),
                  )
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} • {course.type} • {money(course.price)}
                    </option>
                  ))}
              </select>
              {!student && (
                <div className="w-36">
                  <Input
                    label="المدفوع الآن"
                    type="number"
                    value={coursePaid[courseId] || 0}
                    onChange={(value) =>
                      setCoursePaid({
                        ...coursePaid,
                        [courseId]: Number(value),
                      })
                    }
                  />
                </div>
              )}
              <button
                type="button"
                aria-label="إزالة التسجيل"
                onClick={() =>
                  setCourseIds(
                    courseIds.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#faf4de] text-[#a08500]"
              >
                <MinusIcon />
              </button>
            </div>
          ))}
          {!courseIds.length && (
            <p className="text-xs text-[#a08500]">
              أضف تسجيلًا واحدًا على الأقل قبل الحفظ.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

function MinusIcon() {
  return <span className="text-lg leading-none">−</span>;
}

function Teachers({ data, update }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    commission: "60",
  });
  const save = (e: FormEvent) => {
    e.preventDefault();
    const teacher: Teacher = {
      id: editing?.id || Date.now(),
      name: form.name,
      specialty: form.specialty,
      commission: Number(form.commission),
      students: editing?.students || 0,
      sessions: editing?.sessions || 0,
    };
    update(
      {
        ...data,
        teachers: editing
          ? data.teachers.map((t) => (t.id === editing.id ? teacher : t))
          : [...data.teachers, teacher],
      },
      "تم حفظ الأستاذ",
    );
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="إدارة الفريق"
        title="الأساتذة"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: "", specialty: "", commission: "60" });
              setOpen(true);
            }}
          >
            <Plus size={15} className="ml-2 inline" />
            إضافة أستاذ
          </Button>
        }
      />
      <Card>
        <Table>
          <Th>الأستاذ</Th>
          <Th>التخصص</Th>
          <Th>العمولة</Th>
          <Th>الطلاب</Th>
          <Th>الحصص</Th>
          <Th>إجراء</Th>
          {data.teachers.map((t) => (
            <tr key={t.id}>
              <Td>
                <b>{t.name}</b>
              </Td>
              <Td>{t.specialty}</Td>
              <Td>{t.commission}%</Td>
              <Td>{t.students}</Td>
              <Td>{t.sessions}</Td>
              <Td>
                <Actions
                  onEdit={() => {
                    setEditing(t);
                    setForm({
                      name: t.name,
                      specialty: t.specialty,
                      commission: String(t.commission),
                    });
                    setOpen(true);
                  }}
                  onDelete={() =>
                    update(
                      {
                        ...data,
                        teachers: data.teachers.filter((x) => x.id !== t.id),
                      },
                      "تم حذف الأستاذ",
                    )
                  }
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {open && (
        <Modal
          title={editing ? "تعديل الأستاذ" : "إضافة أستاذ"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save} className="space-y-4">
            <Input
              label="الاسم"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Input
              label="التخصص"
              value={form.specialty}
              onChange={(v) => setForm({ ...form, specialty: v })}
            />
            <Input
              label="نسبة العمولة %"
              type="number"
              value={form.commission}
              onChange={(v) => setForm({ ...form, commission: v })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Courses({ data, update }: Props) {
  const [tab, setTab] = useState<"مادة" | "باقة">("مادة");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", teacher: "", price: "" });
  const save = (e: FormEvent) => {
    e.preventDefault();
    update(
      {
        ...data,
        courses: [
          ...data.courses,
          {
            id: Date.now(),
            name: form.name,
            teacher: form.teacher,
            price: Number(form.price),
            type: tab,
            enrolled: 0,
          },
        ],
      },
      "تمت إضافة الدورة",
    );
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="البرامج التعليمية"
        title="الدورات والباقات"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            إضافة {tab}
          </Button>
        }
      />
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab("مادة")}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold ${tab === "مادة" ? "bg-[#17251f] text-white" : "bg-white text-[#71857a]"}`}
        >
          المواد
        </button>
        <button
          onClick={() => setTab("باقة")}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold ${tab === "باقة" ? "bg-[#17251f] text-white" : "bg-white text-[#71857a]"}`}
        >
          الباقات
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.courses
          .filter((c) => c.type === tab)
          .map((c) => (
            <Card key={c.id}>
              <div className="mb-5 flex items-start justify-between">
                <span className="rounded-lg bg-[#e9f8ef] px-2 py-1 text-[10px] font-bold text-[#008a55]">
                  {c.type}
                </span>
                <Actions
                  onDelete={() =>
                    update(
                      {
                        ...data,
                        courses: data.courses.filter((x) => x.id !== c.id),
                      },
                      "تم حذف الدورة",
                    )
                  }
                />
              </div>
              <h3 className="text-lg font-black text-[#17251f]">{c.name}</h3>
              <p className="mt-2 text-xs text-[#8b9b92]">
                {c.teacher || "لم يحدد أستاذ"}
              </p>
              <div className="mt-5 flex justify-between border-t border-[#edf2ee] pt-4 text-xs">
                <span>{c.enrolled} طالب</span>
                <b className="text-[#00a060]">{money(c.price)}</b>
              </div>
            </Card>
          ))}
      </div>
      {!data.courses.filter((c) => c.type === tab).length && (
        <Card>
          <EmptyState text="لا توجد دورات من هذا النوع" />
        </Card>
      )}
      {open && (
        <Modal title={`إضافة ${tab}`} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="الاسم"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Input
              label="الأستاذ"
              value={form.teacher}
              onChange={(v) => setForm({ ...form, teacher: v })}
            />
            <Input
              label="السعر"
              type="number"
              value={form.price}
              onChange={(v) => setForm({ ...form, price: v })}
            />
            <div className="flex justify-end">
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Payments({ data, update, monthly }: Props & { monthly: boolean }) {
  const [query, setQuery] = useState("");
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const record = (payment: Payment) => {
    const receiptNumber = `REC-${today.replaceAll("-", "")}-${String(Date.now()).slice(-4)}`;
    const updatedPayments = data.payments.map((p) =>
      p.id === payment.id
        ? {
          ...p,
          amount: p.totalAmount ?? p.amount,
          status: "مدفوع" as const,
          date: today,
          method: "نقدي" as const,
          receiptNumber,
        }
        : p,
    );
    update(
      {
        ...data,
        payments: updatedPayments,
        students: data.students.map((s) =>
          s.id === payment.studentId
            ? {
              ...s,
              due: updatedPayments
                .filter((p) => p.studentId === s.id)
                .reduce(
                  (sum, p) =>
                    sum + Math.max(0, (p.totalAmount ?? p.amount) - p.amount),
                  0,
                ),
              lastPayment: today,
            }
            : s,
        ),
      },
      "تم تسجيل الدفعة وإصدار الوصل",
    );
  };
  const returnToDraft = (payment: Payment) => {
    const updatedPayments = data.payments.map((item) =>
      item.id === payment.id
        ? {
          ...item,
          amount: 0,
          status: "مسودة" as const,
          date: "",
          method: undefined,
          receiptNumber: undefined,
        }
        : item,
    );
    update(
      {
        ...data,
        payments: updatedPayments,
        students: data.students.map((student) =>
          student.id === payment.studentId
            ? {
              ...student,
              due: updatedPayments
                .filter((item) => item.studentId === student.id)
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.max(
                      0,
                      (item.totalAmount ?? item.amount) - item.amount,
                    ),
                  0,
                ),
              lastPayment:
                updatedPayments
                  .filter(
                    (item) =>
                      item.studentId === student.id && item.amount > 0,
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
                "",
            }
            : student,
        ),
      },
      "تمت إعادة الدفعة إلى مسودة",
    );
  };
  const revisePayment = (payment: Payment, amount: number) => {
    const paid = Math.max(
      0,
      Math.min(amount, payment.totalAmount ?? payment.amount),
    );
    const updatedPayments = data.payments.map((item) =>
      item.id === payment.id
        ? {
          ...item,
          amount: paid,
          status:
            paid === (item.totalAmount ?? item.amount)
              ? ("مدفوع" as const)
              : paid > 0
                ? ("جزئي" as const)
                : ("مسودة" as const),
          date: paid > 0 ? today : "",
          method: paid > 0 ? item.method || ("نقدي" as const) : undefined,
          receiptNumber:
            paid > 0
              ? item.receiptNumber ||
              `REC-${today.replaceAll("-", "")}-${String(item.id).slice(-4)}`
              : undefined,
        }
        : item,
    );
    update(
      {
        ...data,
        payments: updatedPayments,
        students: data.students.map((student) =>
          student.id === payment.studentId
            ? {
              ...student,
              due: updatedPayments
                .filter(
                  (item) =>
                    item.studentId === student.id && item.status !== "ملغاة",
                )
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.max(
                      0,
                      (item.totalAmount ?? item.amount) - item.amount,
                    ),
                  0,
                ),
              lastPayment:
                updatedPayments
                  .filter(
                    (item) =>
                      item.studentId === student.id && item.amount > 0,
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
                "",
            }
            : student,
        ),
      },
      "تم تعديل الدفعة",
    );
    setEditingPayment(null);
  };
  const cancelDraft = (payment: Payment) =>
    update(
      {
        ...data,
        payments: data.payments.map((item) =>
          item.id === payment.id
            ? {
              ...item,
              amount: 0,
              status: "ملغاة" as const,
              date: "",
              method: undefined,
              receiptNumber: undefined,
            }
            : item,
        ),
      },
      "تم إلغاء مسودة الدفعة",
    );
  const payments = data.payments.filter((p) => p.student.includes(query));
  const activePayments = payments.filter((p) => p.status !== "ملغاة");
  const total = activePayments.reduce(
    (sum, p) => sum + (p.totalAmount ?? p.amount),
    0,
  );
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title={monthly ? "الدفوعات الشهرية" : "التسجيلات والدفوعات"}
        action={
          <div className="flex items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-3 text-[#9aaba1]">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-44 bg-transparent py-2 text-xs outline-none"
              placeholder="ابحث..."
            />
          </div>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-[#899a90]">المبلغ الإجمالي</p>
          <b className="mt-2 block text-xl text-[#17251f]">{money(total)}</b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">المدفوع</p>
          <b className="mt-2 block text-xl text-[#00a060]">
            {money(activePayments.reduce((s, p) => s + p.amount, 0))}
          </b>
        </Card>
        <Card>
          <p className="text-xs text-[#899a90]">المتبقي</p>
          <b className="mt-2 block text-xl text-[#d56558]">
            {money(
              activePayments.reduce(
                (sum, p) =>
                  sum + Math.max(0, (p.totalAmount ?? p.amount) - p.amount),
                0,
              ),
            )}
          </b>
        </Card>
      </div>
      <Card>
        <Table>
          <Th>الطالب</Th>
          <Th>الشهر</Th>
          <Th>المدفوع / الإجمالي</Th>
          <Th>الحالة</Th>
          <Th>طريقة الدفع</Th>
          <Th>إجراء</Th>
          {payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <b>{p.student}</b>
              </Td>
              <Td>{p.month}</Td>
              <Td>
                {money(p.amount)} / {money(p.totalAmount ?? p.amount)}
              </Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status === "مدفوع" ? "bg-[#e9f8ef] text-[#008a55]" : p.status === "مسودة" ? "bg-[#eef4ff] text-[#4c73c8]" : p.status === "ملغاة" ? "bg-[#f1f1f1] text-[#8a8a8a]" : p.status === "جزئي" ? "bg-[#faf4de] text-[#a08500]" : "bg-[#fff0ee] text-[#d56558]"}`}
                >
                  {p.status}
                </span>
              </Td>
              <Td>{p.method || "-"}</Td>
              <Td>
                {p.status === "مدفوع" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingPayment(p)}
                    >
                      تعديل
                    </Button>
                    <ReceiptActions
                      payment={p}
                      whatsapp={
                        data.students.find(
                          (student) => student.id === p.studentId,
                        )?.whatsapp ||
                        data.students.find(
                          (student) => student.id === p.studentId,
                        )?.phone
                      }
                    />
                    <Button variant="outline" onClick={() => returnToDraft(p)}>
                      إرجاع لمسودة
                    </Button>
                  </div>
                ) : p.status === "مسودة" ? (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => record(p)}>تسجيل الدفع</Button>
                    <Button variant="danger" onClick={() => cancelDraft(p)}>
                      إلغاء المسودة
                    </Button>
                  </div>
                ) : p.status === "ملغاة" ? (
                  <span className="text-[10px] text-[#8a8a8a]">
                    لا توجد إجراءات
                  </span>
                ) : (
                  <Button onClick={() => record(p)}>تسجيل الدفع</Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {editingPayment && (
        <PaymentRevisionModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={(amount) => revisePayment(editingPayment, amount)}
        />
      )}
    </>
  );
}

function PaymentRevisionModal({
  payment,
  onClose,
  onSave,
}: {
  payment: Payment;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  return (
    <Modal title="تعديل الدفعة" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(Number(amount));
        }}
        className="space-y-4"
      >
        <p className="text-xs text-[#6c6c6c]">
          {payment.student} • {payment.month}
        </p>
        <Input
          label={`المبلغ المدفوع (الحد الأقصى ${money(payment.totalAmount ?? payment.amount)})`}
          type="number"
          value={amount}
          onChange={setAmount}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit">حفظ التعديل</Button>
        </div>
      </form>
    </Modal>
  );
}

function Expenses({ data, update }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", amount: "" });
  const save = (e: FormEvent) => {
    e.preventDefault();
    update(
      {
        ...data,
        expenses: [
          ...data.expenses,
          {
            id: Date.now(),
            title: form.title,
            category: form.category,
            amount: Number(form.amount),
            date: today,
          },
        ],
      },
      "تمت إضافة المصروف",
    );
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="المصاريف"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            إضافة مصروف
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex justify-between">
          <div>
            <p className="text-sm font-black">مصروفات الشهر</p>
            <p className="mt-1 text-xs text-[#8d9e95]">
              الإجمالي: {money(data.expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
        </div>
        <Table>
          <Th>الوصف</Th>
          <Th>التصنيف</Th>
          <Th>المبلغ</Th>
          <Th>التاريخ</Th>
          <Th>إجراء</Th>
          {data.expenses.map((e) => (
            <tr key={e.id}>
              <Td>
                <b>{e.title}</b>
              </Td>
              <Td>{e.category}</Td>
              <Td className="font-bold text-[#d56558]">{money(e.amount)}</Td>
              <Td>{e.date}</Td>
              <Td>
                <Actions
                  onDelete={() =>
                    update(
                      {
                        ...data,
                        expenses: data.expenses.filter((x) => x.id !== e.id),
                      },
                      "تم حذف المصروف",
                    )
                  }
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {open && (
        <Modal title="إضافة مصروف" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="الوصف"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />
            <Input
              label="التصنيف"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
            <Input
              label="المبلغ"
              type="number"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
            />
            <div className="flex justify-end">
              <Button type="submit">حفظ المصروف</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function LateStudents({ data, update }: Props) {
  const late = data.students.filter((s) => s.due > 0);
  return (
    <>
      <PageTitle eyebrow="المتابعة" title="الطلاب المتأخرون" />
      <Card>
        <Table>
          <Th>الطالب</Th>
          <Th>الهاتف</Th>
          <Th>الدورة</Th>
          <Th>المستحق</Th>
          <Th>تواصل</Th>
          <Th>إجراء</Th>
          {late.map((s) => (
            <tr key={s.id}>
              <Td>
                <b>{s.name}</b>
              </Td>
              <Td>{s.phone}</Td>
              <Td>{s.course}</Td>
              <Td className="font-bold text-[#d56558]">{money(s.due)}</Td>
              <Td>
                <div className="flex gap-2">
                  <a
                    aria-label="واتساب"
                    href={`https://wa.me/213${s.phone.slice(1)}?text=${encodeURIComponent(`السلام عليكم، نذكركم بدفع مستحقات ${s.name}`)}`}
                    target="_blank"
                    className="rounded-lg bg-[#e9f8ef] p-2 text-[#00a060]"
                  >
                    <MessageCircle size={15} />
                  </a>
                  <a
                    aria-label="اتصال"
                    href={`tel:${s.phone}`}
                    className="rounded-lg bg-[#eef4ff] p-2 text-[#4c8ce8]"
                  >
                    <Phone size={15} />
                  </a>
                </div>
              </Td>
              <Td>
                <Button
                  onClick={() =>
                    update(
                      {
                        ...data,
                        students: data.students.map((x) =>
                          x.id === s.id
                            ? { ...x, due: 0, lastPayment: today }
                            : x,
                        ),
                        payments: data.payments.map((p) =>
                          p.studentId === s.id
                            ? {
                              ...p,
                              amount: p.totalAmount ?? p.amount,
                              status: "مدفوع" as const,
                              date: today,
                            }
                            : p,
                        ),
                      },
                      "تم تسجيل الدفع",
                    )
                  }
                >
                  دفع الآن
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
        {!late.length && <EmptyState text="لا توجد مستحقات متأخرة" />}
      </Card>
    </>
  );
}

function Payouts({ data, update }: Props) {
  const [reportTeacher, setReportTeacher] = useState<Teacher | null>(null);
  const month = currentMonth;
  const enrollmentSubjects = (course: Course) =>
    course.type === "باقة"
      ? (course.subjectIds || [])
        .map((subjectId) =>
          data.courses.find((item) => item.id === subjectId),
        )
        .filter((subject): subject is Course => Boolean(subject))
      : [course];
  const teacherMetrics = (teacher: Teacher) => {
    const rows = data.enrollments.flatMap((enrollment) => {
      const course = data.courses.find(
        (item) => item.id === enrollment.courseId,
      );
      if (!course || enrollment.status !== "نشط") return [];
      const subjects = enrollmentSubjects(course);
      const allocatedPrice =
        course.type === "باقة" && subjects.length
          ? course.price / subjects.length
          : course.price;
      return subjects
        .filter((subject) => subject.teacher === teacher.name)
        .map((subject) => ({
          studentId: enrollment.studentId,
          revenue: allocatedPrice,
        }));
    });
    const students = new Set(rows.map((row) => row.studentId));
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    return { studentCount: students.size, revenue };
  };
  const buildPayout = (teacher: Teacher) => {
    const existing = data.payouts.find(
      (p) => p.teacherId === teacher.id && p.month === month,
    );
    if (existing) return;
    const { studentCount, revenue } = teacherMetrics(teacher);
    update(
      {
        ...data,
        payouts: [
          ...data.payouts,
          {
            id: Date.now(),
            teacherId: teacher.id,
            teacher: teacher.name,
            month,
            studentCount,
            revenue,
            commission: teacher.commission,
            amount: Math.round((revenue * teacher.commission) / 100),
            status: "مسودة",
          },
        ],
      },
      "تم إنشاء مسودة الراتب",
    );
  };
  const pay = (payout: Payout) =>
    update(
      {
        ...data,
        payouts: data.payouts.map((p) =>
          p.id === payout.id ? { ...p, status: "مدفوعة", paidAt: today } : p,
        ),
      },
      "تم اعتماد وصرف الراتب",
    );
  const returnPayoutToDraft = (payout: Payout) =>
    update(
      {
        ...data,
        payouts: data.payouts.map((item) =>
          item.id === payout.id
            ? { ...item, status: "مسودة" as const, paidAt: undefined }
            : item,
        ),
      },
      "تمت إعادة الراتب إلى مسودة",
    );
  const cancelPayoutDraft = (payout: Payout) =>
    update(
      {
        ...data,
        payouts: data.payouts.map((item) =>
          item.id === payout.id
            ? { ...item, status: "ملغاة" as const, paidAt: undefined }
            : item,
        ),
      },
      "تم إلغاء مسودة الراتب",
    );
  const restorePayoutDraft = (payout: Payout) =>
    update(
      {
        ...data,
        payouts: data.payouts.map((item) =>
          item.id === payout.id
            ? { ...item, status: "مسودة" as const, paidAt: undefined }
            : item,
        ),
      },
      "تمت إعادة الراتب الملغى إلى مسودة للمراجعة",
    );
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="رواتب الأساتذة"
        action={
          <span className="rounded-xl bg-[#faf4de] px-4 py-2.5 text-xs font-bold text-[#a08500]">
            الشهر: {month}
          </span>
        }
      />
      <Card>
        <p className="mb-5 text-xs text-[#6c6c6c]">
          أنشئ مسودة لكل أستاذ، راجع التقرير التفصيلي، ثم اعتمد الصرف يدوياً.
        </p>
        <Table>
          <Th>الأستاذ</Th>
          <Th>الحصص</Th>
          <Th>الطلاب</Th>
          <Th>الإيراد</Th>
          <Th>العمولة</Th>
          <Th>المستحق</Th>
          <Th>إجراءات</Th>
          {data.teachers.map((t) => {
            const { studentCount, revenue } = teacherMetrics(t);
            const payout = data.payouts.find(
              (p) => p.teacherId === t.id && p.month === month,
            );
            return (
              <tr key={t.id}>
                <Td>
                  <button
                    onClick={() => setReportTeacher(t)}
                    className="font-bold text-[#5054c0] hover:underline"
                  >
                    {t.name}
                  </button>
                </Td>
                <Td>{t.sessions}</Td>
                <Td>{studentCount}</Td>
                <Td>{money(revenue)}</Td>
                <Td>{t.commission}%</Td>
                <Td className="font-black text-[#5054c0]">
                  {money(Math.round((revenue * t.commission) / 100))}
                </Td>
                <Td>
                  {payout ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${payout.status === "مدفوعة" ? "bg-[#e4e8fd] text-[#3a3b9b]" : payout.status === "ملغاة" ? "bg-[#f1f1f1] text-[#8a8a8a]" : "bg-[#faf4de] text-[#a08500]"}`}
                      >
                        {payout.status}
                      </span>
                      {payout.status === "مسودة" && (
                        <>
                          <Button onClick={() => pay(payout)}>
                            اعتماد نهائي
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => cancelPayoutDraft(payout)}
                          >
                            إلغاء المسودة
                          </Button>
                        </>
                      )}
                      {payout.status === "مدفوعة" && (
                        <Button
                          variant="outline"
                          onClick={() => returnPayoutToDraft(payout)}
                        >
                          إرجاع لمسودة
                        </Button>
                      )}
                      {payout.status === "ملغاة" && (
                        <Button
                          variant="outline"
                          onClick={() => restorePayoutDraft(payout)}
                        >
                          إعادة للمراجعة
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button onClick={() => buildPayout(t)}>
                      إنشاء المسودة
                    </Button>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <Card className="mt-5">
        <h3 className="mb-4 font-black text-[#292929]">سجل الأشهر السابقة</h3>
        {data.payouts.length ? (
          <Table>
            <Th>الأستاذ</Th>
            <Th>الشهر</Th>
            <Th>الطلاب</Th>
            <Th>المستحق</Th>
            <Th>الحالة</Th>
            {data.payouts.map((p) => (
              <tr key={p.id}>
                <Td>{p.teacher}</Td>
                <Td>{p.month}</Td>
                <Td>{p.studentCount}</Td>
                <Td>{money(p.amount)}</Td>
                <Td>
                  {p.status}
                  {p.paidAt ? ` • ${p.paidAt}` : ""}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState text="لم يتم اعتماد رواتب سابقة بعد" />
        )}
      </Card>
      {reportTeacher && (
        <TeacherReport
          teacher={reportTeacher}
          data={data}
          onClose={() => setReportTeacher(null)}
        />
      )}
    </>
  );
}

function TeacherReport({
  teacher,
  data,
  onClose,
}: {
  teacher: Teacher;
  data: Data;
  onClose: () => void;
}) {
  const enrollmentSubjects = (course: Course) =>
    course.type === "باقة"
      ? (course.subjectIds || [])
        .map((subjectId) =>
          data.courses.find((item) => item.id === subjectId),
        )
        .filter((subject): subject is Course => Boolean(subject))
      : [course];
  const rows = data.enrollments
    .flatMap((enrollment) => {
      const course = data.courses.find(
        (item) => item.id === enrollment.courseId,
      );
      if (!course || enrollment.status !== "نشط") return [];
      const subjects = enrollmentSubjects(course);
      const allocatedPrice =
        course.type === "باقة" && subjects.length
          ? course.price / subjects.length
          : course.price;
      return subjects
        .filter((subject) => subject.teacher === teacher.name)
        .map((subject) => ({
          student: data.students.find(
            (item) => item.id === enrollment.studentId,
          ),
          course,
          subject,
          allocatedPrice,
        }));
    })
    .filter(
      (
        row,
      ): row is {
        student: Student;
        course: Course;
        subject: Course;
        allocatedPrice: number;
      } => Boolean(row.student && row.course),
    );
  return (
    <Modal title={`التقرير التفصيلي: ${teacher.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f5f7ff] p-3 text-xs">
            <span className="block text-[#6c6c6c]">نسبة الأستاذ</span>
            <b className="mt-1 block text-lg text-[#5054c0]">
              {teacher.commission}%
            </b>
          </div>
          <div className="rounded-xl bg-[#faf4de] p-3 text-xs">
            <span className="block text-[#6c6c6c]">سعر الطالب</span>
            <b className="mt-1 block text-lg text-[#a08500]">
              حسب المادة أو الباقة
            </b>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#e5e5e5]">
                <th className="p-3">الطالب</th>
                <th className="p-3">القسم/الدورة</th>
                <th className="p-3">المدفوع</th>
                <th className="p-3">حصة الأستاذ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, course, subject, allocatedPrice }) => (
                <tr
                  key={`${student.id}-${course.id}-${subject.id}`}
                  className="border-b border-[#f1f1f1]"
                >
                  <td className="p-3">{student.name}</td>
                  <td className="p-3">
                    {course.type === "باقة"
                      ? `${course.name} • ${subject.name}`
                      : subject.name}
                  </td>
                  <td className="p-3">{money(allocatedPrice)}</td>
                  <td className="p-3 font-bold text-[#5054c0]">
                    {money(
                      Math.round((allocatedPrice * teacher.commission) / 100),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <EmptyState text="لا توجد تسجيلات مرتبطة بهذا الأستاذ بعد" />
        )}
      </div>
    </Modal>
  );
}

function Schedule({ data, update }: Props) {
  return <SpreadsheetTimetable data={data} update={update} />;
  /* Legacy schedule implementation retained below for the moment. */
  const [open, setOpen] = useState(false);
  const [roomForm, setRoomForm] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const weekdays = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];
  const [form, setForm] = useState({
    title: "",
    teacher: "",
    course: "",
    date: today,
    weekday: "الاثنين",
    time: "16:00",
    endTime: "17:00",
    room: data.rooms[0]?.name || "",
  });
  const startHour = 8;
  const slots = Array.from(
    { length: 24 },
    (_, index) =>
      `${String(startHour + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );
  const minutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const timeAt = (index: number) =>
    slots[Math.max(0, Math.min(slots.length - 1, index))];
  const slotIndex = (value: string) =>
    Math.max(0, Math.round((minutes(value) - startHour * 60) / 30));
  const save = (event: FormEvent) => {
    event.preventDefault();
    update(
      { ...data, sessions: [...data.sessions, { ...form, id: Date.now() }] },
      "تمت إضافة الحصة",
    );
    setOpen(false);
  };
  const moveSession = (
    session: Session,
    index: number,
    room: string,
    weekday = session.weekday || "الاثنين",
  ) => {
    const duration = Math.max(
      30,
      minutes(session.endTime || "17:00") - minutes(session.time),
    );
    const time = timeAt(index);
    const endTime = timeAt(index + duration / 30);
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id
            ? { ...item, time, endTime, room, weekday }
            : item,
        ),
      },
      "تم تحريك الحصة",
    );
  };
  const resizeSession = (session: Session, delta: number) => {
    const endIndex = Math.max(
      slotIndex(session.time) + 1,
      slotIndex(session.endTime || "17:00") + delta,
    );
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id
            ? { ...item, endTime: timeAt(endIndex) }
            : item,
        ),
      },
      "تم تعديل مدة الحصة",
    );
  };
  const addRoom = (event: FormEvent) => {
    event.preventDefault();
    const name = roomForm.trim();
    if (!name || data.rooms.some((room) => room.name === name)) return;
    if (editingRoom) {
      update({ ...data, rooms: data.rooms.map(room => room.id === editingRoom.id ? { ...room, name } : room), sessions: data.sessions.map(session => session.room === editingRoom.name ? { ...session, room: name } : session) }, "تم تعديل القاعة");
      setEditingRoom(null);
    } else update({ ...data, rooms: [...data.rooms, { id: Date.now(), name }] }, "تمت إضافة القاعة");
    setRoomForm("");
  };
  const removeRoom = (room: Room) =>
    update(
      {
        ...data,
        rooms: data.rooms.filter((item) => item.id !== room.id),
        sessions: data.sessions.map((session) =>
          session.room === room.name ? { ...session, room: "" } : session,
        ),
      },
      "تم حذف القاعة",
    );
  return (
    <>
      <PageTitle
        eyebrow="التنظيم"
        title="الجدول الزمني"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            حجز حصة
          </Button>
        }
      />
      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-black">قاعات الجدول</h3>
            <p className="mt-1 text-xs text-[#84938b]">
              أضف أو احذف القاعات المستخدمة في الجدول.
            </p>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {data.rooms.map((room) => (
            <span
              key={room.id}
              className="flex items-center gap-2 rounded-lg bg-[#e4e8fd] px-3 py-2 text-xs font-bold text-[#3a3b9b]"
            >
              {room.name}
              <button type="button" onClick={() => { setEditingRoom(room); setRoomForm(room.name); }} className="text-[#5054c0]">تعديل</button>
              <button
                type="button"
                onClick={() => removeRoom(room)}
                className="text-[#c4584e]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addRoom} className="flex max-w-md gap-2">
          <input
            required
            value={roomForm}
            onChange={(event) => setRoomForm(event.target.value)}
            placeholder="اسم القاعة"
            className="flex-1 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-xs outline-none"
          />
          <Button type="submit">{editingRoom ? "حفظ تعديل القاعة" : "إضافة قاعة"}</Button>
        </form>
      </Card>
      <Card>
        <div className="mb-3 flex items-center gap-3 text-xs text-[#84938b]">
          <span>من الاثنين إلى الأحد</span>
          <span>اسحب الحصة إلى يوم أو قاعة أخرى</span>
          <span>كل خانة = 30 دقيقة</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[90px_repeat(24,minmax(38px,1fr))] border-b border-[#e5e5e5] text-[10px] text-[#84938b]">
              <div className="p-2">اليوم / القاعة</div>
              {slots.map((slot) => (
                <div
                  key={slot}
                  className="border-r border-[#f0f0f0] p-2 text-center"
                >
                  {slot}
                </div>
              ))}
            </div>
            {weekdays.flatMap((weekday) =>
              data.rooms.map((room) => (
                <div
                  key={`${weekday}-${room.id}`}
                  className="relative grid h-20 grid-cols-[90px_repeat(24,minmax(38px,1fr))] border-b border-[#eef3ef]"
                >
                  <div className="bg-[#fafafa] p-2 text-xs font-bold text-[#53685d]">
                    <span className="block text-[#5054c0]">{weekday}</span>
                    {room.name}
                  </div>
                  {slots.map((slot, index) => (
                    <button
                      key={slot}
                      type="button"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        const sessionId = Number(
                          event.dataTransfer.getData("session"),
                        );
                        const session = data.sessions.find(
                          (item) => item.id === sessionId,
                        );
                        if (session)
                          moveSession(session, index, room.name, weekday);
                      }}
                      onClick={() => {
                        setForm({
                          ...form,
                          room: room.name,
                          weekday,
                          date: today,
                          time: slot,
                          endTime: timeAt(index + 2),
                        });
                        setOpen(true);
                      }}
                      className="border-r border-[#f3f3f3] hover:bg-[#f5f7ff]"
                    />
                  ))}
                  {data.sessions
                    .filter(
                      (session) =>
                        session.room === room.name &&
                        (session.weekday || "الاثنين") === weekday,
                    )
                    .map((session) => {
                      const left = 90 + slotIndex(session.time) * (100 / 24);
                      const width = Math.max(
                        100 / 24,
                        (slotIndex(session.endTime || "17:00") -
                          slotIndex(session.time)) *
                        (100 / 24),
                      );
                      return (
                        <div
                          key={session.id}
                          draggable
                          className="absolute bottom-1 top-1 z-10 cursor-grab overflow-visible rounded-lg bg-[#5054c0] px-2 py-1 text-right text-[10px] font-bold text-white shadow-md"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          onDragStart={(event) =>
                            event.dataTransfer.setData(
                              "session",
                              String(session.id),
                            )
                          }
                        >
                          <span className="block truncate">
                            {session.title}
                          </span>
                          <span className="block truncate opacity-80">
                            {session.time} - {session.endTime || "17:00"}
                          </span>
                          <button
                            type="button"
                            aria-label="تمديد الحصة"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              resizeSession(session, 1);
                            }}
                            className="absolute bottom-0 left-1/2 h-1 w-8 rounded-full bg-white/80"
                          />
                        </div>
                      );
                    })}
                </div>
              )),
            )}
          </div>
        </div>
      </Card>
      {open && (
        <Modal title="حجز حصة جديدة" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="عنوان الحصة"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />
            <Input
              label="الأستاذ"
              value={form.teacher}
              onChange={(value) => setForm({ ...form, teacher: value })}
            />
            <Input
              label="الدورة"
              value={form.course}
              onChange={(value) => setForm({ ...form, course: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                اليوم
              </span>
              <select
                required
                value={form.weekday}
                onChange={(event) =>
                  setForm({ ...form, weekday: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {weekdays.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </label>
            <Input
              label="التاريخ"
              type="date"
              value={form.date}
              onChange={(value) => setForm({ ...form, date: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                القاعة
              </span>
              <select
                required
                value={form.room}
                onChange={(event) =>
                  setForm({ ...form, room: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.rooms.map((room) => (
                  <option key={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="بداية"
                type="time"
                value={form.time}
                onChange={(value) => setForm({ ...form, time: value })}
              />
              <Input
                label="نهاية"
                type="time"
                value={form.endTime}
                onChange={(value) => setForm({ ...form, endTime: value })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!data.rooms.length}>
                حفظ الحصة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function SpreadsheetTimetable({ data, update }: Props) {
  const weekdays = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];
  const slots = Array.from(
    { length: 29 },
    (_, index) =>
      `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());
  const [confirmDeleteSessions, setConfirmDeleteSessions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    sessionId: number;
    startIndex: number;
    endIndex: number;
    direction: "ltr" | "rtl";
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    sessionId: number;
    weekday: string;
    room: string;
    index: number;
    duration: number;
  } | null>(null);
  const [roomForm, setRoomForm] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({
    title: "",
    teacher: data.teachers[0]?.name || "",
    course: data.courses[0]?.name || "",
    weekday: "الاثنين",
    room: data.rooms[0]?.name || "",
    time: "16:00",
    endTime: "17:00",
    date: today,
  });
  const resizeRef = useRef<{
    sessionId: number;
    edge: "left" | "right";
    startX: number;
    slotWidth: number;
    direction: "ltr" | "rtl";
    startIndex: number;
    endIndex: number;
    nextStartIndex: number;
    nextEndIndex: number;
  } | null>(null);
  const indexOf = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Math.max(0, Math.round((hour * 60 + minute - 480) / 30));
  };
  const timeAt = (index: number) =>
    slots[Math.max(0, Math.min(slots.length - 1, index))];
  const save = (event: FormEvent) => {
    event.preventDefault();
    const sessions = editingSession
      ? data.sessions.map((session) =>
        session.id === editingSession.id
          ? { ...session, ...form }
          : session,
      )
      : [...data.sessions, { ...form, id: Date.now() }];
    update(
      { ...data, sessions },
      editingSession ? "تم تعديل الحصة" : "تمت إضافة الحصة",
    );
    setOpen(false);
    setEditingSession(null);
  };
  const editSession = (session: Session) => {
    setEditingSession(session);
    setForm({
      title: session.title,
      teacher: session.teacher,
      course: session.course,
      weekday: session.weekday || "الاثنين",
      room: session.room,
      time: session.time,
      endTime: session.endTime || "17:00",
      date: session.date,
    });
    setOpen(true);
  };
  const selectSession = (sessionId: number, additive: boolean) => {
    setSelectedSessionIds((current) => {
      if (!additive) {
        if (current.size === 1 && current.has(sessionId)) return new Set();
        return new Set([sessionId]);
      }
      const next = new Set(current);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };
  const sessionColor = (session: Session) => {
    const value = `${session.course || session.title}:${session.teacher}`;
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) | 0;
    }
    const colors = ["#5054c0", "#168653", "#c26a22", "#b5486b", "#287b9b", "#7556a8"];
    return colors[Math.abs(hash) % colors.length];
  };
  useEffect(() => {
    if (!selectedSessionIds.size) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedSessionIds(new Set());
        setContextMenu(null);
        return;
      }
      if (event.key === "Delete") {
        event.preventDefault();
        setConfirmDeleteSessions(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSessionIds.size]);
  const deleteSelectedSessions = () => {
    update(
      {
        ...data,
        sessions: data.sessions.filter((session) => !selectedSessionIds.has(session.id)),
      },
      "تم حذف الحصص المحددة",
    );
    setSelectedSessionIds(new Set());
    setConfirmDeleteSessions(false);
  };
  const beginResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    session: Session,
    edge: "left" | "right",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest("td");
    if (!cell) return;
    const startIndex = indexOf(session.time);
    const endIndex = Math.max(startIndex + 1, indexOf(session.endTime || "17:00"));
    const direction = getComputedStyle(cell).direction === "rtl" ? "rtl" : "ltr";
    resizeRef.current = {
      sessionId: session.id,
      edge,
      startX: event.clientX,
      slotWidth: cell.getBoundingClientRect().width /
        Math.max(1, endIndex - startIndex),
      direction,
      startIndex,
      endIndex,
      nextStartIndex: startIndex,
      nextEndIndex: endIndex,
    };
    setResizePreview({ sessionId: session.id, startIndex, endIndex, direction });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const visualDelta = Math.round(
      (event.clientX - resize.startX) / resize.slotWidth,
    );
    const delta = resize.direction === "rtl" ? -visualDelta : visualDelta;
    if (resize.edge === "right") {
      resize.nextStartIndex = Math.max(
        0,
        Math.min(resize.endIndex - 1, resize.startIndex + delta),
      );
    } else {
      resize.nextEndIndex = Math.min(
        slots.length - 1,
        Math.max(resize.startIndex + 1, resize.endIndex + delta),
      );
    }
    setResizePreview({
      sessionId: resize.sessionId,
      startIndex: resize.nextStartIndex,
      endIndex: resize.nextEndIndex,
      direction: resize.direction,
    });
  };
  const finishResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const nextStartIndex = resize.nextStartIndex;
    const nextEndIndex = resize.nextEndIndex;
    update(
      {
        ...data,
        sessions: data.sessions.map((session) =>
          session.id === resize.sessionId
            ? {
              ...session,
              time: timeAt(nextStartIndex),
              endTime: timeAt(nextEndIndex),
            }
            : session,
        ),
      },
      "تم تعديل مدة الحصة",
    );
    resizeRef.current = null;
    setResizePreview(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const dropIndex = (
    event: React.DragEvent<HTMLTableCellElement>,
    cell: HTMLTableCellElement,
    startIndex: number,
    span: number,
  ) => {
    const rect = cell.getBoundingClientRect();
    const visualIndex = Math.max(
      0,
      Math.min(
        span - 1,
        Math.floor(((event.clientX - rect.left) / rect.width) * span),
      ),
    );
    return getComputedStyle(cell).direction === "rtl"
      ? startIndex + span - 1 - visualIndex
      : startIndex + visualIndex;
  };
  const move = (
    session: Session,
    weekday: string,
    room: string,
    index: number,
    copy = false,
  ) => {
    const duration = Math.max(
      1,
      indexOf(session.endTime || "17:00") - indexOf(session.time),
    );
    const placement = {
      weekday,
      room,
      time: timeAt(index),
      endTime: timeAt(index + duration),
    };
    update(
      {
        ...data,
        sessions: copy
          ? [...data.sessions, { ...session, ...placement, id: Date.now() }]
          : data.sessions.map((item) =>
            item.id === session.id ? { ...item, ...placement } : item,
          ),
      },
      copy ? "تم نسخ الحصة" : "تم تحريك الحصة",
    );
  };
  const addRoom = (event: FormEvent) => {
    event.preventDefault();
    const name = roomForm.trim();
    if (!name || data.rooms.some((room) => room.name === name && room.id !== editingRoom?.id)) return;
    if (editingRoom) {
      update({ ...data, rooms: data.rooms.map(room => room.id === editingRoom.id ? { ...room, name } : room), sessions: data.sessions.map(session => session.room === editingRoom.name ? { ...session, room: name } : session) }, "تم تعديل القاعة");
      setEditingRoom(null);
    } else update({ ...data, rooms: [...data.rooms, { id: Date.now(), name }] }, "تمت إضافة القاعة");
    setRoomForm("");
  };
  const removeRoom = (room: Room) =>
    update(
      {
        ...data,
        rooms: data.rooms.filter((item) => item.id !== room.id),
        sessions: data.sessions.map((session) =>
          session.room === room.name ? { ...session, room: "" } : session,
        ),
      },
      "تم حذف القاعة",
    );
  return (
    <>
      <PageTitle
        eyebrow="التنظيم"
        title="الجدول الزمني"
        action={
          <Button
            onClick={() => {
              setEditingSession(null);
              setOpen(true);
            }}
          >
            <Plus size={15} className="ml-2 inline" />
            حجز حصة
          </Button>
        }
      />
      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {data.rooms.map((room) => (
            <span
              key={room.id}
              className="flex items-center gap-2 rounded-lg bg-[#e4e8fd] px-3 py-2 text-xs font-bold text-[#3a3b9b]"
            >
              {room.name}
              <button type="button" onClick={() => { setEditingRoom(room); setRoomForm(room.name); }} className="text-[#5054c0]">تعديل</button>
              <button
                type="button"
                onClick={() => removeRoom(room)}
                className="text-[#c4584e]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addRoom} className="flex max-w-md gap-2">
          <input
            required
            value={roomForm}
            onChange={(event) => setRoomForm(event.target.value)}
            placeholder="اسم القاعة"
            className="flex-1 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-xs outline-none"
          />
          <Button type="submit">{editingRoom ? "حفظ تعديل القاعة" : "إضافة قاعة"}</Button>
        </form>
      </Card>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#84938b]">
            هذا الجدول أسبوعي متكرر؛ يتم تحديد التاريخ فقط عند تسجيل الحضور.
          </p>
          {selectedSessionIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#53685d]">
                {selectedSessionIds.size} حصة محددة
              </span>
              <Button
                variant="danger"
                onClick={() => setConfirmDeleteSessions(true)}
              >
                <Trash2 size={14} className="ml-1 inline" />
                حذف المحدد
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-max min-w-[1500px] table-fixed border-collapse text-right text-[10px]">
            <thead>
              <tr>
                <th className="sticky right-0 z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3">
                  اليوم
                </th>
                <th className="sticky right-[70px] z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3">
                  القاعة
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot}
                    className="min-w-[42px] border border-[#e5e5e5] bg-[#fafafa] p-2 text-center"
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.flatMap((weekday) =>
                data.rooms.map((room, roomIndex) => {
                  const sessions = data.sessions.filter(
                    (session) =>
                      session.room === room.name &&
                      (session.weekday || "الاثنين") === weekday,
                  );
                  const cells: React.ReactNode[] = [];
                  let index = 0;
                  while (index < slots.length) {
                    const session = sessions.find(
                      (item) => indexOf(item.time) === index,
                    );
                    if (session) {
                      const sessionStartIndex = index;
                      const span = Math.max(
                        1,
                        Math.min(
                          slots.length - index,
                          indexOf(session.endTime || "17:00") - index,
                        ),
                      );
                      cells.push(
                        <td
                          key={session.id}
                          colSpan={span}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnter={(event) =>
                            (() => {
                              const draggedSession = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (draggedSession) {
                                setDragPreview({
                                  sessionId: draggedSession.id,
                                  weekday,
                                  room: room.name,
                                  index: dropIndex(
                                    event,
                                    event.currentTarget,
                                    sessionStartIndex,
                                    span,
                                  ),
                                  duration: Math.max(
                                    1,
                                    indexOf(draggedSession.endTime || "17:00") -
                                    indexOf(draggedSession.time),
                                  ),
                                });
                              }
                            })()
                          }
                          onDrop={(event) => {
                            const draggedSession = data.sessions.find(
                              (item) =>
                                item.id ===
                                Number(event.dataTransfer.getData("session")),
                            );
                            if (draggedSession) {
                              move(
                                draggedSession,
                                weekday,
                                room.name,
                                dropIndex(
                                  event,
                                  event.currentTarget,
                                  sessionStartIndex,
                                  span,
                                ),
                                event.ctrlKey ||
                                event.dataTransfer.getData("copy") === "true",
                              );
                            }
                            setDragPreview(null);
                          }}
                          className={`relative h-12 border border-[#e5e5e5] p-1 text-white ${dragPreview &&
                            dragPreview.weekday === weekday &&
                            dragPreview.room === room.name &&
                            dragPreview.index < sessionStartIndex + span &&
                            dragPreview.index + dragPreview.duration > sessionStartIndex
                            ? "bg-[#f59e0b]/20 outline outline-2 outline-dashed outline-[#f59e0b] outline-offset-[-2px]"
                            : ""
                            } ${selectedSessionIds.has(session.id) ? "outline outline-2 outline-dashed outline-[#f59e0b] outline-offset-[-2px]" : ""}`}
                          style={{ backgroundColor: sessionColor(session) }}
                        >
                          <div
                            draggable
                            onClick={(event) => {
                              if (event.detail > 1) return;
                              selectSession(session.id, event.ctrlKey || event.metaKey);
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              selectSession(session.id, event.ctrlKey || event.metaKey);
                              setContextMenu({ x: event.clientX, y: event.clientY });
                            }}
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "session",
                                String(session.id),
                              );
                              event.dataTransfer.setData(
                                "copy",
                                String(event.ctrlKey),
                              );
                              setDragPreview(null);
                            }}
                            onDragEnd={() => setDragPreview(null)}
                            onDoubleClick={() => editSession(session)}
                            className="relative h-full cursor-grab rounded-md px-2 py-1 font-bold"
                          >
                            <button
                              type="button"
                              aria-label="تعديل الحصة"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                editSession(session);
                              }}
                              className="absolute left-1 top-1 z-10 rounded bg-white/20 p-1 hover:bg-white/35"
                            >
                              <Edit3 size={11} />
                            </button>
                            <span className="block truncate">
                              {session.course || session.title}
                            </span>
                            <span className="block truncate opacity-80">
                              {session.teacher}
                            </span>
                            <button
                              type="button"
                              aria-label="تغيير بداية الحصة"
                              onPointerDown={(event) =>
                                beginResize(event, session, "left")
                              }
                              onPointerMove={moveResize}
                              onPointerUp={finishResize}
                              className="absolute bottom-0 left-0 top-0 z-10 w-3 cursor-ew-resize touch-none bg-white/20 opacity-0 hover:opacity-100"
                              style={{ cursor: "ew-resize" }}
                            />
                            <button
                              type="button"
                              aria-label="تغيير نهاية الحصة"
                              onPointerDown={(event) =>
                                beginResize(event, session, "right")
                              }
                              onPointerMove={moveResize}
                              onPointerUp={finishResize}
                              className="absolute bottom-0 right-0 top-0 z-10 w-3 cursor-ew-resize touch-none bg-white/20 opacity-0 hover:opacity-100"
                              style={{ cursor: "ew-resize" }}
                            />
                            {resizePreview?.sessionId === session.id && (
                              <div
                                className="pointer-events-none absolute bottom-0 top-0 z-20 border-2 border-dashed border-[#f59e0b]"
                                style={{
                                  left: `${((resizePreview.direction === "rtl" ? span - (resizePreview.endIndex - index) : resizePreview.startIndex - index) / span) * 100}%`,
                                  width: `${((resizePreview.endIndex - resizePreview.startIndex) / span) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                        </td>,
                      );
                      index += span;
                    } else {
                      const slot = slots[index];
                      const slotIndex = index;
                      cells.push(
                        <td
                          key={slot}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnter={(event) =>
                            (() => {
                              const draggedSession = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (draggedSession) {
                                setDragPreview({
                                  sessionId: draggedSession.id,
                                  weekday,
                                  room: room.name,
                                  index: slotIndex,
                                  duration: Math.max(
                                    1,
                                    indexOf(draggedSession.endTime || "17:00") -
                                    indexOf(draggedSession.time),
                                  ),
                                });
                              }
                            })()
                          }
                          onDrop={(event) => {
                            const session = data.sessions.find(
                              (item) =>
                                item.id ===
                                Number(event.dataTransfer.getData("session")),
                            );
                            if (session)
                              move(
                                session,
                                weekday,
                                room.name,
                                slotIndex,
                                event.ctrlKey ||
                                event.dataTransfer.getData("copy") === "true",
                              );
                            setDragPreview(null);
                          }}
                          onClick={() => {
                            setForm({
                              ...form,
                              weekday,
                              room: room.name,
                              time: slot,
                              endTime: timeAt(slotIndex + 2),
                            });
                            setOpen(true);
                          }}
                          className={`h-12 border border-[#f0f0f0] hover:bg-[#f5f7ff] ${dragPreview?.weekday === weekday &&
                            dragPreview.room === room.name &&
                            dragPreview.index <= slotIndex &&
                            dragPreview.index + dragPreview.duration > slotIndex
                            ? "bg-[#f59e0b]/10 outline outline-2 outline-dashed outline-[#f59e0b] outline-offset-[-2px]"
                            : ""
                            }`}
                        />,
                      );
                      index += 1;
                    }
                  }
                  return (
                    <tr
                      key={`${weekday}-${room.id}`}
                      className={roomIndex === 0 ? "border-t-3 border-t-[#34443c]" : ""}
                    >
                      {roomIndex === 0 && <th rowSpan={data.rooms.length} className="sticky right-0 z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#f7f7f7] p-3 align-middle font-black text-[#5054c0]">{weekday}</th>}
                      <th className="sticky right-[70px] z-20 w-[70px] min-w-[70px] whitespace-nowrap border border-[#e5e5e5] bg-[#fafafa] p-3 font-bold text-[#53685d]">
                        {room.name}
                      </th>
                      {cells}
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {contextMenu && (
        <>
          <button type="button" aria-label="إغلاق القائمة" className="fixed inset-0 z-40 cursor-default" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 rounded-lg border border-[#e5e5e5] bg-white p-1 shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button type="button" className="rounded-md px-3 py-2 text-xs font-bold text-[#c4584e] hover:bg-[#fff0ee]" onClick={() => { setContextMenu(null); setConfirmDeleteSessions(true); }}>
              حذف الحصة المحددة
            </button>
          </div>
        </>
      )}
      {confirmDeleteSessions && (
        <ConfirmDialog title="تأكيد حذف الحصص" message={`هل أنت متأكد من حذف ${selectedSessionIds.size} حصة محددة؟ لا يمكن التراجع عن هذا الإجراء.`} confirmLabel="حذف الحصص" onCancel={() => setConfirmDeleteSessions(false)} onConfirm={deleteSelectedSessions} />
      )}
      {open && (
        <Modal
          title={editingSession ? "تعديل الحصة" : "حجز حصة جديدة"}
          onClose={() => {
            setOpen(false);
            setEditingSession(null);
          }}
        >
          <form onSubmit={save} className="space-y-4">
            <Input
              label="عنوان الحصة"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                المادة أو الباقة
              </span>
              <select
                required
                value={form.course}
                onChange={(event) =>
                  setForm({ ...form, course: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.courses.map((course) => (
                  <option key={course.id}>{course.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                الأستاذ
              </span>
              <select
                required
                value={form.teacher}
                onChange={(event) =>
                  setForm({ ...form, teacher: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.teachers.map((teacher) => (
                  <option key={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                اليوم
              </span>
              <select
                required
                value={form.weekday}
                onChange={(event) =>
                  setForm({ ...form, weekday: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {weekdays.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                القاعة
              </span>
              <select
                required
                value={form.room}
                onChange={(event) =>
                  setForm({ ...form, room: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.rooms.map((room) => (
                  <option key={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="بداية"
                type="time"
                value={form.time}
                onChange={(value) => setForm({ ...form, time: value })}
              />
              <Input
                label="نهاية"
                type="time"
                value={form.endTime}
                onChange={(value) => setForm({ ...form, endTime: value })}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!data.rooms.length || !data.courses.length}
              >
                {editingSession ? "حفظ التعديل" : "حفظ الحصة"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDeleteSessions && (
        <ConfirmDialog
          title="تأكيد حذف الحصص"
          message={`هل أنت متأكد من حذف ${selectedSessionIds.size} حصة محددة؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف الحصص"
          onCancel={() => setConfirmDeleteSessions(false)}
          onConfirm={deleteSelectedSessions}
        />
      )}
    </>
  );
}

function WeeklyTimetable({ data, update }: Props) {
  const weekdays = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];
  const slots = Array.from(
    { length: 24 },
    (_, index) =>
      `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
  );
  const [open, setOpen] = useState(false);
  const [roomForm, setRoomForm] = useState("");
  const [form, setForm] = useState({
    title: "",
    teacher: data.teachers[0]?.name || "",
    course: data.courses[0]?.name || "",
    weekday: "الاثنين",
    room: data.rooms[0]?.name || "",
    time: "16:00",
    endTime: "17:00",
    date: today,
  });
  const indexOf = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Math.max(0, Math.round((hour * 60 + minute - 480) / 30));
  };
  const timeAt = (index: number) =>
    slots[Math.max(0, Math.min(slots.length - 1, index))];
  const save = (event: FormEvent) => {
    event.preventDefault();
    update(
      { ...data, sessions: [...data.sessions, { ...form, id: Date.now() }] },
      "تمت إضافة الحصة",
    );
    setOpen(false);
  };
  const move = (
    session: Session,
    weekday: string,
    room: string,
    index: number,
  ) => {
    const duration = Math.max(
      1,
      indexOf(session.endTime || "17:00") - indexOf(session.time),
    );
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id
            ? {
              ...item,
              weekday,
              room,
              time: timeAt(index),
              endTime: timeAt(index + duration),
            }
            : item,
        ),
      },
      "تم تحريك الحصة",
    );
  };
  const resize = (session: Session) => {
    const next = Math.max(
      indexOf(session.time) + 1,
      indexOf(session.endTime || "17:00") + 1,
    );
    update(
      {
        ...data,
        sessions: data.sessions.map((item) =>
          item.id === session.id ? { ...item, endTime: timeAt(next) } : item,
        ),
      },
      "تم تعديل مدة الحصة",
    );
  };
  const addRoom = (event: FormEvent) => {
    event.preventDefault();
    const name = roomForm.trim();
    if (!name || data.rooms.some((room) => room.name === name)) return;
    update(
      { ...data, rooms: [...data.rooms, { id: Date.now(), name }] },
      "تمت إضافة القاعة",
    );
    setRoomForm("");
  };
  const removeRoom = (room: Room) =>
    update(
      {
        ...data,
        rooms: data.rooms.filter((item) => item.id !== room.id),
        sessions: data.sessions.map((session) =>
          session.room === room.name ? { ...session, room: "" } : session,
        ),
      },
      "تم حذف القاعة",
    );
  return (
    <>
      <PageTitle
        eyebrow="التنظيم"
        title="الجدول الزمني"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            حجز حصة
          </Button>
        }
      />
      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {data.rooms.map((room) => (
            <span
              key={room.id}
              className="flex items-center gap-2 rounded-lg bg-[#e4e8fd] px-3 py-2 text-xs font-bold text-[#3a3b9b]"
            >
              {room.name}
              <button
                type="button"
                onClick={() => removeRoom(room)}
                className="text-[#c4584e]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addRoom} className="flex max-w-md gap-2">
          <input
            required
            value={roomForm}
            onChange={(event) => setRoomForm(event.target.value)}
            placeholder="اسم القاعة"
            className="flex-1 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-xs outline-none"
          />
          <Button type="submit">إضافة قاعة</Button>
        </form>
      </Card>
      <Card>
        <div className="mb-3 flex gap-3 text-xs text-[#84938b]">
          <span>الأيام من الاثنين إلى الأحد</span>
          <span>كل خانة 30 دقيقة</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-right text-xs">
            <thead>
              <tr>
                <th className="w-28 border border-[#e5e5e5] bg-[#fafafa] p-3">
                  اليوم
                </th>
                {data.rooms.map((room) => (
                  <th
                    key={room.id}
                    className="border border-[#e5e5e5] bg-[#fafafa] p-3"
                  >
                    {room.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.map((weekday) => (
                <tr key={weekday}>
                  <th className="border border-[#e5e5e5] bg-[#f7f7f7] p-3 align-top font-black text-[#5054c0]">
                    {weekday}
                  </th>
                  {data.rooms.map((room) => (
                    <td
                      key={room.id}
                      className="relative h-[480px] border border-[#e5e5e5] align-top"
                    >
                      <div className="absolute inset-0">
                        {slots.map((slot, index) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setForm({
                                ...form,
                                weekday,
                                room: room.name,
                                time: slot,
                                endTime: timeAt(index + 2),
                              });
                              setOpen(true);
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              const session = data.sessions.find(
                                (item) =>
                                  item.id ===
                                  Number(event.dataTransfer.getData("session")),
                              );
                              if (session)
                                move(session, weekday, room.name, index);
                            }}
                            className="block h-5 w-full border-b border-dashed border-[#f0f0f0] text-left text-[9px] text-[#b0b8b3] hover:bg-[#f5f7ff]"
                          >
                            {index % 2 === 0 ? slot : ""}
                          </button>
                        ))}
                        {data.sessions
                          .filter(
                            (session) =>
                              session.room === room.name &&
                              (session.weekday || "الاثنين") === weekday,
                          )
                          .map((session) => (
                            <div
                              key={session.id}
                              draggable
                              onDragStart={(event) =>
                                event.dataTransfer.setData(
                                  "session",
                                  String(session.id),
                                )
                              }
                              className="absolute left-1 right-1 z-10 cursor-grab rounded-lg bg-[#5054c0] px-2 py-1 text-[10px] font-bold text-white shadow-md"
                              style={{
                                top: `${indexOf(session.time) * 20}px`,
                                height: `${Math.max(20, (indexOf(session.endTime || "17:00") - indexOf(session.time)) * 20)}px`,
                              }}
                            >
                              <span className="block truncate">
                                {session.course || session.title}
                              </span>
                              <span className="block truncate opacity-80">
                                {session.teacher} • {session.time}-
                                {session.endTime || "17:00"}
                              </span>
                              <button
                                type="button"
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  resize(session);
                                }}
                                className="absolute bottom-0 left-1/2 h-1 w-8 rounded bg-white/80"
                                aria-label="تمديد مدة الحصة"
                              />
                            </div>
                          ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open && (
        <Modal title="حجز حصة جديدة" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="عنوان الحصة"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                المادة أو الباقة
              </span>
              <select
                required
                value={form.course}
                onChange={(event) =>
                  setForm({ ...form, course: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.courses.map((course) => (
                  <option key={course.id}>{course.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                الأستاذ
              </span>
              <select
                required
                value={form.teacher}
                onChange={(event) =>
                  setForm({ ...form, teacher: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.teachers.map((teacher) => (
                  <option key={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                اليوم
              </span>
              <select
                required
                value={form.weekday}
                onChange={(event) =>
                  setForm({ ...form, weekday: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {weekdays.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </label>
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                القاعة
              </span>
              <select
                required
                value={form.room}
                onChange={(event) =>
                  setForm({ ...form, room: event.target.value })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"
              >
                {data.rooms.map((room) => (
                  <option key={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="بداية"
                type="time"
                value={form.time}
                onChange={(value) => setForm({ ...form, time: value })}
              />
              <Input
                label="نهاية"
                type="time"
                value={form.endTime}
                onChange={(value) => setForm({ ...form, endTime: value })}
              />
            </div>
            <Input
              label="التاريخ"
              type="date"
              value={form.date}
              onChange={(value) => setForm({ ...form, date: value })}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!data.rooms.length || !data.courses.length}
              >
                حفظ الحصة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Attendance({ data, update }: Props) {
  const weekdayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const displayDate = (value: string) => parseDate(value).toLocaleDateString("ar-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const [occurrenceDate, setOccurrenceDate] = useState(today);
  const [session, setSession] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, AttendanceRecord["status"]>>({});
  const selectedWeekday = weekdayNames[parseDate(occurrenceDate).getDay()];
  const dailySessions = data.sessions.filter((item) => (item.weekday || "الاثنين") === selectedWeekday).sort((a, b) => a.time.localeCompare(b.time));
  const selectedSession = data.sessions.find((item) => item.id === session);
  const selectedCourse = data.courses.find((course) => course.name === selectedSession?.course);
  const students = data.students.filter((student) => data.enrollments.some((enrollment) => enrollment.studentId === student.id && enrollment.status === "نشط" && enrollment.courseId === selectedCourse?.id));
  const selectedRecords = data.attendances.filter((item) => item.sessionId === session && item.occurrenceDate === occurrenceDate);
  const historyDates = Array.from(new Set(data.attendances.filter((item) => item.sessionId === session).map((item) => item.occurrenceDate))).sort().reverse();
  useEffect(() => {
    if (!dailySessions.some((item) => item.id === session)) setSession(dailySessions[0]?.id || 0);
  }, [dailySessions, session]);
  useEffect(() => {
    setStatuses(selectedRecords.reduce<Record<number, AttendanceRecord["status"]>>((result, item) => {
      result[item.studentId] = item.status;
      return result;
    }, {}));
  }, [data.attendances, occurrenceDate, session]);
  const changeDate = (offset: number) => {
    const next = parseDate(occurrenceDate);
    next.setDate(next.getDate() + offset);
    setOccurrenceDate(formatDate(next));
  };
  const saveAttendance = () => {
    const current = data.attendances.filter((item) => item.sessionId !== session || item.occurrenceDate !== occurrenceDate);
    const records = Object.entries(statuses).map(([studentId, status], index) => ({ id: Date.now() + index, sessionId: session, studentId: Number(studentId), occurrenceDate, status }));
    update({ ...data, attendances: [...current, ...records] }, "تم حفظ الحضور");
  };
  const markAllPresent = () => setStatuses(Object.fromEntries(students.map((student) => [student.id, "حاضر" as const])));
  const statusCount = (status: AttendanceRecord["status"]) => Object.values(statuses).filter((value) => value === status).length;
  return (
    <>
      <PageTitle eyebrow="التنظيم" title="تسجيل الحضور" />
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => changeDate(-1)}>اليوم السابق</Button>
          <Button onClick={() => setOccurrenceDate(today)}>اليوم</Button>
          <Button variant="outline" onClick={() => changeDate(1)}>اليوم التالي</Button>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-[#64786c]">
          <span>{displayDate(occurrenceDate)}</span>
          <input type="date" value={occurrenceDate} onChange={(event) => setOccurrenceDate(event.target.value)} className="rounded-xl border border-[#dce7df] bg-white p-2 text-xs" />
        </label>
      </div>
      <div className="grid w-full min-w-0 gap-5 xl:grid-cols-[0.85fr_1.5fr]">
        <Card className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-black">حصص اليوم</h3><p className="mt-1 text-xs text-[#84938b]">{dailySessions.length} حصة مجدولة</p></div>
          </div>
          <div className="space-y-2">
            {dailySessions.map((item) => {
              const count = data.attendances.filter((record) => record.sessionId === item.id && record.occurrenceDate === occurrenceDate).length;
              const active = item.id === session;
              return <button key={item.id} type="button" onClick={() => setSession(item.id)} className={`w-full rounded-xl border p-3 text-right transition-colors ${active ? "border-[#5054c0] bg-[#f5f7ff]" : "border-[#e5e5e5] bg-white hover:bg-[#f7f9f8]"}`}><div className="flex items-start justify-between gap-3"><div><b className="block text-xs">{item.title}</b><span className="mt-1 block text-[10px] text-[#84938b]">{item.time} - {item.endTime || "17:00"} • {item.room}</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${count ? "bg-[#e4f5eb] text-[#218653]" : "bg-[#faf4de] text-[#a08500]"}`}>{count ? `${count} مسجل` : "غير مسجل"}</span></div></button>;
            })}
            {!dailySessions.length && <p className="rounded-xl bg-[#fafafa] p-6 text-center text-xs text-[#84938b]">لا توجد حصص في هذا اليوم</p>}
          </div>
        </Card>
        <Card className="min-w-0">
          {selectedSession ? <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{selectedSession.title}</h3><p className="mt-1 text-xs text-[#84938b]">{selectedSession.teacher} • {selectedSession.room} • {displayDate(occurrenceDate)}</p></div><div className="flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-[#e4f5eb] px-2 py-1 text-[#218653]">حاضر {statusCount("حاضر")}</span><span className="rounded-full bg-[#fff0ed] px-2 py-1 text-[#c4584e]">غائب {statusCount("غائب")}</span><span className="rounded-full bg-[#faf4de] px-2 py-1 text-[#a08500]">متأخر {statusCount("متأخر")}</span></div></div>
            <div className="mb-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={markAllPresent}>تسجيل الكل حاضر</Button><Button onClick={saveAttendance} disabled={!students.length}>حفظ الحضور</Button></div>
            <Table><Th>الطالب</Th><Th>الدورة</Th><Th>الحالة</Th>{students.map((student) => <tr key={student.id}><Td><b>{student.name}</b></Td><Td>{student.course}</Td><Td><div className="flex gap-2">{["حاضر", "غائب", "متأخر"].map((status) => <button key={status} onClick={() => setStatuses({ ...statuses, [student.id]: status as AttendanceRecord["status"] })} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${statuses[student.id] === status ? "bg-[#00a060] text-white" : "bg-[#f1f5f2] text-[#718278]"}`}>{status}</button>)}</div></Td></tr>)}</Table>
            {!students.length && <p className="rounded-xl bg-[#fafafa] p-6 text-center text-xs text-[#84938b]">لا يوجد طلاب نشطون في هذه المادة</p>}
            <div className="mt-6 border-t border-[#eef3ef] pt-4"><h4 className="mb-3 text-sm font-black">سجل الحضور</h4>{historyDates.length ? <div className="space-y-2">{historyDates.map((date) => { const records = data.attendances.filter((item) => item.sessionId === session && item.occurrenceDate === date); return <button key={date} type="button" onClick={() => setOccurrenceDate(date)} className="flex w-full items-center justify-between rounded-lg bg-[#f7f9f8] px-3 py-2 text-xs hover:bg-[#eef5f0]"><span>{displayDate(date)}</span><span className="text-[#84938b]">{records.filter((item) => item.status === "حاضر").length} حاضر • {records.filter((item) => item.status === "غائب").length} غائب • {records.filter((item) => item.status === "متأخر").length} متأخر</span></button>; })}</div> : <p className="text-xs text-[#84938b]">لا يوجد سجل سابق لهذه الحصة</p>}</div>
          </> : <p className="py-16 text-center text-sm text-[#84938b]">اختر حصة من قائمة اليوم</p>}
        </Card>
      </div>
    </>
  );
}

function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [managedUsers, setManagedUsers] = useState<AdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    username: "",
    password: "",
    passwordConfirmation: "",
    role: "ADMIN" as "ADMIN" | "SUPER_ADMIN",
  });
  const [adminMessage, setAdminMessage] = useState("");
  const [form, setForm] = useState({
    name: "CentMan",
    address: "الجزائر العاصمة",
    phone: "0550000000",
    language,
    notifications: true,
    logo: "",
  });
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("settings")),
      )
      .then((settings) => setForm((current) => ({ ...current, ...settings })))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    fetch("/api/auth/users", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("users")))
      .then(setManagedUsers)
      .catch(() => setUserMessage("تعذر تحميل حسابات الإدارة"));
  }, [user?.role]);
  const save = async () => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setLanguage(form.language as AppLanguage);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }
  };
  const createAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setAdminMessage("");
    if (adminForm.password !== adminForm.passwordConfirmation) {
      setAdminMessage("كلمتا المرور غير متطابقتين");
      return;
    }
    const response = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminForm),
    });
    const result = await response.json();
    if (!response.ok) setAdminMessage(result.error || "تعذر إنشاء الحساب");
    else {
      setAdminForm({
        name: "",
        username: "",
        password: "",
        passwordConfirmation: "",
        role: "ADMIN",
      });
      if (user?.role === "SUPER_ADMIN") {
        const usersResponse = await fetch("/api/auth/users", { cache: "no-store" });
        if (usersResponse.ok) setManagedUsers(await usersResponse.json());
      }
      setAdminMessage("تم إنشاء الحساب بنجاح");
    }
  };
  const updateUser = async (payload: Record<string, unknown>, target?: AdminUser) => {
    const account = target || editingUser || resetUser;
    if (!account) return false;
    const response = await fetch("/api/auth/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, ...payload }) });
    const result = await response.json();
    if (!response.ok) { setUserMessage(result.error || "تعذر تحديث الحساب"); return false; }
    setManagedUsers((current) => current.map((item) => item.id === result.id ? { ...item, ...result } : item));
    setUserMessage("تم تحديث الحساب");
    return true;
  };
  return (
    <>
      <PageTitle eyebrow="النظام" title="الإعدادات" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">الهوية البصرية</h3>
          <div className="space-y-4">
            <LogoDropzone
              logo={form.logo}
              onChange={(logo) => setForm({ ...form, logo })}
            />
            <Input
              label="اسم المؤسسة"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <Input
              label="العنوان"
              value={form.address}
              onChange={(value) => setForm({ ...form, address: value })}
            />
            <Input
              label="الهاتف"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Button onClick={save}>حفظ الإعدادات</Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">إعدادات النظام</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl bg-[#f5f8f6] p-4 text-xs font-bold">
              <span>لغة التطبيق</span>
              <select
                value={form.language}
                onChange={(event) => {
                  const next = event.target.value as AppLanguage;
                  setForm({ ...form, language: next });
                  setLanguage(next);
                }}
                className="rounded-lg border border-[#dce7df] bg-white p-2"
              >
                <option>العربية</option>
                <option>Français</option>
                <option>English</option>
              </select>
            </label>
            <label className="flex items-center justify-between rounded-xl bg-[#f5f8f6] p-4 text-xs font-bold">
              <span>التنبيهات المالية</span>
              <input
                type="checkbox"
                checked={form.notifications}
                onChange={(event) =>
                  setForm({ ...form, notifications: event.target.checked })
                }
                className="h-4 w-4 accent-[#00a060]"
              />
            </label>
            {saved && (
              <p className="text-xs font-bold text-[#00a060]">
                تم حفظ الإعدادات بنجاح
              </p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">حسابات الإدارة</h3>
          <p className="mb-4 text-xs text-[#84938b]">
            أنشئ حسابات الإدارة وحدد نوع الصلاحية: Admin للعمليات اليومية أو Super-admin لإدارة النظام والمعلومات المالية.
          </p>
          <form onSubmit={createAdmin} className="space-y-3">
            <Input
              label="اسم المسؤول"
              value={adminForm.name}
              onChange={(name) => setAdminForm({ ...adminForm, name })}
            />
            <Input
              label="اسم المستخدم"
              value={adminForm.username}
              onChange={(username) => setAdminForm({ ...adminForm, username })}
            />
            <Input
              label="كلمة المرور"
              type="password"
              value={adminForm.password}
              onChange={(password) => setAdminForm({ ...adminForm, password })}
            />
            <Input
              label="تأكيد كلمة المرور"
              type="password"
              value={adminForm.passwordConfirmation}
              onChange={(passwordConfirmation) =>
                setAdminForm({ ...adminForm, passwordConfirmation })
              }
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                الصلاحية
              </span>
              <select
                value={adminForm.role}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    role: event.target.value as "ADMIN" | "SUPER_ADMIN",
                  })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none focus:border-[#00a060]"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super-admin</option>
              </select>
            </label>
            {adminMessage && (
              <p className="text-xs font-bold text-[#008a55]">{adminMessage}</p>
            )}
            <Button type="submit">إنشاء الحساب</Button>
          </form>
        </Card>
        {user?.role === "SUPER_ADMIN" && (
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#17251f]">إدارة الحسابات</h3>
                <p className="mt-1 text-xs text-[#84938b]">تعديل الحسابات، الصلاحيات، كلمات المرور وحالة الوصول.</p>
              </div>
              {userMessage && <span className="text-xs font-bold text-[#008a55]">{userMessage}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-xs">
                <thead><tr className="border-b border-[#e9efeb] text-[#96a69d]"><th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">الصلاحية</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead>
                <tbody>{managedUsers.map((account) => <tr key={account.id} className="border-b border-[#eef3ef]"><td className="p-3 font-bold">{account.name}</td><td className="p-3">{account.username}</td><td className="p-3">{account.role === "SUPER_ADMIN" ? "Super-admin" : "Admin"}</td><td className="p-3"><span className={account.active ? "text-[#008a55]" : "text-[#c4584e]"}>{account.active ? "نشط" : "متوقف"}</span></td><td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditingUser(account)} className="rounded-lg bg-[#e4e8fd] px-2 py-1 text-[10px] font-bold text-[#5054c0]">تعديل</button><button type="button" onClick={() => updateUser({ active: !account.active }, account)} disabled={account.id === user.id} className="rounded-lg bg-[#eff8f2] px-2 py-1 text-[10px] font-bold text-[#008a55] disabled:opacity-40">{account.active ? "تعطيل" : "تفعيل"}</button><button type="button" onClick={() => { setResetUser(account); setResetPassword(""); setResetConfirmation(""); }} className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]">تغيير كلمة المرور</button></div></td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      {editingUser && <Modal title="تعديل حساب الإدارة" onClose={() => setEditingUser(null)}><form onSubmit={async (event) => { event.preventDefault(); if (await updateUser({ name: editingUser.name, role: editingUser.role })) setEditingUser(null); }} className="space-y-4"><Input label="الاسم" value={editingUser.name} onChange={(name) => setEditingUser({ ...editingUser, name })} /><label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#64786c]">الصلاحية</span><select value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value as AdminUser["role"] })} className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super-admin</option></select></label><div className="flex justify-end"><Button type="submit">حفظ التعديل</Button></div></form></Modal>}
      {resetUser && <Modal title={`تغيير كلمة مرور ${resetUser.name}`} onClose={() => setResetUser(null)}><form onSubmit={async (event) => { event.preventDefault(); if (resetPassword.length < 8 || resetPassword !== resetConfirmation) { setUserMessage(resetPassword.length < 8 ? "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل" : "كلمتا المرور غير متطابقتين"); return; } if (await updateUser({ password: resetPassword })) { setResetUser(null); setResetPassword(""); setResetConfirmation(""); } }} className="space-y-4"><Input label="كلمة المرور الجديدة" type="password" value={resetPassword} onChange={setResetPassword} /><Input label="تأكيد كلمة المرور" type="password" value={resetConfirmation} onChange={setResetConfirmation} /><div className="flex justify-end"><Button type="submit">حفظ كلمة المرور</Button></div></form></Modal>}
    </>
  );
}

function LogoDropzone({
  logo,
  onChange,
  className = "",
}: {
  logo: string;
  onChange: (logo: string) => void;
  className?: string;
}) {
  const readFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return (
    <div className={`logo-dropzone ${className}`}>
      <span className="mb-2 block text-xs font-bold text-[#64786c]">
        شعار المؤسسة
      </span>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          readFile(event.dataTransfer.files[0]);
        }}
        className="flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#c3cbf7] bg-[#f5f7ff] p-4 text-center hover:border-[#5054c0]"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => readFile(event.target.files?.[0])}
        />
        {logo ? (
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="شعار المؤسسة"
              className="h-20 w-20 rounded-xl object-contain"
            />
            <span className="text-xs font-bold text-[#5054c0]">
              اسحب شعاراً جديداً أو انقر للاستبدال
            </span>
          </div>
        ) : (
          <div className="text-xs text-[#6c6c6c]">
            <span className="block text-2xl text-[#5054c0]">＋</span>اسحب الشعار
            هنا أو انقر لاختيار صورة
          </div>
        )}
      </label>
      {logo && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs font-bold text-[#a08500]"
        >
          إزالة الشعار
        </button>
      )}
    </div>
  );
}
