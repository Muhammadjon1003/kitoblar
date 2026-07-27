/**
 * components/Sidebar.tsx — O'zbek tili
 */

import { Package, ChevronRight, LogOut, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole, SubPage } from '../types';

interface NavItem { key: SubPage; label: string; }

const ROLE_NAV: Record<UserRole, NavItem[]> = {
  TEACHER:   [{ key: 'orders',    label: 'Buyurtmalar' }],
  CASHIER:   [
    { key: 'pipeline',   label: 'CRM Yo\'nalishi' },
    { key: 'warehouse',  label: 'Ombor zaxirasi' },
    { key: 'management', label: 'Guruhlar boshqaruvi' },
    { key: 'payments',   label: 'To\'lovlar tarixi' },
  ],
  LOGISTICS: [
    { key: 'pipeline',   label: 'CRM Yo\'nalishi' },
    { key: 'supplier',   label: 'Ta\'minotchi stoli' },
    { key: 'warehouse',  label: 'Ombor zaxirasi' },
    { key: 'books',      label: 'Darsliklar' },
    { key: 'management', label: 'Guruhlar boshqaruvi' },
    { key: 'payments',   label: 'To\'lovlar tarixi' },
  ],
  MANAGER:   [{ key: 'analytics', label: 'Moliyaviy tahlil' }, { key: 'ledger', label: 'Buyurtmalar hisoboti' }, { key: 'groups', label: 'Guruhlar boshqaruvi' }, { key: 'users', label: 'Xodimlar va Rollar' }, { key: 'narxsozlama', label: 'Narx Sozlamalari' }],
};

const ROLE_DOT: Record<UserRole, string> = {
  TEACHER:   'bg-blue-500',
  CASHIER:   'bg-indigo-500',
  LOGISTICS: 'bg-amber-500',
  MANAGER:   'bg-emerald-500',
};

const ROLE_LABEL: Record<UserRole, string> = {
  TEACHER:   'O\'qituvchi',
  CASHIER:   'Kassir',
  LOGISTICS: 'Logistika',
  MANAGER:   'Menejer',
};

function SidebarContent({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const { activeRole, activeSubPage, setActiveSubPage, currentUser, logout } = useApp();
  const navItems = ROLE_NAV[activeRole];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brend Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 tracking-tight">SmartBook</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">ERP Tizim</p>
          </div>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Faol rol belgisi */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[activeRole]}`} />
          <span className="text-[11px] font-semibold text-slate-600">{ROLE_LABEL[activeRole]} bo'limi</span>
        </div>
      </div>

      {/* Navigatsiya */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">Ish maydoni</p>
        {navItems.map(({ key, label }) => {
          const active = activeSubPage === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveSubPage(key);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
            </button>
          );
        })}
      </nav>

      {/* Foydalanuvchi Profil & Logout */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${ROLE_DOT[activeRole]}`}>
            {currentUser?.fullName?.charAt(0) || activeRole.charAt(0)}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">
              {currentUser?.fullName || ROLE_LABEL[activeRole]}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold truncate">@{currentUser?.username || 'user'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Tizimdan Chiqish
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { isMobileMenuOpen, closeMobileMenu } = useApp();

  return (
    <>
      {/* 1. Desktop Sidebar (hidden on mobile, visible on md+) */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* 2. Mobile Drawer (visible when isMobileMenuOpen is true) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={closeMobileMenu}
          />
          {/* Drawer container */}
          <div className="relative w-64 max-w-[80vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent onCloseMobile={closeMobileMenu} />
          </div>
        </div>
      )}
    </>
  );
}
