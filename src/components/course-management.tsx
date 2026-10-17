"use client";

import { FormEvent, useState } from "react";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button, Card, ConfirmDialog, PageTitle } from "@/components/centman-shell";
import { CoursePicker, courseLevelLabel } from "@/components/course-picker";
import type { Course, Enrollment, Level, Student, Teacher } from "@/lib/centman-store";
import { money, today } from "@/lib/centman-store";

type Data = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  levels: Level[];
  enrollments: Enrollment[];
};

type Props = {
  data: Data;
  update: (data: Data, message?: string) => void;
  saveCourse: (course: Course) => Promise<boolean>;
  deleteCourseById: (id: number) => Promise<boolean>;
};

const nextId = (items: Array<{ id: number }>) => Math.max(0, ...items.map((item) => item.id)) + 1;

export function CourseManagement({ data, update, saveCourse: persistCourse, deleteCourseById }: Props) {
  const [tab, setTab] = useState<"مادة" | "باقة">("مادة");
  const [courseEditor, setCourseEditor] = useState<Course | null>(null);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const visibleCourses = data.courses.filter((course) => course.type === tab);
  const enrolledCount = (courseId: number) =>
    data.enrollments.filter((enrollment) => enrollment.courseId === courseId && enrollment.status === "نشط").length;

  const saveCourse = async (course: Course) => {
    if (await persistCourse(course)) setCourseEditor(null);
  };

  return (
    <>
      <PageTitle
        eyebrow="البرامج التعليمية"
        title="المواد والباقات"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setCourseEditor({ id: 0, name: "", type: tab, teacher: "", price: 0, enrolled: 0, levelIds: [] })}>
              <Plus size={15} className="ml-2 inline" />إضافة {tab}
            </Button>
            <Button variant="outline" onClick={() => setEnrollmentOpen(true)}>
              <Plus size={15} className="ml-2 inline" />إضافة تسجيل
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        {(["مادة", "باقة"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTab(type)}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold ${tab === type ? "bg-[#5054c0] text-white" : "bg-white text-[#6c6c6c]"}`}
          >
            {type === "مادة" ? "المواد" : "الباقات"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCourses.map((course) => {
          const levelLabel = courseLevelLabel(course, data.levels);
          return (
            <Card key={course.id}>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg bg-[#e4e8fd] px-2 py-1 text-[10px] font-bold text-[#3a3b9b]">{course.type}</span>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${levelLabel ? "bg-[#e6f5ee] text-[#008a55]" : "bg-[#fff3e8] text-[#a35b13]"}`}>
                    {levelLabel || "بدون مستوى"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button aria-label="تعديل" onClick={() => setCourseEditor(course)} className="rounded-lg bg-[#e4e8fd] p-2 text-[#5054c0]"><Edit3 size={14} /></button>
                  <button aria-label="حذف" onClick={() => setDeleteCourse(course)} className="rounded-lg bg-[#faf4de] p-2 text-[#a08500]"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="text-lg font-black text-[#292929]">{course.name}</h3>
              {course.type === "باقة" ? (
                <div className="mt-3 space-y-1 text-xs text-[#6c6c6c]">
                  {(course.subjectIds || []).map((subjectId) => {
                    const subject = data.courses.find((item) => item.id === subjectId);
                    return subject ? <p key={subject.id}>{subject.name} • {courseLevelLabel(subject, data.levels) || "بدون مستوى"} • {subject.teacher || "لم يحدد أستاذ"}</p> : null;
                  })}
                  {!course.subjectIds?.length && <p>لم تتم إضافة مواد للباقة</p>}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#6c6c6c]">{course.teacher || "لم يحدد أستاذ"}</p>
              )}
              <div className="mt-5 flex justify-between border-t border-[#f1f1f1] pt-4 text-xs">
                <button type="button" onClick={() => setRosterCourse(course)} className="font-bold text-[#5054c0] underline decoration-[#c7caf4] underline-offset-4 hover:text-[#3a3b9b]">{enrolledCount(course.id)} طالب مسجل</button>
                <b className="text-[#5054c0]">{money(course.price)}</b>
              </div>
            </Card>
          );
        })}
      </div>

      {!visibleCourses.length && <Card><div className="py-12 text-center text-sm text-[#6c6c6c]">لا توجد عناصر في هذا التصنيف</div></Card>}

      {courseEditor && (
        <CourseModal
          course={courseEditor}
          teachers={data.teachers}
          levels={data.levels}
          subjects={data.courses.filter((item) => item.type === "مادة")}
          onClose={() => setCourseEditor(null)}
          onSave={saveCourse}
        />
      )}
      {enrollmentOpen && (
        <EnrollmentModal
          students={data.students}
          courses={data.courses}
          levels={data.levels}
          enrollments={data.enrollments}
          onClose={() => setEnrollmentOpen(false)}
          onSave={(enrollment) => {
            if (data.enrollments.some((item) => item.studentId === enrollment.studentId && item.courseId === enrollment.courseId && item.status === "نشط")) return;
            update({ ...data, enrollments: [...data.enrollments, { ...enrollment, id: nextId(data.enrollments) }] }, "تمت إضافة التسجيل");
            setEnrollmentOpen(false);
          }}
        />
      )}
      {rosterCourse && <RosterModal course={rosterCourse} students={data.students.filter((student) => data.enrollments.some((enrollment) => enrollment.courseId === rosterCourse.id && enrollment.studentId === student.id && enrollment.status === "نشط"))} onClose={() => setRosterCourse(null)} />}
      {deleteCourse && (
        <ConfirmDialog
          title="تأكيد حذف المادة أو الباقة"
          message={`هل أنت متأكد من حذف ${deleteCourse.name}؟ سيتم حذف التسجيلات المرتبطة بها أيضاً.`}
          onCancel={() => setDeleteCourse(null)}
          onConfirm={async () => {
            if (await deleteCourseById(deleteCourse.id)) setDeleteCourse(null);
          }}
        />
      )}
    </>
  );
}

