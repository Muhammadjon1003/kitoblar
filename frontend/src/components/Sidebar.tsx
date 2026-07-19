/**
 * components/Sidebar.tsx — O'zbek tili
 */

import { Package, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole, SubPage } from '../types';

interface NavItem { key: SubPage; label: string; }

const ROLE_NAV: Record<UserRole, NavItem[]> = {
  TEACHER:   [{ key: 'orders',    label: 'Buyurtmalar' }],
  CASHIER:   [{ key: 'pipeline',  label: 'CRM Yo\'nalishi' }, { key: 'management', label: 'Guruhlar boshqaruvi' }, { key: 'payments', label: 'To\'lovlar tarixi' }],
  LOGISTICS: [{ key: 'warehouse', label: 'Ombor zaxirasi' }, { key: 'supplier', label: 'Ta\'minotchi stoli' }],
  MANAGER:   [{ key: 'analytics', label: 'Moliyaviy tahlil' }, { key: 'ledger', label: 'Buyurtmalar hisoboti' }, { key: 'coverage', label: 'Qamrov matritsasi' }],
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

export default function Sidebar() {
  const { activeRole, activeSubPage, setActiveSubPage } = useApp();
  const navItems = ROLE_NAV[activeRole];

  return (
    <aside className="flex flex-col w-52 min-h-screen bg-white border-r border-slate-200 shrink-0">
      {/* Brend */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 tracking-tight">SmartBook</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">ERP Tizim</p>
        </div>
      </div>

      {/* Faol rol belgisi */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[activeRole]}`} />
          <span className="text-[11px] font-semibold text-slate-600">{ROLE_LABEL[activeRole]} ko'rinishi</span>
        </div>
      </div>

      {/* Navigatsiya */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">Ish maydoni</p>
        {navItems.map(({ key, label }) => {
          const active = activeSubPage === key;
          return (
            <button
              key={key}
              onClick={() => setActiveSubPage(key)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
            </button>
          );
        })}
      </nav>

      {/* Foydalanuvchi */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${ROLE_DOT[activeRole]}`}>
            {activeRole.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-700 truncate">
              {activeRole === 'TEACHER'   ? 'Alisher Nazarov'  :
               activeRole === 'CASHIER'   ? 'Kassir Admin'     :
               activeRole === 'LOGISTICS' ? 'Logistika Admin'  : 'Direktor'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{activeRole.toLowerCase()}@smartbook.uz</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
