"use client";

import { useEffect, useState } from "react";
import { initial, type Data } from "@/lib/section-data";
import type {
  Attendance,
  Course,
  Enrollment,
  Expense,
  Level,
  Room,
  Session,
  Teacher,
} from "@/lib/centman-store";
import { resolveSessionCourse } from "@/lib/session-course";
import { today } from "@/lib/centman-store";

export function useSectionData(section: string) {
  const [data, setData] = useState<Data>(initial);
  const [toast, setToast] = useState("جاري تحميل البيانات...");
  const stateUrl = `/api/state?section=${encodeURIComponent(section)}`;

  useEffect(() => {
    setData(initial);
    fetch(stateUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("database");
        return response.json();
      })
      .then((saved) => {
        setData({ ...initial, ...saved });
        setToast("");
      })
      .catch(() => setToast("تعذر تحميل البيانات من قاعدة البيانات"));
  }, [stateUrl]);

  const deleteStudent = async (id: number) => {
    const previous = data;
    const next = {
      ...data,
      students: data.students.filter((student) => student.id !== id),
      enrollments: data.enrollments.filter((enrollment) => enrollment.studentId !== id),
      payments: data.payments.filter((payment) => payment.studentId !== id),
      collections: data.collections.filter((collection) =>
        data.payments.every(
          (payment) => payment.id !== collection.paymentId || payment.studentId !== id,
        ),
      ),
      attendances: data.attendances.filter((attendance) => attendance.studentId !== id),
    };
    setData(next);

    try {
      const deleted = await fetch(`/api/students/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!deleted.ok) {
        const details = await deleted.json().catch(() => null);
        throw new Error(details?.error || "database");
      }

      // Refresh once so local cascade results and the concurrency token match
      // the database without uploading or rebuilding unrelated tables.
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حذف التلميذ");
    } catch (error) {
      setData(previous);
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حذف التلميذ",
      );
    }

    window.setTimeout(() => setToast(""), 2200);
  };

  const createExpense = async (expense: Omit<Expense, "id">) => {
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");

      setData((current) => ({
        ...current,
        expenses: [...current.expenses, result],
      }));
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تمت إضافة المصروف");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر إضافة المصروف",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const deleteExpense = async (id: number) => {
    const previous = data;
    setData({
      ...data,
      expenses: data.expenses.filter((expense) => expense.id !== id),
    });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حذف المصروف");
    } catch (error) {
      setData(previous);
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حذف المصروف",
      );
    }
    window.setTimeout(() => setToast(""), 2200);
  };

  const saveTeacher = async (
    teacher: Pick<Teacher, "name" | "specialty" | "commission"> & { id?: number },
  ) => {
    try {
      const response = await fetch(
        teacher.id ? `/api/teachers/${teacher.id}` : "/api/teachers",
        {
          method: teacher.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teacher),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");

      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حفظ الأستاذ");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ الأستاذ",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const deleteTeacher = async (id: number) => {
    const previous = data;
    setData({
      ...data,
      teachers: data.teachers.filter((teacher) => teacher.id !== id),
    });
    try {
      const response = await fetch(`/api/teachers/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حذف الأستاذ");
    } catch (error) {
      setData(previous);
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حذف الأستاذ",
      );
    }
    window.setTimeout(() => setToast(""), 2200);
  };

  const saveCourse = async (course: Course) => {
    try {
      const response = await fetch(
        course.id ? `/api/courses/${course.id}` : "/api/courses",
        {
          method: course.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(course),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حفظ المادة أو الباقة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ المادة أو الباقة",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const deleteCourse = async (id: number) => {
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      const refreshed = await fetch(stateUrl, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      setData({ ...initial, ...(await refreshed.json()) });
      setToast("تم حذف المادة أو الباقة والتسجيلات المرتبطة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حذف المادة أو الباقة",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const createEnrollment = async (enrollment: Omit<Enrollment, "id">) => {
    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollment),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast("تمت إضافة التسجيل وتوليد دفعة الشهر");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر إضافة التسجيل");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const saveLevel = async (level: Level) => {
    try {
      const response = await fetch(`/api/levels/${level.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(level),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast("تم حفظ تعديلات المستوى");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر حفظ المستوى");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const refreshAfterMutation = async () => {
    const refreshed = await fetch(stateUrl, { cache: "no-store" });
    if (!refreshed.ok) throw new Error("database");
    setData({ ...initial, ...(await refreshed.json()) });
  };

  const saveSession = async (session: Session) => {
    try {
      const linkedCourse = resolveSessionCourse(session, data.courses, data.levels);
      if (!linkedCourse) throw new Error("تعذر تحديد مادة ومستوى الحصة");
      const normalizedSession = {
        ...session,
        courseId: linkedCourse.id,
        course: linkedCourse.name,
      };
      const response = await fetch(
        session.id ? `/api/sessions/${session.id}` : "/api/sessions",
        {
          method: session.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalizedSession),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(session.id ? "تم تعديل الحصة" : "تمت إضافة الحصة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ الحصة",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const saveRoom = async (room: Pick<Room, "name"> & { id?: number }) => {
    try {
      const response = await fetch(room.id ? `/api/rooms/${room.id}` : "/api/rooms", {
        method: room.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(room.id ? "تم تعديل القاعة" : "تمت إضافة القاعة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ القاعة",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const deleteRoom = async (id: number) => {
    try {
      const response = await fetch(`/api/rooms/${id}`, { method: "DELETE", cache: "no-store" });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      await refreshAfterMutation();
      setToast("تم حذف القاعة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حذف القاعة",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const saveAttendance = async (
    sessionId: number,
    occurrenceDate: string,
    records: Array<Pick<Attendance, "studentId" | "status">>,
  ) => {
    try {
      const response = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, occurrenceDate, records }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast("تم حفظ الحضور");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ الحضور",
      );
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const registerPaymentRequest = async (paymentId: number, amount: number) => {
    const response = await fetch(`/api/payments/${paymentId}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date: today }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || "database");
    return result;
  };

  const registerPayment = async (paymentId: number, amount: number) => {
    try {
      const result = await registerPaymentRequest(paymentId, amount);
      await refreshAfterMutation();
      setToast(result?.partial ? "تم تسجيل دفعة جزئية" : "تم تسجيل الدفعة وإصدار الوصل");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر تسجيل الدفعة");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const registerPayments = async (
    payments: Array<{ paymentId: number; amount: number }>,
  ) => {
    try {
      for (const payment of payments.filter((item) => item.amount > 0)) {
        await registerPaymentRequest(payment.paymentId, payment.amount);
      }
      await refreshAfterMutation();
      setToast("تم تسجيل دفعات التلميذ");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر تسجيل الدفعات");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const adjustPayment = async (
    paymentId: number,
    action: "revise" | "draft" | "cancel",
    amount?: number,
  ) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount, date: today }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(action === "revise" ? "تم تعديل الدفعة" : action === "draft" ? "تمت إعادة الدفعة إلى مسودة" : "تم إلغاء مسودة الدفعة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر تعديل الدفعة");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const generatePayouts = async (month: string) => {
    try {
      const response = await fetch("/api/payouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(result.created ? `تم توليد ${result.created} راتب` : "رواتب هذا الشهر مولدة مسبقاً وتم تحديثها");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر توليد الرواتب");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const adjustPayout = async (
    payoutId: number,
    action: "finalize" | "draft" | "cancel",
  ) => {
    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: today }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(action === "finalize" ? "تم اعتماد وصرف الراتب" : action === "cancel" ? "تم إلغاء مسودة الراتب" : "تمت إعادة الراتب إلى مسودة");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر تعديل الراتب");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const generateMonthlyPayments = async (month: string) => {
    try {
      const response = await fetch("/api/payments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(result.created ? `تم توليد ${result.created} دفعة` : "دفعات هذا الشهر مولدة مسبقاً");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر توليد الدفعات");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const collectAnnualFee = async (
    studentId: number,
    year: number,
    amount: number,
  ) => {
    try {
      const response = await fetch("/api/annual-fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, year, amount, date: today }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(result.partial ? "تم تسجيل دفعة جزئية للاشتراك السنوي" : "تم تسديد الاشتراك السنوي");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر تسجيل الاشتراك السنوي");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  const saveStudent = async (
    student: import("@/lib/centman-store").Student,
    courseIds: number[],
    paidAmounts: { annual: number; courses: Record<number, number>; discounts: Record<number, number> },
  ) => {
    try {
      const response = await fetch(student.id ? `/api/students/${student.id}` : "/api/students", {
        method: student.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student, courseIds, paidAmounts, date: today }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "database");
      await refreshAfterMutation();
      setToast(student.id ? "تم حفظ بيانات التلميذ وتحديث التسجيلات" : "تم حفظ التلميذ وتسجيل الدفعات");
      window.setTimeout(() => setToast(""), 2200);
      return true;
    } catch (error) {
      setToast(error instanceof Error && error.message !== "database" ? error.message : "تعذر حفظ التلميذ");
      window.setTimeout(() => setToast(""), 2200);
      return false;
    }
  };

  return {
    data,
    deleteStudent,
    createExpense,
    deleteExpense,
    saveTeacher,
    deleteTeacher,
    saveCourse,
    deleteCourse,
    createEnrollment,
    saveLevel,
    saveSession,
    saveRoom,
    deleteRoom,
    saveAttendance,
    registerPayment,
    registerPayments,
    adjustPayment,
    generatePayouts,
    adjustPayout,
    generateMonthlyPayments,
    collectAnnualFee,
    saveStudent,
    toast,
  };
}
