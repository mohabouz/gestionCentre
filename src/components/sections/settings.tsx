"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, PageTitle } from "@/components/centman-shell";
import { AppLanguage, useLanguage } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";


import { Input, Modal, Table, Td, Th } from "@/components/sections/shared-ui";
import type { AdminUser } from "@/components/sections/types";
import { LogoDropzone } from "@/components/sections/settings-logo";


export function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [managedUsers, setManagedUsers] = useState<AdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    username: "",
    password: "",
    passwordConfirmation: "",
    role: "ADMIN" as "ADMIN" | "SUPER_ADMIN",
  });
  const [adminMessage, setAdminMessage] = useState("");
  const [cleanupOptions, setCleanupOptions] = useState({ students: true, teachers: false, courses: false, enrollments: true, payments: true, attendance: true, expenses: true, payouts: true, schedule: false, rooms: false, accounts: false, settings: false });
  const [cleanupSelectionOpen, setCleanupSelectionOpen] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [form, setForm] = useState({
    name: "CentMan",
    address: "الجزائر العاصمة",
    phone: "0550000000",
    language,
    notifications: true,
    subscriptionFee: 200,
    logo: "",
  });
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("settings")),
      )
      .then((settings) => setForm((current) => ({ ...current, ...settings })))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    fetch("/api/auth/users", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("users")))
      .then(setManagedUsers)
      .catch(() => setUserMessage("تعذر تحميل حسابات الإدارة"));
  }, [user?.role]);
  const save = async () => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setLanguage(form.language as AppLanguage);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }
  };
  const createAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setAdminMessage("");
    if (adminForm.password !== adminForm.passwordConfirmation) {
      setAdminMessage("كلمتا المرور غير متطابقتين");
      return;
    }
    const response = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminForm),
    });
    const result = await response.json();
    if (!response.ok) setAdminMessage(result.error || "تعذر إنشاء الحساب");
    else {
      setAdminForm({
        name: "",
        username: "",
        password: "",
        passwordConfirmation: "",
        role: "ADMIN",
      });
      if (user?.role === "SUPER_ADMIN") {
        const usersResponse = await fetch("/api/auth/users", { cache: "no-store" });
        if (usersResponse.ok) setManagedUsers(await usersResponse.json());
      }
      setAdminMessage("تم إنشاء الحساب بنجاح");
    }
  };
  const cleanCenterData = async () => {
    setCleaning(true);
    setCleanupMessage("");
    try {
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanupOptions),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تنظيف البيانات");
      setCleanupMessage("اكتمل تنظيف الفئات المحددة.");
      if (cleanupOptions.accounts) {
        window.location.href = "/setup";
        return;
      }
      const refreshed = await fetch("/api/state", { cache: "no-store" });
      if (refreshed.ok) window.location.reload();
      setCleanupConfirmOpen(false);
    } catch (error) {
      setCleanupMessage(error instanceof Error ? error.message : "تعذر تنظيف البيانات");
    } finally {
      setCleaning(false);
    }
  };
  const updateUser = async (payload: Record<string, unknown>, target?: AdminUser) => {
    const account = target || editingUser || resetUser;
    if (!account) return false;
    const response = await fetch("/api/auth/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, ...payload }) });
    const result = await response.json();
    if (!response.ok) { setUserMessage(result.error || "تعذر تحديث الحساب"); return false; }
    setManagedUsers((current) => current.map((item) => item.id === result.id ? { ...item, ...result } : item));
    setUserMessage("تم تحديث الحساب");
    return true;
  };
  return (
    <>
      <PageTitle eyebrow="النظام" title="الإعدادات" />
      {saved && (
        <p className="mb-4 rounded-xl bg-[#e6f5ee] px-4 py-3 text-xs font-bold text-[#008a55]">
          تم حفظ الإعدادات بنجاح
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">الهوية البصرية</h3>
          <div className="space-y-4">
            <LogoDropzone
              logo={form.logo}
              onChange={(logo) => setForm({ ...form, logo })}
            />
            <Input
              label="اسم المؤسسة"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <Input
              label="العنوان"
              value={form.address}
              onChange={(value) => setForm({ ...form, address: value })}
            />
            <Input
              label="الهاتف"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Button onClick={save}>حفظ الإعدادات</Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">إعدادات النظام</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl bg-[#f5f8f6] p-4 text-xs font-bold">
              <span>لغة التطبيق</span>
              <select
                value={form.language}
                onChange={(event) => {
                  const next = event.target.value as AppLanguage;
                  setForm({ ...form, language: next });
                  setLanguage(next);
                }}
                className="rounded-lg border border-[#dce7df] bg-white p-2"
              >
                <option>العربية</option>
                <option>Français</option>
                <option>English</option>
              </select>
            </label>
            <label className="flex items-center justify-between rounded-xl bg-[#f5f8f6] p-4 text-xs font-bold">
              <span>التنبيهات المالية</span>
              <input
                type="checkbox"
                checked={form.notifications}
                onChange={(event) =>
                  setForm({ ...form, notifications: event.target.checked })
                }
                className="h-4 w-4 accent-[#00a060]"
              />
            </label>
            <Button onClick={save}>حفظ إعدادات النظام</Button>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-xl flex-1">
              <h3 className="mb-2 font-black text-[#17251f]">رسوم الاشتراك السنوية</h3>
              <p className="mb-4 text-xs leading-6 text-[#84938b]">
                تُطبق تلقائياً على الاشتراكات الجديدة والتجديدات، ولا تغيّر الرسوم المسجلة سابقاً.
              </p>
              <Input
                label="المبلغ السنوي (MAD)"
                type="number"
                value={form.subscriptionFee}
                onChange={(value) =>
                  setForm({
                    ...form,
                    subscriptionFee: Math.max(0, Number(value) || 0),
                  })
                }
              />
            </div>
            <Button onClick={save}>حفظ رسوم الاشتراك</Button>
          </div>
        </Card>
        {user?.role === "SUPER_ADMIN" && <Card className="border-[#f0d2cc] lg:col-span-2">
          <h3 className="mb-2 font-black text-[#a33f35]">تنظيف بيانات المركز</h3>
          <p className="mb-4 text-xs leading-6 text-[#6c6c6c]">اختر الفئات التي تريد حذفها. حذف التلاميذ أو المواد يحذف تلقائياً التسجيلات والحضور والمدفوعات المرتبطة بها عند الحاجة.</p>
          {cleanupMessage && <p className="mb-3 text-xs font-bold text-[#a33f35]">{cleanupMessage}</p>}
          <Button variant="danger" disabled={cleaning} onClick={() => setCleanupSelectionOpen(true)}>{cleaning ? "جارٍ التنظيف..." : "تنظيف البيانات"}</Button>
        </Card>}
        <Card>
          <h3 className="mb-5 font-black text-[#17251f]">حسابات الإدارة</h3>
          <p className="mb-4 text-xs text-[#84938b]">
            أنشئ حسابات الإدارة وحدد نوع الصلاحية: Admin للعمليات اليومية أو Super-admin لإدارة النظام والمعلومات المالية.
          </p>
          <form onSubmit={createAdmin} className="space-y-3">
            <Input
              label="اسم المسؤول"
              value={adminForm.name}
              onChange={(name) => setAdminForm({ ...adminForm, name })}
            />
            <Input
              label="اسم المستخدم"
              value={adminForm.username}
              onChange={(username) => setAdminForm({ ...adminForm, username })}
            />
            <Input
              label="كلمة المرور"
              type="password"
              value={adminForm.password}
              onChange={(password) => setAdminForm({ ...adminForm, password })}
            />
            <Input
              label="تأكيد كلمة المرور"
              type="password"
              value={adminForm.passwordConfirmation}
              onChange={(passwordConfirmation) =>
                setAdminForm({ ...adminForm, passwordConfirmation })
              }
            />
            <label className="block text-right">
              <span className="mb-2 block text-xs font-bold text-[#64786c]">
                الصلاحية
              </span>
              <select
                value={adminForm.role}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    role: event.target.value as "ADMIN" | "SUPER_ADMIN",
                  })
                }
                className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none focus:border-[#00a060]"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super-admin</option>
              </select>
            </label>
            {adminMessage && (
              <p className="text-xs font-bold text-[#008a55]">{adminMessage}</p>
            )}
            <Button type="submit">إنشاء الحساب</Button>
          </form>
        </Card>
        {user?.role === "SUPER_ADMIN" && (
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#17251f]">إدارة الحسابات</h3>
                <p className="mt-1 text-xs text-[#84938b]">تعديل الحسابات، الصلاحيات، كلمات المرور وحالة الوصول.</p>
              </div>
              {userMessage && <span className="text-xs font-bold text-[#008a55]">{userMessage}</span>}
            </div>
            <Table>
              <Th>الاسم</Th><Th>اسم المستخدم</Th><Th>الصلاحية</Th><Th>الحالة</Th><Th>إجراء</Th>
              {managedUsers.map((account) => <tr key={account.id}><Td className="font-bold">{account.name}</Td><Td>{account.username}</Td><Td>{account.role === "SUPER_ADMIN" ? "Super-admin" : "Admin"}</Td><Td><span className={account.active ? "text-[#008a55]" : "text-[#c4584e]"}>{account.active ? "نشط" : "متوقف"}</span></Td><Td><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditingUser(account)} className="rounded-lg bg-[#e4e8fd] px-2 py-1 text-[10px] font-bold text-[#5054c0]">تعديل</button><button type="button" onClick={() => updateUser({ active: !account.active }, account)} disabled={account.id === user.id} className="rounded-lg bg-[#eff8f2] px-2 py-1 text-[10px] font-bold text-[#008a55] disabled:opacity-40">{account.active ? "تعطيل" : "تفعيل"}</button><button type="button" onClick={() => { setResetUser(account); setResetPassword(""); setResetConfirmation(""); }} className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]">تغيير كلمة المرور</button></div></Td></tr>)}
            </Table>
          </Card>
        )}
      </div>
      {editingUser && <Modal title="تعديل حساب الإدارة" onClose={() => setEditingUser(null)}><form onSubmit={async (event) => { event.preventDefault(); if (await updateUser({ name: editingUser.name, role: editingUser.role })) setEditingUser(null); }} className="space-y-4"><Input label="الاسم" value={editingUser.name} onChange={(name) => setEditingUser({ ...editingUser, name })} /><label className="block text-right"><span className="mb-2 block text-xs font-bold text-[#64786c]">الصلاحية</span><select value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value as AdminUser["role"] })} className="w-full rounded-xl border border-[#dce7df] bg-white p-3 text-sm"><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super-admin</option></select></label><div className="flex justify-end"><Button type="submit">حفظ التعديل</Button></div></form></Modal>}
      {resetUser && <Modal title={`تغيير كلمة مرور ${resetUser.name}`} onClose={() => setResetUser(null)}><form onSubmit={async (event) => { event.preventDefault(); if (resetPassword.length < 8 || resetPassword !== resetConfirmation) { setUserMessage(resetPassword.length < 8 ? "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل" : "كلمتا المرور غير متطابقتين"); return; } if (await updateUser({ password: resetPassword })) { setResetUser(null); setResetPassword(""); setResetConfirmation(""); } }} className="space-y-4"><Input label="كلمة المرور الجديدة" type="password" value={resetPassword} onChange={setResetPassword} /><Input label="تأكيد كلمة المرور" type="password" value={resetConfirmation} onChange={setResetConfirmation} /><div className="flex justify-end"><Button type="submit">حفظ كلمة المرور</Button></div></form></Modal>}
      {cleanupSelectionOpen && <Modal title="اختيار البيانات المراد حذفها" onClose={() => setCleanupSelectionOpen(false)}><div className="max-h-[55vh] space-y-2 overflow-y-auto">{([
        ["students", "التلاميذ"], ["teachers", "الأساتذة"], ["courses", "المواد والباقات"], ["enrollments", "التسجيلات"], ["payments", "المدفوعات"], ["attendance", "الحضور"], ["expenses", "المصاريف"], ["payouts", "رواتب الأساتذة"], ["schedule", "الجدول والحصص"], ["rooms", "القاعات"], ["accounts", "حسابات الإدارة"], ["settings", "إعدادات المؤسسة"],
      ] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-[#e5e5e5] p-3 text-xs font-bold"><span>حذف {label}</span><input type="checkbox" checked={cleanupOptions[key]} onChange={event => setCleanupOptions(current => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-[#5054c0]" /></label>)}</div><p className="mt-3 text-[11px] leading-5 text-[#a33f35]">الاختيار النهائي سيحذف هذه البيانات نهائياً. حذف الحسابات سيخرجك من النظام ويتطلب إنشاء super-admin من جديد.</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCleanupSelectionOpen(false)}>إلغاء</Button><Button variant="danger" disabled={cleaning || !Object.values(cleanupOptions).some(Boolean)} onClick={() => { setCleanupSelectionOpen(false); setCleanupConfirmOpen(true); }}>متابعة للتأكيد</Button></div></Modal>}
      {cleanupConfirmOpen && <ConfirmDialog title="التأكيد النهائي للتنظيف" message={`ستُحذف الفئات المحددة نهائياً: ${Object.entries(cleanupOptions).filter(([, selected]) => selected).map(([key]) => key).join("، ")}. لا يمكن التراجع عن هذا الإجراء.`} confirmLabel="تأكيد وحذف المحدد" onCancel={() => setCleanupConfirmOpen(false)} onConfirm={cleanCenterData} />}
    </>
  );
}

