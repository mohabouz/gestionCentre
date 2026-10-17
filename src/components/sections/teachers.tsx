"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, PageTitle } from "@/components/centman-shell";
import { Teacher } from "@/lib/centman-store";


import { Actions, Input, Modal, Table, Td, Th } from "@/components/sections/shared-ui";
import type { Props } from "@/components/sections/types";

export function Teachers({ data, update }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    commission: "60",
  });
  const save = (e: FormEvent) => {
    e.preventDefault();
    const teacher: Teacher = {
      id: editing?.id || Date.now(),
      name: form.name,
      specialty: form.specialty,
      commission: Number(form.commission),
      students: editing?.students || 0,
      sessions: editing?.sessions || 0,
    };
    update(
      {
        ...data,
        teachers: editing
          ? data.teachers.map((t) => (t.id === editing.id ? teacher : t))
          : [...data.teachers, teacher],
      },
      "تم حفظ الأستاذ",
    );
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="إدارة الفريق"
        title="الأساتذة"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: "", specialty: "", commission: "60" });
              setOpen(true);
            }}
          >
            <Plus size={15} className="ml-2 inline" />
            إضافة أستاذ
          </Button>
        }
      />
      <Card>
        <Table>
          <Th>الأستاذ</Th>
          <Th>التخصص</Th>
          <Th>العمولة</Th>
          <Th>الطلاب</Th>
          <Th>الحصص</Th>
          <Th>إجراء</Th>
          {data.teachers.map((t) => (
            <tr key={t.id}>
              <Td>
                <b>{t.name}</b>
              </Td>
              <Td>{t.specialty}</Td>
              <Td>{t.commission}%</Td>
              <Td>{t.students}</Td>
              <Td>{t.sessions}</Td>
              <Td>
                <Actions
                  onEdit={() => {
                    setEditing(t);
                    setForm({
                      name: t.name,
                      specialty: t.specialty,
                      commission: String(t.commission),
                    });
                    setOpen(true);
                  }}
                  onDelete={() =>
                    update(
                      {
                        ...data,
                        teachers: data.teachers.filter((x) => x.id !== t.id),
                      },
                      "تم حذف الأستاذ",
                    )
                  }
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {open && (
        <Modal
          title={editing ? "تعديل الأستاذ" : "إضافة أستاذ"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save} className="space-y-4">
            <Input
              label="الاسم"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Input
              label="التخصص"
              value={form.specialty}
              onChange={(v) => setForm({ ...form, specialty: v })}
            />
            <Input
              label="نسبة العمولة %"
              type="number"
              value={form.commission}
              onChange={(v) => setForm({ ...form, commission: v })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
