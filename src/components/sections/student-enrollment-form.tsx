"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/centman-shell";
import { Course, Enrollment, Level, Student, money, normalizeMoroccoPhone, today } from "@/lib/centman-store";
import { CoursePicker } from "@/components/course-picker";


import { Input, Modal } from "@/components/sections/shared-ui";

export function StudentEnrollmentForm({
  student,
  courses,
  levels,
  enrollments,
  subscriptionFee,
  onClose,
  onSave,
}: {
  student: Student | null;
  courses: Course[];
  levels: Level[];
  enrollments: Enrollment[];
  subscriptionFee: number;
  onClose: () => void;
  onSave: (
    student: Student,
    courseIds: number[],
    paidAmounts: { annual: number; courses: Record<number, number>; discounts: Record<number, number> },
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
      enrollmentFee: subscriptionFee,
      subscriptionYear: 2026,
    },
  );
  const [courseIds, setCourseIds] = useState<number[]>(activeIds);
  const [annualPaid, setAnnualPaid] = useState(0);
  const [coursePaid, setCoursePaid] = useState<Record<number, number>>(() =>
    Object.fromEntries(activeIds.map((courseId) => [courseId, 0])),
  );
  const [discounts, setDiscounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      enrollments
        .filter((enrollment) => enrollment.studentId === student?.id && enrollment.status === "نشط")
        .map((enrollment) => [enrollment.courseId, enrollment.discount || 0]),
    ),
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
  const isRenewal = Boolean(
    student && form.subscriptionYear !== student.subscriptionYear,
  );
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
            { annual: annualPaid, courses: coursePaid, discounts },
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
            onChange={(value) => {
              const subscriptionYear = Number(value);
              setForm({
                ...form,
                subscriptionYear,
                enrollmentFee:
                  subscriptionYear !== student?.subscriptionYear
                    ? subscriptionFee
                    : student?.enrollmentFee ?? subscriptionFee,
              });
              setAnnualPaid(0);
            }}
          />
        </div>
        {(!student || isRenewal) && (
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
              className="relative mx-auto mb-3 max-w-xl rounded-2xl border border-[#e2e9e4] bg-white p-4 shadow-[0_3px_12px_rgba(28,67,47,0.04)]"
            >
              <div className="mx-auto max-w-md">
                <p className="mb-2 text-center text-[11px] font-bold text-[#60766b]">المادة أو الباقة</p>
                <div className="flex items-center gap-2">
                  <CoursePicker
                    courses={courses.filter((course) => course.id === courseId || !courseIds.includes(course.id))}
                    levels={levels}
                    value={courseId}
                    onChange={(nextId) => {
                      if (nextId == null) return;
                      setCourseIds(courseIds.map((id, itemIndex) => itemIndex === index ? nextId : id));
                    }}
                    showPrice
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    aria-label="إزالة التسجيل"
                    title="إزالة التسجيل"
                    onClick={() => setCourseIds(courseIds.filter((_, itemIndex) => itemIndex !== index))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f0dfb5] bg-[#fffaf0] text-[#a08500] transition-colors hover:bg-[#faf0d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a08500]"
                  >
                    <MinusIcon />
                  </button>
                </div>
              </div>
              <div className={`mx-auto mt-4 grid w-full gap-3 ${student ? "max-w-48 grid-cols-1" : "max-w-md grid-cols-2"}`}>
                {!student && (
                  <Input
                    label="المدفوع الآن (MAD)"
                    type="number"
                    value={coursePaid[courseId] || 0}
                    onChange={(value) => setCoursePaid({ ...coursePaid, [courseId]: Number(value) })}
                  />
                )}
                <div>
                <Input
                  label="الخصم (MAD)"
                  type="number"
                  value={discounts[courseId] || 0}
                  onChange={(value) => {
                    const price = courses.find((course) => course.id === courseId)?.price || 0;
                    setDiscounts({ ...discounts, [courseId]: Math.max(0, Math.min(Number(value), price)) });
                  }}
                />
                <p className="mt-1 text-[10px] font-bold text-[#008a55]">
                  الصافي: {money(Math.max(0, (courses.find((course) => course.id === courseId)?.price || 0) - (discounts[courseId] || 0)))}
                </p>
              </div>
              </div>
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

export function MinusIcon() {
  return <span className="text-lg leading-none">−</span>;
}
