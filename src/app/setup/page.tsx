"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (form.password !== form.confirm) { setError("كلمتا المرور غير متطابقتين"); return; } const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) setError(result.error || "تعذر إنشاء الحساب"); else router.replace("/"); };
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] p-5"><div className="w-full max-w-md rounded-3xl border border-[#e3eae5] bg-white p-8 shadow-[0_12px_40px_rgba(28,67,47,0.08)]"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f5eb] text-2xl font-black text-[#008a55]">C</div><h1 className="text-2xl font-black text-[#17251f]">إنشاء super-admin</h1><p className="mt-2 text-xs text-[#84938b]">أنشئ الحساب الأول لتأمين نظام CentMan</p></div><form onSubmit={submit} className="space-y-4"><Field label="الاسم الكامل" value={form.name} onChange={name => setForm({ ...form, name })} /><Field label="اسم المستخدم" value={form.username} onChange={username => setForm({ ...form, username })} /><Field label="كلمة المرور" type="password" value={form.password} onChange={password => setForm({ ...form, password })} /><Field label="تأكيد كلمة المرور" type="password" value={form.confirm} onChange={confirm => setForm({ ...form, confirm })} />{error && <p className="rounded-xl bg-[#fff0ee] p-3 text-xs font-bold text-[#c4584e]">{error}</p>}<button className="w-full rounded-xl bg-[#00a060] px-4 py-3 text-sm font-bold text-white hover:bg-[#008a55]">إنشاء الحساب وتأمين النظام</button></form></div></main>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#64786c]">{label}</span><input required type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none focus:border-[#00a060]" /></label>; }
