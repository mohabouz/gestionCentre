"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Payout, Teacher, currentMonth, formatBillingMonth, money } from "@/lib/centman-store";
import { printTeacherPaymentReport } from "@/lib/payout-report";


import { EmptyState, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";
import { TeacherReport } from "@/components/sections/teacher-report";


export function Payouts({ data, generatePayouts, adjustPayout }: Props) {
  const [reportTeacher, setReportTeacher] = useState<Teacher | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const historicalPayouts = data.payouts.filter((payout) => payout.month !== month);
  const generateMonthlyPayouts = () => void generatePayouts?.(month);
  const pay = (payout: Payout) => void adjustPayout?.(payout.id, "finalize");
  const returnPayoutToDraft = (payout: Payout) => void adjustPayout?.(payout.id, "draft");
  const cancelPayoutDraft = (payout: Payout) => void adjustPayout?.(payout.id, "cancel");
  const restorePayoutDraft = (payout: Payout) => void adjustPayout?.(payout.id, "draft");
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="رواتب الأساتذة"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="rounded-xl border border-[#dce7df] bg-white px-3 py-2 text-xs font-bold text-[#60766b]">
              <span className="ml-2">الشهر</span>
              <input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className="bg-transparent outline-none" />
            </label>
            <Button onClick={generateMonthlyPayouts}>توليد رواتب الشهر</Button>
          </div>
        }
      />
      <Card>
        <div className="mb-5">
          <p className="text-sm font-black text-[#17251f]">رواتب {formatBillingMonth(month)}</p>
          <p className="mt-1 text-xs text-[#6c6c6c]">ولّد مسودات الشهر، راجع التقرير التفصيلي، ثم اعتمد الصرف يدوياً.</p>
        </div>
        <Table>
          <Th>الأستاذ</Th>
          <Th>الحصص</Th>
          <Th>الطلاب</Th>
          <Th>الإيراد</Th>
          <Th>العمولة</Th>
          <Th>المستحق</Th>
          <Th>إجراءات</Th>
          {data.teachers.map((t) => {
            const payout = data.payouts.find(
              (p) => p.teacherId === t.id && p.month === month,
            );
            return (
              <tr key={t.id}>
                <Td>
                  <button
                    onClick={() => setReportTeacher(t)}
                    className="font-bold text-[#5054c0] hover:underline"
                  >
                    {t.name}
                  </button>
                </Td>
                <Td>{t.sessions}</Td>
                <Td>{payout ? payout.studentCount : "—"}</Td>
                <Td>{payout ? money(payout.revenue) : "—"}</Td>
                <Td>{payout ? `${payout.commission}%` : "—"}</Td>
                <Td className="font-black text-[#5054c0]">
                  {payout ? money(payout.amount) : "—"}
                </Td>
                <Td>
                  {payout ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${payout.status === "مدفوعة" ? "bg-[#e4e8fd] text-[#3a3b9b]" : payout.status === "ملغاة" ? "bg-[#f1f1f1] text-[#8a8a8a]" : "bg-[#faf4de] text-[#a08500]"}`}
                      >
                        {payout.status}
                      </span>
                      {payout.status === "مسودة" && (
                        <>
                          <Button onClick={() => pay(payout)}>
                            اعتماد نهائي
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => cancelPayoutDraft(payout)}
                          >
                            إلغاء المسودة
                          </Button>
                        </>
                      )}
                      {payout.status === "مدفوعة" && (
                        <>
                          <button
                            type="button"
                            aria-label={`طباعة تقرير أداء ${t.name}`}
                            title="طباعة تقرير المجموعات والتلاميذ المؤدين"
                            onClick={() => printTeacherPaymentReport(data, t, payout.month)}
                            className="rounded-lg border border-[#dbe7df] bg-white p-2.5 text-[#53685d] hover:bg-[#f2f7f4]"
                          >
                            <Printer size={15} />
                          </button>
                          <Button
                            variant="outline"
                            onClick={() => returnPayoutToDraft(payout)}
                          >
                            إرجاع لمسودة
                          </Button>
                        </>
                      )}
                      {payout.status === "ملغاة" && (
                        <Button
                          variant="outline"
                          onClick={() => restorePayoutDraft(payout)}
                        >
                          إعادة للمراجعة
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#84938b]">ولّد رواتب الشهر من الأعلى</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <Card className="mt-5">
        <h3 className="mb-4 font-black text-[#292929]">سجل الأشهر السابقة</h3>
        {historicalPayouts.length ? (
          <Table>
            <Th>الأستاذ</Th>
            <Th>الشهر</Th>
            <Th>الطلاب</Th>
            <Th>المستحق</Th>
            <Th>الحالة</Th>
            {historicalPayouts.map((p) => (
              <tr key={p.id}>
                <Td>{p.teacher}</Td>
                <Td>{p.month}</Td>
                <Td>{p.studentCount}</Td>
                <Td>{money(p.amount)}</Td>
                <Td>
                  {p.status}
                  {p.paidAt ? ` • ${p.paidAt}` : ""}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState text="لم يتم اعتماد رواتب سابقة بعد" />
        )}
      </Card>
      {reportTeacher && (
        <TeacherReport
          teacher={reportTeacher}
          data={data}
          month={month}
          onClose={() => setReportTeacher(null)}
        />
      )}
    </>
  );
}

