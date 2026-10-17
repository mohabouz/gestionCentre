"use client";

import { useEffect, useRef, useState } from "react";
import { initial, type Data } from "@/lib/section-data";
import { refreshDraftPayouts } from "@/lib/payroll";
import type { Expense } from "@/lib/centman-store";

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

  return {
    data,
    update,
    deleteStudent,
    createExpense,
    deleteExpense,
    toast,
  };
}
