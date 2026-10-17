"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  GraduationCap,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  CentmanShell,
  Card,
  PageTitle,
  Toast,
} from "@/components/centman-shell";
import {
  Course,
  Enrollment,
  Expense,
  Payment,
  PaymentCollection,
  Student,
  Teacher,
  currentMonth,
  formatBillingMonth,
  money,
} from "@/lib/centman-store";
import { useAuth } from "@/components/auth-provider";

type DashboardData = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  enrollments: Enrollment[];
  expenses: Expense[];
  payments: Payment[];
  collections: PaymentCollection[];
};
const emptyData: DashboardData = {
  students: [],
  teachers: [],
  courses: [],
  enrollments: [],
  expenses: [],
  payments: [],
  collections: [],
};
type Metric = "التسجيلات" | "الإيرادات";
type ChartRange = "يومي" | "أسبوعي" | "شهري";

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [metric, setMetric] = useState<Metric>("التسجيلات");
  const [chartRange, setChartRange] = useState<ChartRange>("يومي");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const monthPicker = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState("جاري تحميل البيانات...");
  const { user } = useAuth();
  const canViewFinance = user?.role === "SUPER_ADMIN";
  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("database")),
      )
      .then((state) => {
        setData({ ...emptyData, ...state });
        setToast("");
      })
      .catch(() => setToast("تعذر تحميل بيانات لوحة التحكم"));
  }, []);
  const monthCollections = data.collections.filter((collection) =>
    collection.date.startsWith(selectedMonth),
  );
  const income = monthCollections.reduce(
    (sum, collection) => sum + collection.amount,
    0,
  );
  const expenses = data.expenses
    .filter((expense) => expense.date.startsWith(selectedMonth))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const registrationIncome = monthCollections.reduce((sum, collection) => {
    const payment = data.payments.find(
      (item) => item.id === collection.paymentId,
    );
    return payment?.month.includes("رسوم") ? sum + collection.amount : sum;
  }, 0);
  const visibleMonths = [-2, -1, 0, 1, 2].map((offset) =>
    shiftMonth(selectedMonth, offset),
  );
  const lateStudents = data.students.filter((student) => student.due > 0);
  const enrollmentCounts = data.courses
    .map((course) => ({
      ...course,
      actual: data.enrollments.filter(
        (item) => item.courseId === course.id && item.status === "نشط",
      ).length,
    }))
    .sort((a, b) => b.actual - a.actual);
  const chart = buildChart(
    data.students,
    data.enrollments,
    data.collections,
    metric,
    chartRange,
  );
  const kpis = [
    { label: "المبالغ المحصلة", value: money(income), icon: WalletCards, tone: "bg-[#e8efff] text-[#4c73c8]" },
    { label: "المصروفات", value: money(expenses), icon: ReceiptText, tone: "bg-[#fff0ed] text-[#d56558]" },
    { label: "الصافي", value: money(income - expenses), icon: TrendingUp, tone: "bg-[#e7f7ee] text-[#168653]" },
    { label: "رسوم التسجيل المحصلة", value: money(registrationIncome), icon: ReceiptText, tone: "bg-[#fff6d8] text-[#a08500]" },
  ];
  return (
    <CentmanShell notificationStudents={data.students}>
      <div className="mx-auto max-w-[1450px]">
        <PageTitle eyebrow="نظرة عامة" title="لوحة التحكم" />
        {canViewFinance && (
          <div className="mb-6 flex items-stretch gap-2 rounded-2xl border border-[#dfe8e3] bg-[#f7faf8] p-2">
            <div
              dir="ltr"
              className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto"
            >
              {visibleMonths.map((month) => {
                const selected = month === selectedMonth;
                const isCurrent = month === currentMonth;
                const [year] = month.split("-");
                const monthName = new Intl.DateTimeFormat("ar-MA", {
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${month}-01T00:00:00Z`));
                return (
                  <button
                    key={month}
                    type="button"
                    dir="rtl"
                    onClick={() => setSelectedMonth(month)}
                    className={`min-w-[105px] flex-1 rounded-xl px-3 py-2.5 text-center transition ${
                      selected
                        ? "bg-[#5054c0] text-white shadow-[0_5px_14px_rgba(80,84,192,0.24)]"
                        : isCurrent
                          ? "border border-[#99ccb2] bg-[#eaf7f0] text-[#087849] hover:bg-[#e0f2e8]"
                          : "text-[#63776c] hover:bg-white"
                    }`}
                  >
                    <span className="block text-[10px] font-bold">
                      {isCurrent ? "هذا الشهر" : "التقرير المالي"}
                    </span>
                    <span className="mt-1 block text-sm font-black">
                      {monthName}
                    </span>
                    <span
                      className={`block text-[9px] font-bold ${
                        selected
                          ? "text-white/75"
                          : isCurrent
                            ? "text-[#4f9472]"
                            : "text-[#9aa9a1]"
                      }`}
                    >
                      {year}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative flex w-12 shrink-0">
              <button
                type="button"
                title="اختيار شهر آخر"
                onClick={() => {
                  const input = monthPicker.current;
                  if (!input) return;
                  try {
                    input.showPicker();
                  } catch {
                    input.focus();
                    input.click();
                  }
                }}
                className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-[#dce7df] bg-white text-[#5054c0] transition hover:border-[#aeb1df] hover:bg-[#f0f1ff]"
              >
                <CalendarRange size={20} />
                <span className="sr-only">اختيار شهر آخر</span>
              </button>
              <input
                ref={monthPicker}
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  event.target.value && setSelectedMonth(event.target.value)
                }
                className="pointer-events-none absolute inset-0 opacity-0"
                tabIndex={-1}
                aria-label="اختيار شهر آخر"
              />
            </div>
          </div>
        )}
        {canViewFinance && <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e5e5]" />
          <span className="rounded-full bg-[#eef0ff] px-4 py-2 text-[11px] font-black text-[#5054c0]">
            ملخص {formatBillingMonth(selectedMonth)}
          </span>
          <div className="h-px flex-1 bg-[#e5e5e5]" />
        </div>}
        {canViewFinance && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#6c6c6c]">{label}</p>
                  <strong className="mt-4 block text-2xl font-black text-[#292929]">
                    {value}
                  </strong>
                  <span className="mt-2 block text-[10px] font-bold text-[#9aa59f]">
                    خلال {formatBillingMonth(selectedMonth)}
                  </span>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon size={19} strokeWidth={2.2} />
                </span>
              </div>
            </Card>
          ))}
        </div>}
        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e5e5]" />
          <span className="text-[11px] font-bold text-[#a0a0a0]">
            المؤشرات التشغيلية • الإجماليات الحالية
          </span>
          <div className="h-px flex-1 bg-[#e5e5e5]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "إجمالي الباقات", value: data.courses.filter((course) => course.type === "باقة").length, unit: "باقة", icon: Package, tone: "bg-[#fff6d8] text-[#a08500]" },
            { label: "إجمالي الدورات", value: data.courses.length, unit: "نشطة", icon: BookOpen, tone: "bg-[#e8efff] text-[#4c73c8]" },
            { label: "إجمالي الأساتذة", value: data.teachers.length, unit: "عضو", icon: GraduationCap, tone: "bg-[#eeeaff] text-[#6658bf]" },
            { label: "التلاميذ النشطون", value: data.students.filter((student) => student.status === "نشط").length, unit: "تلميذ", icon: Users, tone: "bg-[#e7f7ee] text-[#168653]" },
            { label: "إجمالي التلاميذ", value: data.students.length, unit: "مسجل", icon: UserRound, tone: "bg-[#fff0ed] text-[#d56558]" },
          ].map(({ label, value, unit, icon: Icon, tone }) => (
            <Card key={label} className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#6c6c6c]">{label}</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <strong className="text-2xl font-black text-[#292929]">{value}</strong>
                    <span className="text-[10px] text-[#a0a0a0]">{unit}</span>
                  </div>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon size={19} strokeWidth={2.2} />
                </span>
              </div>
            </Card>
          ))}
        </div>
        {canViewFinance && <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#292929]">أداء المركز</h3>
                <p className="mt-1 text-[11px] text-[#838383]">
                  {chartRange === "يومي" ? "آخر سبعة أيام" : chartRange === "أسبوعي" ? "آخر ثمانية أسابيع" : "آخر ستة أشهر"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <div className="flex rounded-lg bg-[#f5f7ff] p-1">
                  {(["يومي", "أسبوعي", "شهري"] as ChartRange[]).map((range) => <button key={range} onClick={() => setChartRange(range)} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${chartRange === range ? "bg-[#5054c0] text-white" : "text-[#6c6c6c]"}`}>{range}</button>)}
                </div>
                <div className="flex rounded-lg bg-[#f5f7ff] p-1">
                  {(["التسجيلات", "الإيرادات"] as Metric[]).map((option) => <button key={option} onClick={() => setMetric(option)} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${metric === option ? "bg-[#5054c0] text-white" : "text-[#6c6c6c]"}`}>{option}</button>)}
                </div>
              </div>
            </div>
            <SimpleChart values={chart.values} labels={chart.labels} range={chartRange} />
          </Card>
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#292929]">
                  أكثر الدورات تسجيلاً
                </h3>
                <p className="mt-1 text-[11px] text-[#838383]">
                  عدد التلاميذ الفعلي
                </p>
              </div>
              <Link
                href="/courses"
                className="text-xs font-bold text-[#5054c0]"
              >
                عرض الكل
              </Link>
            </div>
            <div className="space-y-4">
              {enrollmentCounts.slice(0, 4).map((course, index) => (
                <div key={course.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{course.name}</span>
                    <b>{course.actual} تلميذ</b>
                  </div>
                  <div className="h-2 rounded-full bg-[#f1f1f1]">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${enrollmentCounts[0]?.actual ? (course.actual / enrollmentCounts[0].actual) * 100 : 0}%`,
                        backgroundColor: [
                          "#5054c0",
                          "#f6cf10",
                          "#8e93d3",
                          "#a0a0a0",
                        ][index],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>}
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h3 className="mb-5 text-lg font-black">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["إضافة تلميذ جديد", "/students", Users],
                ["إضافة أستاذ", "/teachers", GraduationCap],
                ["إنشاء دورة", "/courses", BookOpen],
                ["حجز حصة", "/schedule", CalendarDays],
              ].map(([label, href, Icon]) => {
                const ActionIcon = Icon as typeof Users;
                return (
                  <Link
                    key={label as string}
                    href={href as string}
                    className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-3 text-xs font-bold hover:bg-[#f5f7ff]"
                  >
                    <ActionIcon size={16} className="text-[#5054c0]" />
                    {label as string}
                  </Link>
                );
              })}
            </div>
          </Card>
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="text-[#a08500]" />
              <div>
                <b className="block text-xs">
                  لديك {lateStudents.length} تلاميذ متأخرين عن الدفع
                </b>
                <span className="text-[10px] text-[#838383]">
                  إجمالي المستحقات:{" "}
                  {money(
                    lateStudents.reduce((sum, student) => sum + student.due, 0),
                  )}
                </span>
              </div>
            </div>
            <Link
              href="/late-students"
              className="flex items-center gap-1 text-xs font-bold text-[#5054c0]"
            >
              متابعة <ChevronLeft size={15} />
            </Link>
          </Card>
        </div>
      </div>
      <Toast message={toast} />
    </CentmanShell>
  );
}

function buildChart(
  students: Student[],
  enrollments: Enrollment[],
  collections: PaymentCollection[],
  metric: Metric,
  range: ChartRange,
) {
  const length = range === "يومي" ? 7 : range === "أسبوعي" ? 8 : 6;
  const values = Array.from({ length }, () => 0);
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  const countedStudents = new Set<string>();
  const bucketFor = (dateValue: string) => {
    const date = new Date(`${dateValue}T00:00:00`);
    const age = Math.floor((anchor.getTime() - date.getTime()) / 86400000);
    const monthAge = (anchor.getFullYear() - date.getFullYear()) * 12 + anchor.getMonth() - date.getMonth();
    return range === "يومي" ? length - 1 - age : range === "أسبوعي" ? length - 1 - Math.floor(age / 7) : length - 1 - monthAge;
  };
  if (metric === "الإيرادات") {
    collections.forEach((collection) => {
      const index = bucketFor(collection.date);
      if (index >= 0 && index < length) values[index] += collection.amount;
    });
  } else {
    const studentDates = new Map(
      students
        .filter((student) => student.enrollmentDate)
        .map((student) => [student.id, student.enrollmentDate as string]),
    );
    enrollments.forEach((enrollment) => {
      const index = bucketFor(
        studentDates.get(enrollment.studentId) || enrollment.enrolledAt,
      );
      if (index < 0 || index >= length) return;
      const uniqueKey = `${index}:${enrollment.studentId}`;
      if (!countedStudents.has(uniqueKey)) {
        countedStudents.add(uniqueKey);
        values[index] += 1;
      }
    });
  }
  const labels = values.map((_, index) => {
    const date = new Date(anchor);
    if (range === "يومي") date.setDate(date.getDate() - (length - index - 1));
    if (range === "أسبوعي") date.setDate(date.getDate() - (length - index - 1) * 7);
    if (range === "شهري") { date.setMonth(date.getMonth() - (length - index - 1)); date.setDate(1); }
    return range === "شهري" ? date.toLocaleDateString("ar-MA", { month: "short" }) : range === "أسبوعي" ? `أسبوع ${index + 1}` : date.toLocaleDateString("ar-MA", { weekday: "short", day: "numeric" });
  });
  return { values, labels };
}

function SimpleChart({ values, labels, range }: { values: number[]; labels: string[]; range: ChartRange }) {
  const plot = { left: 58, top: 18, width: 548, height: 190 };
  const max = Math.max(...values, 1);
  const yMax = Math.ceil(max / 4) * 4 || 1;
  const x = (index: number) =>
    plot.left + index * (plot.width / Math.max(values.length - 1, 1));
  const y = (value: number) =>
    plot.top + plot.height - (value / yMax) * plot.height;
  const points = values
    .map((value, index) => `${x(index)},${y(value)}`)
    .join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg
      viewBox="0 0 640 260"
      className="h-auto w-full rounded-xl bg-[#fbfbff]"
      role="img"
      aria-label={`أداء المركز ${range}`}
    >
      {ticks.map((ratio) => (
        <g key={ratio}>
          <line
            x1={plot.left}
            x2={plot.left + plot.width}
            y1={y(yMax * ratio)}
            y2={y(yMax * ratio)}
            stroke="#e8eaf7"
            strokeWidth="1"
          />
          <text
            x={plot.left - 10}
            y={y(yMax * ratio) + 4}
            textAnchor="end"
            fill="#8b8da8"
            fontSize="11"
          >
            {Math.round(yMax * ratio).toLocaleString("fr-MA")}
          </text>
        </g>
      ))}
      <line
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.top + plot.height}
        stroke="#d9dcef"
      />
      <line
        x1={plot.left}
        x2={plot.left + plot.width}
        y1={plot.top + plot.height}
        y2={plot.top + plot.height}
        stroke="#d9dcef"
      />
      <polyline
        fill="none"
        stroke="#5054c0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.map((value, index) => (
        <g key={index}>
          <circle
            cx={x(index)}
            cy={y(value)}
            r="4"
            fill="#f6cf10"
            stroke="#5054c0"
            strokeWidth="2"
          />
          <text
            x={x(index)}
            y={plot.top + plot.height + 28}
            textAnchor="middle"
            fill="#8b8da8"
            fontSize="11"
          >
            {labels[index]}
          </text>
        </g>
      ))}
    </svg>
  );
}
