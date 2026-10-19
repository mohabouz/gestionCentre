"use client";

import { Children, isValidElement, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/centman-shell";
import { Payment, money } from "@/lib/centman-store";


export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#15231d]/30 p-4">
      <div className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ${wide ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <h3 className="text-lg font-black text-[#17251f]">{title}</h3>
          <button onClick={onClose} className="text-[#84938b]">
            <X size={19} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pl-1">{children}</div>
        {footer && (
          <div className="mt-5 flex shrink-0 justify-end gap-2 border-t border-[#e5e5e5] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-right">
      <span className="mb-2 block text-xs font-bold text-[#64786c]">
        {label}
      </span>
      <input
        required={type !== "search"}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none focus:border-[#00a060]"
      />
    </label>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const items = Children.toArray(children);
  const headerItems = items.filter(
    (item) => isValidElement(item) && item.type === Th,
  );
  const rows = items.filter(
    (item) => !isValidElement(item) || item.type !== Th,
  );
  const rowSignature = rows
    .map((row, index) =>
      isValidElement(row) && row.key != null ? String(row.key) : String(index),
    )
    .join("|");
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, rowSignature]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-xs">
          <thead>
            <tr className="border-b border-[#e9efeb] text-[#96a69d]">
              {headerItems}
            </tr>
          </thead>
          <tbody>{visibleRows}</tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 sm:flex-row">
          <p className="text-[11px] font-bold text-[#84938b]">
            عرض {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} من {rows.length}
          </p>
          <div dir="ltr" className="flex items-center gap-2">
            <label dir="rtl" className="flex items-center gap-2 text-[10px] font-bold text-[#84938b]">
              في الصفحة
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-[#dce7df] bg-white px-2 py-1.5 text-xs text-[#53685d] outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              aria-label="الصفحة السابقة"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce7df] bg-white text-[#53685d] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={15} />
            </button>
            <span dir="rtl" className="min-w-16 text-center text-[11px] font-black text-[#44594e]">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage === pageCount}
              aria-label="الصفحة التالية"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce7df] bg-white text-[#53685d] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[#eef3ef] px-4 py-4 text-[#4b6054] ${className}`}
    >
      {children}
    </td>
  );
}

export function Actions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      {confirming && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء."
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete?.();
          }}
        />
      )}
      <div className="flex gap-2">
        {onEdit && (
          <button
            aria-label="تعديل"
            onClick={onEdit}
            className="rounded-lg bg-[#eff8f2] p-2 text-[#00a060]"
          >
            <Edit3 size={14} />
          </button>
        )}
        {onDelete && (
          <button
            aria-label="حذف"
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-[#fff0ee] p-2 text-[#d56558]"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-[#92a29a]">{text}</div>;
}

export function ReceiptActions({
  payment,
  whatsapp,
}: {
  payment: Payment;
  whatsapp?: string;
}) {
  const message = `وصل أداء ${payment.student} - ${money(payment.amount)} - ${payment.month} - رقم الوصل ${payment.receiptNumber || "غير متوفر"}`;
  const printReceipt = () => {
    const receipt = window.open("", "_blank", "width=480,height=640");
    if (!receipt) return;
    receipt.document.write(
      `<html dir="rtl"><head><title>وصل ${payment.receiptNumber || "الدفع"}</title><style>body{font-family:Tahoma,sans-serif;padding:32px;color:#292929}h1{color:#5054c0}hr{border:0;border-top:1px solid #e5e5e5;margin:24px 0}.row{display:flex;justify-content:space-between;padding:10px 0}</style></head><body><h1>CentMan</h1><p>وصل أداء مالي</p><hr/><div class="row"><b>الطالب</b><span>${payment.student}</span></div><div class="row"><b>الشهر</b><span>${payment.month}</span></div><div class="row"><b>المبلغ</b><span>${money(payment.amount)}</span></div><div class="row"><b>رقم الوصل</b><span>${payment.receiptNumber || "غير متوفر"}</span></div><div class="row"><b>التاريخ</b><span>${payment.date}</span></div><hr/><p>شكراً لثقتكم بمركز CentMan</p><script>window.print();</script></body></html>`,
    );
    receipt.document.close();
  };
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={printReceipt}
        className="rounded-lg bg-[#e4e8fd] px-2 py-1 text-[10px] font-bold text-[#4343b3]"
      >
        طباعة الوصل
      </button>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace("+", "")}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#faf4de] px-2 py-1 text-[10px] font-bold text-[#a08500]"
        >
          واتساب
        </a>
      )}
    </div>
  );
}
