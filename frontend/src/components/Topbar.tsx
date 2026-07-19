/**
 * components/Topbar.tsx — O'zbek tili
 */

import { Bell, GraduationCap, DollarSign, Truck, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types';

const ROLES: { role: UserRole; label: string; icon: React.FC<{ className?: string }> }[] = [
  { role: 'TEACHER',   label: 'O\'qituvchi', icon: GraduationCap },
  { role: 'CASHIER',   label: 'Kassir',      icon: DollarSign    },
  { role: 'LOGISTICS', label: 'Logistika',   icon: Truck         },
  { role: 'MANAGER',   label: 'Menejer',     icon: BarChart2     },
];

const ACTIVE_STYLE: Record<UserRole, string> = {
  TEACHER:   'bg-blue-600 text-white shadow-sm shadow-blue-200',
  CASHIER:   'bg-indigo-600 text-white shadow-sm shadow-indigo-200',
  LOGISTICS: 'bg-amber-500 text-white shadow-sm shadow-amber-200',
  MANAGER:   'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  TEACHER:   'Buyurtmalar boshqaruvi — Talabalar bo\'yicha ish maydoni',
  CASHIER:   'CRM Yo\'nalishi — To\'lov qabul qilish va kitob topshirish',
  LOGISTICS: 'Ta\'minot zanjiri — Ombor, ta\'minotchi va kirim boshqaruvi',
  MANAGER:   'Moliyaviy tahlil — Hisobot formulalari va qamrov hisobotlari',
};

export default function Topbar() {
  const { activeRole, setActiveRole, notifications } = useApp();
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm">
      {/* Chap tomon */}
      <div>
        <h1 className="text-[14px] font-bold text-slate-800 tracking-tight">SmartBook ERP</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_DESCRIPTIONS[activeRole]}</p>
      </div>

      {/* Markazda: Rol almashtirish */}
      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
        {ROLES.map(({ role, label, icon: Icon }) => {
          const active = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 ${
                active
                  ? ACTIVE_STYLE[role]
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* O'ng tomon */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
        <div className="text-[11px] text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-mono">
          {new Date().toLocaleDateString('uz-UZ', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
