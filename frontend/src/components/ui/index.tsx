/**
 * components/ui/index.tsx — O'zbek tili
 */

import { X, CheckCircle, Clock, Package, XCircle, RotateCcw, Inbox } from 'lucide-react';
import type { OrderStatus, AppToast } from '../../types';

/** Format a number as Uzbek so'm: 125000 → "125 000 so'm" */
export const uzs = (n: number) =>
  `${Math.round(n).toLocaleString('ru-RU')} so'm`;


const STATUS_META: Record<OrderStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
  CREATED:   { label: 'Yaratildi',         cls: 'bg-blue-600 text-white border-transparent',          Icon: Clock       },
  PAID:      { label: 'To\'langan',        cls: 'bg-indigo-600 text-white border-transparent',    Icon: CheckCircle },
  ORDERED:   { label: 'Buyurtma berildi',  cls: 'bg-amber-500 text-slate-900 border-transparent',       Icon: Package     },
  ARRIVED:   { label: 'Keldi',             cls: 'bg-emerald-600 text-white border-transparent', Icon: Package     },
  GIVEN:     { label: 'Topshirildi',       cls: 'bg-slate-700 text-white border-transparent',      Icon: CheckCircle },
  CANCELLED: { label: 'Bekor qilindi',     cls: 'bg-red-600 text-white border-transparent',             Icon: XCircle     },
  RETURNED:  { label: 'Qaytarildi',        cls: 'bg-purple-600 text-white border-transparent',    Icon: RotateCcw   },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, cls, Icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm ${cls}`}>
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white border border-slate-300 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden`}>
        {/* Colorful top banner for the modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white">{title}</p>
              {subtitle && <p className="text-[11px] text-blue-100 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors">
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
          ${t.variant === 'error' ? 'bg-red-600 border-red-700 text-white'
          : t.variant === 'info'  ? 'bg-blue-600 border-blue-700 text-white'
          : 'bg-indigo-600 border-indigo-700 text-white'}`}>
          <div className="p-1 rounded-md shrink-0 bg-white/20">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-[11px] font-semibold flex-1 leading-relaxed">{t.message}</p>
          <button onClick={() => onDismiss(t.id)} className="text-white/80 hover:text-white shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ label = 'Bu bosqichda ma\'lumotlar yo\'q.' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
      <Inbox className="w-8 h-8 mb-2 text-blue-500" />
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest px-1 mb-3">{label}</p>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  accent?: string;
  sub?: string;
}

export function KpiCard({ label, value, icon: Icon, accent = 'text-slate-950', sub }: KpiCardProps) {
  return (
    <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200 rounded-xl shadow-sm px-5 py-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
        <p className="text-[10px] text-slate-600 mt-1.5 uppercase tracking-wider font-bold">{label}</p>
        {sub && <p className="text-[10px] text-slate-700 mt-0.5 font-mono font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-250 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-5 py-3 text-[10px] font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 bg-slate-100/80 ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}

export function Td({ children, mono, right, muted }: { children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean }) {
  return (
    <td className={`px-5 py-3.5 ${mono ? 'font-mono text-slate-800 font-medium' : ''} ${right ? 'text-right' : ''} ${muted ? 'text-slate-600 font-medium' : 'text-slate-850 font-semibold'}`}>
      {children}
    </td>
  );
}
