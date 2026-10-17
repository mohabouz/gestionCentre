import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CentMan | مركز التعليم",
  description: "Education center management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full"><LanguageProvider><AuthProvider><AuthGate>{children}</AuthGate></AuthProvider></LanguageProvider></body>
    </html>
  );
}
