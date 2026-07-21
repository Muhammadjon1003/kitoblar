/**
 * components/Topbar.tsx — O'zbek tili
 */

import { Bell, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  TEACHER:   'Buyurtmalar boshqaruvi — Talabalar bo\'yicha ish maydoni',
  CASHIER:   'CRM Yo\'nalishi — To\'lov qabul qilish va kitob topshirish',
  LOGISTICS: 'Ta\'minot zanjiri — Ombor, ta\'minotchi va kirim boshqaruvi',
  MANAGER:   'Moliyaviy tahlil — Hisobot formulalari va qamrov hisobotlari',
};

export default function Topbar() {
  const { activeRole, notifications, currentUser, logout } = useApp();
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm">
      {/* Chap tomon */}
      <div>
        <h1 className="text-[14px] font-bold text-slate-800 tracking-tight">SmartBook ERP</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_DESCRIPTIONS[activeRole]}</p>
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

        {currentUser && (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Chiqish
          </button>
        )}
      </div>
    </header>
  );
}
