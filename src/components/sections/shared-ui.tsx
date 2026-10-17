"use client";

import { Children, isValidElement, useState } from "react";
import { Edit3, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/centman-shell";
import { Payment, money } from "@/lib/centman-store";


export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#15231d]/30 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
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
  const items = Children.toArray(children);
  const headerItems: React.ReactNode[] = [];
  let rowStart = 0;
  while (rowStart < items.length) {
    const item = items[rowStart];
    if (!isValidElement(item) || item.type !== Th) break;
    headerItems.push(item);
    rowStart += 1;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-right text-xs">
        <thead>
          <tr className="border-b border-[#e9efeb] text-[#96a69d]">
            {headerItems}
          </tr>
        </thead>
        <tbody>{items.slice(rowStart)}</tbody>
      </table>
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
      `<html dir="rtl"><head><title>وصل ${payment.receiptNumber || "الدفع"}</title><style>body{font-family:Tahoma,sans-serif;padding:32px;color:#292929}h1{color:#5054c0}hr{border:0;border-top:1px solid #e5e5e5;margin:24px 0}.row{display:flex;justify-content:space-between;padding:10px 0}</style></head><body><h1>CentMan</h1><p>وصل أداء مالي</p><hr/><div class="row"><b>الطالب</b><span>${payment.student}</span></div><div class="row"><b>الشهر</b><span>${payment.month}</span></div><div class="row"><b>المبلغ</b><span>${money(payment.amount)}</span></div><div class="row"><b>طريقة الدفع</b><span>${payment.method || "غير محددة"}</span></div><div class="row"><b>رقم الوصل</b><span>${payment.receiptNumber || "غير متوفر"}</span></div><div class="row"><b>التاريخ</b><span>${payment.date}</span></div><hr/><p>شكراً لثقتكم بمركز CentMan</p><script>window.print();</script></body></html>`,
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
