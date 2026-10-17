"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronLeft, CircleAlert, WalletCards } from "lucide-react";
import { useEscapeLayer } from "@/components/escape-layer";
import type { Student } from "@/lib/centman-store";
import { money } from "@/lib/centman-store";

export function LatePaymentNotifications({
  students,
  enabled,
}: {
  students: Student[];
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const lateStudents = enabled
    ? students
        .filter((student) => student.status === "نشط" && student.due > 0)
        .sort((left, right) => right.due - left.due)
    : [];
  const totalDue = lateStudents.reduce((sum, student) => sum + student.due, 0);

  useEscapeLayer(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-xl border bg-white p-2.5 transition ${
          open
            ? "border-[#e1a09a] text-[#c4584e]"
            : "border-[#e1e9e4] text-[#71857a] hover:border-[#cbd9d1]"
        }`}
      >
        <Bell size={18} />
        {lateStudents.length > 0 && (
          <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#f5f7f6] bg-[#d85f53] px-1 text-[9px] font-black text-white">
            {lateStudents.length > 99 ? "+99" : lateStudents.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+0.65rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#dfe7e2] bg-white text-right shadow-[0_18px_50px_rgba(31,54,43,0.18)] ltr:right-0 rtl:left-0">
          <div className="flex items-center justify-between border-b border-[#edf1ef] px-4 py-3.5">
            <div>
              <h2 className="text-sm font-black text-[#20382d]">التنبيهات</h2>
              <p className="mt-0.5 text-[10px] text-[#84958b]">
                المستحقات التي تحتاج إلى متابعة
              </p>
            </div>
            {lateStudents.length > 0 && (
              <span className="rounded-full bg-[#fff0ee] px-2.5 py-1 text-[10px] font-black text-[#bd4e45]">
                {lateStudents.length} متأخر
              </span>
            )}
          </div>

          {lateStudents.length ? (
            <>
              <div className="max-h-[22rem] overflow-y-auto p-2">
                {lateStudents.slice(0, 6).map((student) => (
                  <Link
                    key={student.id}
                    href={`/late-students?pay=${student.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-[#faf5f3]"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff0ee] text-[#c4584e]">
                      <CircleAlert size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-[#2b4036]">
                        دفعة متأخرة — {student.name}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[#7d8e85]">
                        {student.course || "اشتراك الطالب"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-black text-[#c4584e]">
                      {money(student.due)}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="border-t border-[#edf1ef] bg-[#fafcfb] p-3">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#6f8177]">إجمالي المستحقات</span>
                  <strong className="text-[#bd4e45]">{money(totalDue)}</strong>
                </div>
                <Link
                  href="/late-students"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#00a060] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#008a55]"
                >
                  متابعة جميع الدفعات
                  <ChevronLeft size={15} />
                </Link>
              </div>
            </>
          ) : (
            <div className="px-5 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f7ef] text-[#00a060]">
                <WalletCards size={21} />
              </span>
              <p className="mt-3 text-sm font-black text-[#30483d]">
                لا توجد دفعات متأخرة
              </p>
              <p className="mt-1 text-[10px] text-[#8b9a92]">
                كل المستحقات مسددة حالياً
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
