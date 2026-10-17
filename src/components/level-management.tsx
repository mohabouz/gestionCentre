"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookOpen, Edit3, GraduationCap, School, X } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import type { Level, LevelCurriculum, LevelCycle } from "@/lib/centman-store";

type CycleFilter = "الكل" | LevelCycle;
type CurriculumFilter = "ALL" | LevelCurriculum;

const cycleConfig: Record<LevelCycle, { title: string; icon: typeof School; color: string }> = {
  ابتدائي: {
    title: "التعليم الابتدائي",
    icon: School,
    color: "bg-[#e6f5ee] text-[#008a55]",
  },
  إعدادي: {
    title: "التعليم الإعدادي",
    icon: BookOpen,
    color: "bg-[#e4e8fd] text-[#5054c0]",
  },
  تأهيلي: {
    title: "التعليم الثانوي التأهيلي",
    icon: GraduationCap,
    color: "bg-[#faf4de] text-[#9a7900]",
  },
};

const filters: Array<{ value: CycleFilter; label: string }> = [
  { value: "الكل", label: "جميع المستويات" },
  { value: "ابتدائي", label: "الابتدائي" },
  { value: "إعدادي", label: "الإعدادي" },
  { value: "تأهيلي", label: "الثانوي التأهيلي" },
];

const curriculumFilters: Array<{ value: CurriculumFilter; label: string }> = [
  { value: "ALL", label: "جميع المسارات" },
  { value: "MOROCCAN", label: "المسار العام" },
  { value: "INTERNATIONAL", label: "المسار الدولي" },
];

export function LevelManagement({
  levels,
  onUpdate,
}: {
  levels: Level[];
  onUpdate: (levels: Level[]) => void;
}) {
  const [filter, setFilter] = useState<CycleFilter>("الكل");
  const [curriculum, setCurriculum] = useState<CurriculumFilter>("ALL");
  const [editing, setEditing] = useState<Level | null>(null);
  const visibleLevels = useMemo(
    () =>
      levels
        .filter(
          (level) =>
            (curriculum === "ALL" || level.curriculum === curriculum) &&
            (filter === "الكل" || level.cycle === filter),
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [curriculum, filter, levels],
  );

  const saveLevel = (level: Level) => {
    onUpdate(levels.map((item) => (item.id === level.id ? level : item)));
    setEditing(null);
  };

  return (
    <>
      <PageTitle eyebrow="البرامج الدراسية" title="المستويات الدراسية" />

      <Card className="mb-5 !p-3 sm:!p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center justify-between gap-3 xl:w-44 xl:shrink-0">
            <div>
              <h3 className="text-sm font-black text-[#17251f]">تصفية المستويات</h3>
              <p className="mt-0.5 text-[11px] text-[#84938b]">{visibleLevels.length} مستوى ظاهر</p>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f4f5fa] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {curriculumFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCurriculum(item.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  curriculum === item.value
                    ? "bg-white text-[#5054c0] shadow-sm ring-1 ring-[#dfe1f1]"
                    : "text-[#6f7191] hover:bg-white/70"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f1f7f3] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  filter === item.value
                    ? "bg-white text-[#008a55] shadow-sm ring-1 ring-[#dbe7df]"
                    : "text-[#60766b] hover:bg-white/70"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleLevels.map((level) => {
          const config = cycleConfig[level.cycle];
          const Icon = config.icon;
          return (
            <Card key={level.id} className="group relative overflow-hidden !p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(28,67,47,0.08)]">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-[#17251f]">{level.nameAr}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-[#84938b]">{level.nameFr}</p>
                </div>
                <button
                  type="button"
                  aria-label={`تعديل ${level.nameAr}`}
                  onClick={() => setEditing(level)}
                  className="shrink-0 rounded-lg p-2 text-[#84938b] transition-colors hover:bg-[#e4e8fd] hover:text-[#5054c0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5054c0]"
                >
                  <Edit3 size={15} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf1ee] pt-3">
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  <span className="rounded-lg bg-[#f5f7f6] px-2.5 py-1 text-[10px] font-black text-[#697b70]">
                    {level.abbreviation}
                  </span>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${level.curriculum === "INTERNATIONAL" ? "bg-[#e4e8fd] text-[#5054c0]" : "bg-[#e6f5ee] text-[#008a55]"}`}>
                    {level.curriculum === "INTERNATIONAL" ? "المسار الدولي" : "المسار العام"}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-[#84938b]">{config.title.replace("التعليم ", "")}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {!visibleLevels.length && (
        <Card>
          <p className="py-12 text-center text-sm text-[#84938b]">لا توجد مستويات في هذا السلك حالياً</p>
        </Card>
      )}

      {editing && <LevelEditor level={editing} onClose={() => setEditing(null)} onSave={saveLevel} />}
    </>
  );
}

function LevelEditor({
  level,
  onClose,
  onSave,
}: {
  level: Level;
  onClose: () => void;
  onSave: (level: Level) => void;
}) {
  const [form, setForm] = useState(level);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      nameAr: form.nameAr.trim(),
      nameFr: form.nameFr.trim(),
      abbreviation: form.abbreviation.trim().toUpperCase(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17251f]/35 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#17251f]">تعديل المستوى الدراسي</h3>
            <p className="mt-1 text-xs text-[#84938b]">{cycleConfig[level.cycle].title}</p>
          </div>
          <button type="button" aria-label="إغلاق" onClick={onClose} className="rounded-lg p-2 text-[#84938b] hover:bg-[#f2f7f4]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <LevelField label="الاسم بالعربية" value={form.nameAr} onChange={(nameAr) => setForm({ ...form, nameAr })} />
          <LevelField label="الاسم بالفرنسية" value={form.nameFr} onChange={(nameFr) => setForm({ ...form, nameFr })} />
          <LevelField label="الاختصار" value={form.abbreviation} onChange={(abbreviation) => setForm({ ...form, abbreviation })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={!form.nameAr.trim() || !form.nameFr.trim() || !form.abbreviation.trim()}>حفظ التعديلات</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LevelField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-right">
      <span className="mb-2 block text-xs font-bold text-[#60766b]">{label}</span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#dfe8e2] bg-[#f8faf9] px-3 py-3 text-sm outline-none focus:border-[#00a060]"
      />
    </label>
  );
}
