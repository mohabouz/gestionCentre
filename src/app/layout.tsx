import type { Metadata } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CentMan | مركز التعليم",
  description: "Education center management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${notoKufiArabic.variable} h-full antialiased`}>
      <body className="min-h-full"><LanguageProvider><AuthProvider><AuthGate>{children}</AuthGate></AuthProvider></LanguageProvider></body>
    </html>
  );
}
