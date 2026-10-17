"use client";

import type { Data } from "@/lib/section-data";
import type { Expense } from "@/lib/centman-store";


export type AdminUser = { id: number; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN"; active: boolean; createdAt: string };

export type Props = {
  data: Data;
  update: (data: Data, message?: string) => void;
  deleteStudent?: (id: number) => Promise<void>;
  createExpense?: (expense: Omit<Expense, "id">) => Promise<boolean>;
  deleteExpense?: (id: number) => Promise<void>;
};
