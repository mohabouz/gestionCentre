"use client";

import { useEffect, useRef, useState } from "react";
import { initial, type Data } from "@/lib/section-data";
import { refreshDraftPayouts } from "@/lib/payroll";
import type { Course, Expense, Room, Session, Teacher } from "@/lib/centman-store";
import { resolveSessionCourse } from "@/lib/session-course";

export function useSectionData() {
  const [data, setData] = useState<Data>(initial);
  const [toast, setToast] = useState("جاري تحميل البيانات...");
  const stateVersion = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("database");
        stateVersion.current = response.headers.get("etag");
        return response.json();
      })
      .then((saved) => {
        setData({ ...initial, ...saved });
        setToast("");
      })
      .catch(() => setToast("تعذر تحميل البيانات من قاعدة البيانات"));
  }, []);

  const update = async (next: Data, message = "تم حفظ التغييرات") => {
    const stateToSave = refreshDraftPayouts(data, next);
    setData(stateToSave);

    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(stateVersion.current ? { "If-Match": stateVersion.current } : {}),
        },
        body: JSON.stringify(stateToSave),
        cache: "no-store",
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "database");
      }
      stateVersion.current = response.headers.get("etag");
      setData(await response.json());
      setToast(message);
    } catch (error) {
      setData(data);
      setToast(
        error instanceof Error && error.message !== "database"
          ? error.message
          : "تعذر حفظ البيانات في قاعدة البيانات",
      );
    }

    window.setTimeout(() => setToast(""), 2200);
  };

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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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

      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("database");
      stateVersion.current = refreshed.headers.get("etag");
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

  const refreshAfterMutation = async () => {
    const refreshed = await fetch("/api/state", { cache: "no-store" });
    if (!refreshed.ok) throw new Error("database");
    stateVersion.current = refreshed.headers.get("etag");
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

  return {
    data,
    update,
    deleteStudent,
    createExpense,
    deleteExpense,
    saveTeacher,
    deleteTeacher,
    saveCourse,
    deleteCourse,
    saveSession,
    saveRoom,
    deleteRoom,
    toast,
  };
}
