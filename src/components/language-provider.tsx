"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AppLanguage = "العربية" | "Français" | "English";
const languageConfig: Record<AppLanguage, { locale: string; dir: "rtl" | "ltr" }> = {
  العربية: { locale: "ar-MA", dir: "rtl" },
  Français: { locale: "fr-MA", dir: "ltr" },
  English: { locale: "en-MA", dir: "ltr" },
};
const LanguageContext = createContext<{ language: AppLanguage; setLanguage: (language: AppLanguage) => void }>({ language: "العربية", setLanguage: () => undefined });
const translations = {
  ar: { home: "الرئيسية", students: "الطلاب", teachers: "الأساتذة", courses: "الدورات", registrations: "التسجيلات", schedule: "الجدول", expenses: "المصاريف", lateStudents: "الطلاب المتأخرون", payouts: "رواتب الأساتذة", settings: "الإعدادات", search: "ابحث في النظام...", today: "اليوم", dashboard: "لوحة التحكم", overview: "نظرة عامة", save: "حفظ", cancel: "إلغاء", add: "إضافة", edit: "تعديل", delete: "حذف", language: "لغة التطبيق", notifications: "التنبيهات المالية" },
  fr: { home: "Accueil", students: "Étudiants", teachers: "Enseignants", courses: "Cours", registrations: "Inscriptions", schedule: "Planning", expenses: "Dépenses", lateStudents: "Étudiants en retard", payouts: "Paiements enseignants", settings: "Paramètres", search: "Rechercher dans le système...", today: "Aujourd’hui", dashboard: "Tableau de bord", overview: "Vue d’ensemble", save: "Enregistrer", cancel: "Annuler", add: "Ajouter", edit: "Modifier", delete: "Supprimer", language: "Langue de l’application", notifications: "Notifications financières" },
  en: { home: "Home", students: "Students", teachers: "Teachers", courses: "Courses", registrations: "Registrations", schedule: "Schedule", expenses: "Expenses", lateStudents: "Late students", payouts: "Teacher payouts", settings: "Settings", search: "Search the system...", today: "Today", dashboard: "Dashboard", overview: "Overview", save: "Save", cancel: "Cancel", add: "Add", edit: "Edit", delete: "Delete", language: "Application language", notifications: "Financial notifications" },
} as const;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("العربية");
  useEffect(() => {
    const saved = window.localStorage.getItem("centman-language") as AppLanguage | null;
    if (saved && languageConfig[saved]) setLanguageState(saved);
  }, []);
  useEffect(() => {
    const config = languageConfig[language];
    document.documentElement.lang = config.locale;
    document.documentElement.dir = config.dir;
    window.localStorage.setItem("centman-language", language);
  }, [language]);
  const setLanguage = (next: AppLanguage) => setLanguageState(next);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
export function getLanguageConfig(language: AppLanguage) { return languageConfig[language]; }
export function getTranslations(language: AppLanguage) { return translations[language === "العربية" ? "ar" : language === "Français" ? "fr" : "en"]; }
