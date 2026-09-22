"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  Package,
  Plus,
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
  Student,
  Teacher,
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
};
const emptyData: DashboardData = {
  students: [],
  teachers: [],
  courses: [],
  enrollments: [],
  expenses: [],
  payments: [],
};
type Metric = "التسجيلات" | "الإيرادات";
type ChartRange = "يومي" | "أسبوعي" | "شهري";

export default function Home() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [metric, setMetric] = useState<Metric>("التسجيلات");
  const [chartRange, setChartRange] = useState<ChartRange>("يومي");
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
  const income = data.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const expenses = data.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
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
    data.payments,
    metric,
    chartRange,
  );
  const kpis = [
    { label: "صافي الربح", value: money(income - expenses), icon: TrendingUp, tone: "bg-[#e7f7ee] text-[#168653]" },
    { label: "إجمالي المصروفات", value: money(expenses), icon: WalletCards, tone: "bg-[#fff0ed] text-[#d56558]" },
    { label: "رسوم التسجيل", value: money(data.payments.filter((payment) => payment.month.includes("رسوم")).reduce((sum, payment) => sum + payment.amount, 0)), icon: ReceiptText, tone: "bg-[#fff6d8] text-[#a08500]" },
    { label: "الدفوعات الشهرية", value: money(income), icon: WalletCards, tone: "bg-[#e8efff] text-[#4c73c8]" },
    { label: "إجمالي الدخل", value: money(income), icon: TrendingUp, tone: "bg-[#eeeaff] text-[#6658bf]" },
  ];
  return (
    <CentmanShell>
      <div className="mx-auto max-w-[1450px]">
        <PageTitle eyebrow="نظرة عامة" title="لوحة التحكم" />
        {canViewFinance && <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e5e5]" />
          <span className="text-[11px] font-bold text-[#a0a0a0]">
            الأداء المالي • {chartRange}
          </span>
          <div className="h-px flex-1 bg-[#e5e5e5]" />
        </div>}
        {canViewFinance && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#6c6c6c]">{label}</p>
                  <strong className="mt-4 block text-2xl font-black text-[#292929]">
                    {value}
                  </strong>
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
            المؤشرات التشغيلية
          </span>
          <div className="h-px flex-1 bg-[#e5e5e5]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "إجمالي الباقات", value: data.courses.filter((course) => course.type === "باقة").length, unit: "باقة", icon: Package, tone: "bg-[#fff6d8] text-[#a08500]" },
            { label: "إجمالي الدورات", value: data.courses.length, unit: "نشطة", icon: BookOpen, tone: "bg-[#e8efff] text-[#4c73c8]" },
            { label: "إجمالي الأساتذة", value: data.teachers.length, unit: "عضو", icon: GraduationCap, tone: "bg-[#eeeaff] text-[#6658bf]" },
            { label: "الطلاب النشطون", value: data.students.filter((student) => student.status === "نشط").length, unit: "طالب", icon: Users, tone: "bg-[#e7f7ee] text-[#168653]" },
            { label: "إجمالي الطلاب", value: data.students.length, unit: "مسجل", icon: UserRound, tone: "bg-[#fff0ed] text-[#d56558]" },
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
                  عدد الطلاب الفعلي
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
                    <b>{course.actual} طالب</b>
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
                ["إضافة طالب جديد", "/students", Users],
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
                  لديك {lateStudents.length} طلاب متأخرين عن الدفع
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
  payments: Payment[],
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
    payments.forEach((payment) => {
      const index = bucketFor(payment.date);
      if (index >= 0 && index < length) values[index] += payment.amount;
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