function CourseModal({ course, teachers, levels, subjects, onClose, onSave }: { course: Course; teachers: Teacher[]; levels: Level[]; subjects: Course[]; onClose: () => void; onSave: (course: Course) => void }) {
  const [form, setForm] = useState({ ...course, price: String(course.price) });
  const [subjectIds, setSubjectIds] = useState<number[]>(course.subjectIds || []);
  const [levelIds, setLevelIds] = useState<number[]>(course.levelIds?.length ? course.levelIds : course.levelId ? [course.levelId] : []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...form, price: Number(form.price), teacher: form.type === "باقة" ? "" : form.teacher, subjectIds: form.type === "باقة" ? subjectIds : undefined, levelIds });
  };
  return (
    <Modal title={course.id ? "تعديل المادة أو الباقة" : "إضافة مادة أو باقة"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="الاسم" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <LevelSelector levels={levels} selected={levelIds} onChange={setLevelIds} />
        {form.type === "مادة" ? (
          <TeacherPicker teachers={teachers} value={form.teacher} onChange={(teacher) => setForm({ ...form, teacher })} />
        ) : (
          <CheckboxList title="مواد الباقة والأساتذة" empty="أنشئ المواد أولاً قبل إنشاء الباقة.">
            {subjects.map((subject) => (
              <CheckRow key={subject.id} checked={subjectIds.includes(subject.id)} onChange={() => setSubjectIds((current) => current.includes(subject.id) ? current.filter((id) => id !== subject.id) : [...current, subject.id])}>
                <b>{subject.name}</b><small className="mr-2 text-[#8a8a8a]">{courseLevelLabel(subject, levels) || "بدون مستوى"} • {subject.teacher || "لم يحدد أستاذ"}</small>
              </CheckRow>
            ))}
          </CheckboxList>
        )}
        <Field label="السعر (MAD)" type="number" value={form.price} onChange={(price) => setForm({ ...form, price })} />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!levelIds.length || (form.type === "باقة" && !subjectIds.length)}>حفظ</Button></div>
      </form>
    </Modal>
  );
}

