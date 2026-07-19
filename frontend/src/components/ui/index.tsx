/**
 * components/ui/index.tsx — O'zbek tili
 */

import { X, CheckCircle, Clock, Package, XCircle, RotateCcw, Inbox } from 'lucide-react';
import type { OrderStatus, AppToast } from '../../types';

const STATUS_META: Record<OrderStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
  CREATED:   { label: 'Yaratildi',         cls: 'bg-blue-50 text-blue-700 border-blue-200',          Icon: Clock       },
  PAID:      { label: 'To\'langan',        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',    Icon: CheckCircle },
  ORDERED:   { label: 'Buyurtma berildi',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: Package     },
  ARRIVED:   { label: 'Keldi',             cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Package     },
  GIVEN:     { label: 'Topshirildi',       cls: 'bg-slate-100 text-slate-500 border-slate-200',      Icon: CheckCircle },
  CANCELLED: { label: 'Bekor qilindi',     cls: 'bg-red-50 text-red-600 border-red-200',             Icon: XCircle     },
  RETURNED:  { label: 'Qaytarildi',        cls: 'bg-purple-50 text-purple-700 border-purple-200',    Icon: RotateCcw   },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, cls, Icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

interface ModalShellProps {
  title: string;
  subtitle?: string;
  icon?: React.FC<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function ModalShell({ title, subtitle, icon: Icon, onClose, children, width = 'max-w-md' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-10 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: AppToast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full
          ${t.variant === 'error' ? 'bg-red-50 border-red-200 text-red-700'
          : t.variant === 'info'  ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-white border-slate-200 text-slate-700'}`}>
          <div className={`p-1 rounded-md shrink-0 ${t.variant === 'error' ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <CheckCircle className={`w-3.5 h-3.5 ${t.variant === 'error' ? 'text-red-500' : 'text-emerald-600'}`} />
          </div>
          <p className="text-[11px] flex-1 leading-relaxed">{t.message}</p>
          <button onClick={() => onDismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ label = 'Bu bosqichda ma\'lumotlar yo\'q.' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <Inbox className="w-6 h-6 mb-2 text-slate-300" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-3">{label}</p>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  accent?: string;
  sub?: string;
}

export function KpiCard({ label, value, icon: Icon, accent = 'text-slate-800', sub }: KpiCardProps) {
  return (
    <div className="sb-card px-5 py-4 flex items-start gap-4">
      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{sub}</p>}
      </div>
    </div>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sb-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50 ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}

export function Td({ children, mono, right, muted }: { children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean }) {
  return (
    <td className={`px-5 py-3.5 ${mono ? 'font-mono' : ''} ${right ? 'text-right' : ''} ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
      {children}
    </td>
  );
}
