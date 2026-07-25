/**
 * components/Topbar.tsx — O'zbek tili
 */

import { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import NotificationsModal from './NotificationsModal';
import type { UserRole } from '../types';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  TEACHER:   'Buyurtmalar boshqaruvi — Talabalar bo\'yicha ish maydoni',
  CASHIER:   'CRM Yo\'nalishi — To\'lov qabul qilish va kitob topshirish',
  LOGISTICS: 'Ta\'minot zanjiri — Ombor, ta\'minotchi va kirim boshqaruvi',
  MANAGER:   'Moliyaviy tahlil — Hisobot formulalari va qamrov hisobotlari',
};

export default function Topbar() {
  const { activeRole, notifications, currentUser, logout, toggleMobileMenu } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const userNotifications = notifications.filter(n => {
    if (currentUser?.role === 'TEACHER') {
      return !n.teacherName || n.teacherName === currentUser.fullName || n.userId === currentUser.username;
    }
    return true;
  });

  const unread = userNotifications.filter(n => !n.isRead).length;

  return (
    <header className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm relative">
      {/* Chap tomon */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          title="Menyu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xs sm:text-[14px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            SmartBook ERP
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{ROLE_DESCRIPTIONS[activeRole]}</p>
        </div>
      </div>

      {/* O'ng tomon */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowNotifications(prev => !prev)}
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          title="Bildirishnomalar"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
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

      {/* Notifications Modal / Popover */}
      {showNotifications && (
        <NotificationsModal onClose={() => setShowNotifications(false)} />
      )}
    </header>
  );
}
