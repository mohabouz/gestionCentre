"use client";

import { BookOpen, GraduationCap, School } from "lucide-react";
import { Card, PageTitle } from "@/components/centman-shell";
import type { Level, LevelCycle } from "@/lib/centman-store";

const cycleConfig: Array<{
  cycle: LevelCycle;
  title: string;
  description: string;
  icon: typeof School;
  color: string;
}> = [
  {
    cycle: "ابتدائي",
    title: "التعليم الابتدائي",
    description: "من المستوى الأول إلى المستوى السادس ابتدائي",
    icon: School,
    color: "bg-[#e6f5ee] text-[#008a55]",
  },
  {
    cycle: "إعدادي",
    title: "التعليم الإعدادي",
    description: "الأولى والثانية والثالثة إعدادي",
    icon: BookOpen,
    color: "bg-[#e4e8fd] text-[#5054c0]",
  },
  {
    cycle: "تأهيلي",
    title: "التعليم الثانوي التأهيلي",
    description: "الجذع المشترك والأولى والثانية باكالوريا",
    icon: GraduationCap,
    color: "bg-[#faf4de] text-[#9a7900]",
  },
];

export function LevelManagement({ levels }: { levels: Level[] }) {
  const moroccanLevels = levels
    .filter((level) => level.curriculum === "MOROCCAN")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <>
      <PageTitle
        eyebrow="البرنامج المغربي"
        title="المستويات الدراسية"
      />
      <div className="grid gap-5 xl:grid-cols-3">
        {cycleConfig.map(({ cycle, title, description, icon: Icon, color }) => {
          const cycleLevels = moroccanLevels.filter((level) => level.cycle === cycle);
          return (
            <Card key={cycle} className="h-fit">
              <div className="mb-5 flex items-start gap-3 border-b border-[#edf1ee] pb-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={21} />
                </span>
                <div>
                  <h3 className="font-black text-[#17251f]">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#84938b]">{description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {cycleLevels.map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center justify-between rounded-xl border border-[#edf1ee] bg-[#fafcfb] px-4 py-3"
                  >
                    <span className="text-sm font-bold text-[#31463c]">{level.nameAr}</span>
                    <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-[#697b70] shadow-sm">
                      {level.abbreviation}
                    </span>
                  </div>
                ))}
                {!cycleLevels.length && (
                  <p className="py-8 text-center text-xs text-[#84938b]">
                    لا توجد مستويات في هذا السلك حالياً
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
