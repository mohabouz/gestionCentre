"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }); const result = await response.json(); if (result.needsSetup) router.replace("/setup"); else if (!response.ok) setError(result.error || "تعذر تسجيل الدخول"); else router.replace("/"); };
  return <AuthPage title="تسجيل الدخول" subtitle="سجل دخولك إلى نظام CentMan"><form onSubmit={submit} className="space-y-4"><label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#64786c]">اسم المستخدم</span><input required value={username} onChange={event => setUsername(event.target.value)} className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none focus:border-[#00a060]" /></label><label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#64786c]">كلمة المرور</span><input required type="password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none focus:border-[#00a060]" /></label>{error && <p className="rounded-xl bg-[#fff0ee] p-3 text-xs font-bold text-[#c4584e]">{error}</p>}<button className="w-full rounded-xl bg-[#00a060] px-4 py-3 text-sm font-bold text-white hover:bg-[#008a55]">دخول</button></form></AuthPage>;
}

function AuthPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] p-5"><div className="w-full max-w-md rounded-3xl border border-[#e3eae5] bg-white p-8 shadow-[0_12px_40px_rgba(28,67,47,0.08)]"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f5eb] text-2xl font-black text-[#008a55]">C</div><h1 className="text-2xl font-black text-[#17251f]">{title}</h1><p className="mt-2 text-xs text-[#84938b]">{subtitle}</p></div>{children}</div></main>; }
