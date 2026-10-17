"use client";

import { useEffect, useRef, useState } from "react";
import { initial, type Data } from "@/lib/section-data";
import { refreshDraftPayouts } from "@/lib/payroll";

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
    const next = {
      ...data,
      students: data.students.filter((student) => student.id !== id),
      enrollments: data.enrollments.filter((enrollment) => enrollment.studentId !== id),
      payments: data.payments.filter((payment) => payment.studentId !== id),
    };
    await update(next);
    setToast("تم حذف الطالب");
  };

  return { data, update, deleteStudent, toast };
}
