"use client";

import { useEffect, useRef, useState } from "react";
import { Course, Level, money } from "@/lib/centman-store";
import { courseLevelLabel } from "@/lib/course-level";
import { useEscapeLayer } from "@/components/escape-layer";

export { courseLevelLabel } from "@/lib/course-level";

export function CoursePicker({
  courses,
  levels,
  value,
  onChange,
  placeholder = "اختر المادة أو الباقة",
  allLabel,
  showPrice = false,
  compact = false,
  className = "",
}: {
  courses: Course[];
  levels: Level[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allLabel?: string;
  showPrice?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEscapeLayer(open, () => {
    setOpen(false);
    setSearch("");
  });
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const selected = courses.find((course) => Number(course.id) === Number(value));
  const filtered = courses.filter((course) =>
    `${course.name} ${courseLevelLabel(course, levels)} ${course.teacher || ""}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const choose = (next: number | null) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };
  const size = compact ? "rounded-lg p-2.5 text-xs" : "rounded-xl p-3 text-sm";
  return (
    <div ref={root} className={`relative text-right ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 border border-[#dce7df] bg-white ${size}`}
      >
        <span className="truncate">
          {selected ? selected.name : allLabel && value == null ? allLabel : placeholder}
        </span>
        {selected && (
          <span className="shrink-0 text-xs font-black text-[#5054c0]">
            {courseLevelLabel(selected, levels) || "بدون مستوى"}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-[#dce7df] bg-white shadow-xl">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن المادة أو المستوى"
            aria-label="ابحث عن المادة أو المستوى"
            className="w-full border-b border-[#e5e5e5] px-3 py-2.5 text-xs outline-none focus:border-[#5054c0]"
          />
          <div role="listbox" className="max-h-56 overflow-y-auto overscroll-contain p-1">
            {allLabel && (
              <button
                type="button"
                role="option"
                aria-selected={value == null}
                onClick={() => choose(null)}
                className="flex w-full rounded-lg px-3 py-2 text-right text-xs hover:bg-[#f4f5ff] aria-selected:bg-[#f4f5ff]"
              >
                {allLabel}
              </button>
            )}
            {filtered.map((course) => (
              <button
                key={course.id}
                type="button"
                role="option"
                aria-selected={Number(course.id) === Number(value)}
                onClick={() => choose(course.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-xs hover:bg-[#f4f5ff] aria-selected:bg-[#f4f5ff]"
              >
                <span className="min-w-0">
                  <span className="block truncate">{course.name}</span>
                  {showPrice && (
                    <span className="block truncate text-[10px] text-[#84938b]">
                      {course.type} • {money(course.price)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-black text-[#5054c0]">
                  {courseLevelLabel(course, levels) || "بدون مستوى"}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p className="px-3 py-4 text-center text-xs text-[#84938b]">
                لا توجد مواد مطابقة
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