function LevelSelector({ levels, selected, onChange }: { levels: Level[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const availableLevels = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <CheckboxList title="المستويات الدراسية" empty="لا توجد مستويات متاحة">
      {availableLevels.map((level) => <CheckRow key={level.id} checked={selected.includes(level.id)} onChange={() => onChange(selected.includes(level.id) ? selected.filter((id) => id !== level.id) : [...selected, level.id])}><b>{level.nameAr}</b><small className="mr-2 text-[#8a8a8a]">{level.abbreviation} • {level.curriculum === "INTERNATIONAL" ? "المسار الدولي" : "المسار العام"}</small></CheckRow>)}
    </CheckboxList>
  );
}

function CheckboxList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-4"><p className="mb-3 text-xs font-bold text-[#6c6c6c]">{title}</p><div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{hasChildren ? children : <p className="text-xs text-[#a08500]">{empty}</p>}</div></div>;
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return <label className="flex items-center justify-between rounded-lg bg-white p-3 text-xs"><span>{children}</span><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#5054c0]" /></label>;
}

function TeacherPicker({ teachers, value, onChange }: { teachers: Teacher[]; value: string; onChange: (teacher: string) => void }) {
  return <label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#6c6c6c]">الأستاذ</span><select required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#e5e5e5] bg-white p-3 text-sm"><option value="">اختر الأستاذ</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.name}>{teacher.name} • {teacher.specialty}</option>)}</select></label>;
}

function EnrollmentModal({ students, courses, levels, enrollments, onClose, onSave }: { students: Student[]; courses: Course[]; levels: Level[]; enrollments: Enrollment[]; onClose: () => void; onSave: (enrollment: Omit<Enrollment, "id">) => void }) {
  const [studentId, setStudentId] = useState(students[0]?.id || 0);
  const available = courses.filter((course) => !enrollments.some((enrollment) => enrollment.studentId === studentId && enrollment.courseId === course.id && enrollment.status === "نشط"));
  const [courseId, setCourseId] = useState(courses[0]?.id || 0);
  const [discount, setDiscount] = useState(0);
  const selectedCourse = courses.find((course) => course.id === courseId);
  return <Modal title="إضافة تسجيل جديد" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ studentId, courseId, enrolledAt: today, status: "نشط", discount: Math.max(0, Math.min(discount, selectedCourse?.price || 0)) }); }} className="space-y-4"><label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#6c6c6c]">اختر الطالب</span><select value={studentId} onChange={(event) => { const nextStudentId = Number(event.target.value); const nextCourse = courses.find((course) => !enrollments.some((enrollment) => enrollment.studentId === nextStudentId && enrollment.courseId === course.id && enrollment.status === "نشط")); setStudentId(nextStudentId); setCourseId(nextCourse?.id || 0); setDiscount(0); }} className="w-full rounded-xl border border-[#e5e5e5] bg-white p-3 text-sm">{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><div><p className="mb-2 text-center text-xs font-bold text-[#6c6c6c]">المادة أو الباقة</p><CoursePicker courses={available} levels={levels} value={courseId || null} onChange={(value) => { setCourseId(value || 0); setDiscount(0); }} showPrice /></div><div className="mx-auto max-w-xs"><Field label="الخصم (MAD)" type="number" value={discount} onChange={(value) => setDiscount(Math.max(0, Math.min(Number(value), selectedCourse?.price || 0)))} /><p className="mt-2 rounded-xl bg-[#e6f5ee] p-3 text-center text-xs font-bold text-[#008a55]">السعر بعد الخصم: {money(Math.max(0, (selectedCourse?.price || 0) - discount))}</p></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!available.length}>إضافة التسجيل</Button></div></form></Modal>;
}

function RosterModal({ course, students, onClose }: { course: Course; students: Student[]; onClose: () => void }) {
  return <Modal title={`الطلاب المسجلون في ${course.name}`} onClose={onClose}><div className="space-y-3">{students.length ? students.map((student) => <div key={student.id} className="flex items-center justify-between rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3 text-right"><div><p className="font-bold text-[#292929]">{student.name}</p><p className="mt-1 text-xs text-[#6c6c6c]">{student.phone || "لا يوجد رقم هاتف"}</p></div><span className="rounded-full bg-[#e4f5eb] px-2.5 py-1 text-[10px] font-bold text-[#218653]">نشط</span></div>) : <p className="rounded-xl bg-[#fafafa] p-6 text-center text-sm text-[#6c6c6c]">لا يوجد طلاب مسجلون حالياً</p>}</div></Modal>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#6c6c6c]">{label}</span><input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-sm outline-none focus:border-[#5054c0]" /></label>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#292929]/30 p-4"><div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}><div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-black text-[#292929]">{title}</h3><button onClick={onClose} className="text-[#6c6c6c]"><X size={19} /></button></div>{children}</div></div>;
}
