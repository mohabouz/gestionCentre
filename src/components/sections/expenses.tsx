"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { money, today } from "@/lib/centman-store";


import { Actions, Input, Modal, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";

export function Expenses({ data, createExpense, deleteExpense }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", amount: "" });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const saved = await createExpense?.({
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      date: today,
    });
    if (saved) {
      setForm({ title: "", category: "", amount: "" });
      setOpen(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="المصاريف"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} className="ml-2 inline" />
            إضافة مصروف
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex justify-between">
          <div>
            <p className="text-sm font-black">مصروفات الشهر</p>
            <p className="mt-1 text-xs text-[#8d9e95]">
              الإجمالي: {money(data.expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
        </div>
        <Table>
          <Th>الوصف</Th>
          <Th>التصنيف</Th>
          <Th>المبلغ</Th>
          <Th>التاريخ</Th>
          <Th>إجراء</Th>
          {data.expenses.map((e) => (
            <tr key={e.id}>
              <Td>
                <b>{e.title}</b>
              </Td>
              <Td>{e.category}</Td>
              <Td className="font-bold text-[#d56558]">{money(e.amount)}</Td>
              <Td>{e.date}</Td>
              <Td>
                <Actions
                  onDelete={() => deleteExpense?.(e.id)}
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {open && (
        <Modal title="إضافة مصروف" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="الوصف"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />
            <Input
              label="التصنيف"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
            <Input
              label="المبلغ"
              type="number"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
            />
            <div className="flex justify-end">
              <Button type="submit">حفظ المصروف</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
