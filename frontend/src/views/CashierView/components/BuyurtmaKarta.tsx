/**
 * views/CashierView/components/BuyurtmaKarta.tsx — O'zbek tili
 */

import { useState } from 'react';
import {
  DollarSign, CheckCircle, Lock, Unlock, AlertTriangle, ChevronRight, Package, CheckSquare, Square,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge, uzs } from '../../../components/ui';
import type { Order } from '../../../types';

import QarzTolovModali from './QarzTolovModali';
import StudentQarzlarModali from './StudentQarzlarModali';
import { QabulQilishModali } from '../../../components/QabulModallari';

interface BuyurtmaKartaProps {
  order: Order;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function BuyurtmaKarta({ order, onClick, isSelected, onToggleSelect }: BuyurtmaKartaProps) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    retailPrice, isDeliverable, deliverBook,
    orders, groups,
  } = useApp();
  const [tolovKorsat,  setTolovKorsat]  = useState(false);
  const [qabulKorsat,  setQabulKorsat]  = useState(false);
  const [studentQarzlarKorsat, setStudentQarzlarKorsat] = useState(false);

  const inv     = getInventoryItem(order.bookId);
  const ochiq   = isDeliverable(order);
  const chakana = retailPrice(order);
  const qoldiq  = Math.max(0, chakana - order.amountPaid);

  // Cross-student debt: ANY active order for this student with outstanding balance
  const boshqaQarz = orders.some(o =>
    o.id !== order.id &&
    o.studentId === order.studentId &&
    ['CREATED', 'PAID', 'ORDERED', 'ARRIVED'].includes(o.status) &&
    o.amountPaid < o.sotuvNarxi &&
    o.sotuvNarxi > 0
  );

  // Other active orders with outstanding balance
  const activeOtherOrdersWithDebt = orders.filter(o =>
    o.id !== order.id &&
    o.studentId === order.studentId &&
    ['CREATED', 'PAID', 'ORDERED', 'ARRIVED'].includes(o.status) &&
    o.amountPaid < o.sotuvNarxi &&
    o.sotuvNarxi > 0
  );

  const totalOtherDebt = activeOtherOrdersWithDebt.reduce((sum, o) => sum + Math.max(0, o.sotuvNarxi - o.amountPaid), 0);

  // Get titles of books with debt
  const otherDebtBooksInfo = activeOtherOrdersWithDebt.map(o => {
    const item = getInventoryItem(o.bookId);
    return item?.title ?? 'Kitob';
  });

  // For ARRIVED cards with debt: intercept click → open debt modal; otherwise open the drawer
  const handleCardClick = () => {
    if (order.status === 'ARRIVED' && qoldiq > 0) {
      setTolovKorsat(true);
    } else {
      onClick();
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`w-full text-left bg-white border rounded-xl px-4 py-3.5 transition-all duration-150 cursor-pointer group ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
            : order.status === 'ARRIVED' && qoldiq > 0
            ? 'border-red-300 hover:border-red-400 hover:shadow-md hover:shadow-red-100'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-55'
        }`}
      >
        {/* Header - clicking student name or group name opens the comprehensive StudentQarzlarModali */}
        <div className="flex items-start justify-between gap-2">
          <div 
            className="min-w-0 hover:text-indigo-600 transition-colors flex-1"
            onClick={(e) => { e.stopPropagation(); setStudentQarzlarKorsat(true); }}
            title="Talabaning barcha kitoblarini ko'rish"
          >
            <p className="text-[13px] font-bold text-slate-800 truncate underline decoration-dashed decoration-slate-350 hover:decoration-indigo-500">
              {getStudentName(order.studentId)}
            </p>
            <p className="text-[10px] text-slate-700 font-bold mt-0.5">
              {getGroupName(order.groupId)}
              <span className="text-slate-400 font-normal mx-1">•</span>
              <span className="text-slate-500 font-medium">O'qituvchi: {groups.find(g => g.id === order.groupId)?.teacherName ?? '—'}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleSelect && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(order.id); }}
                className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5"
                title={isSelected ? "Tanlovni bekor qilish" : "Qabul qilish uchun tanlash"}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 text-emerald-600 font-bold" />
                  : <Square className="w-4 h-4 text-slate-400" />
                }
              </button>
            )}
            <StatusBadge status={order.status} />
          </div>
        </div>

        <p className="text-[11px] font-semibold text-slate-700 mt-2 leading-snug truncate">{inv?.title ?? '—'}</p>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {order.status === 'ARRIVED' ? (
              <span className={`text-[11px] font-bold flex items-center gap-1 ${ochiq ? 'text-emerald-600' : 'text-red-600'}`}>
                {ochiq
                  ? <><Unlock className="w-3 h-3" /> Topshirishga tayyor</>
                  : <><AlertTriangle className="w-3 h-3" /> Qarz: {uzs(qoldiq)} — bosing</>
                }
              </span>
            ) : order.status === 'ORDERED' ? (
              <span className="text-[11px] font-bold text-indigo-600">Yo'lda (Yuborilgan)</span>
            ) : order.sotuvNarxi === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
            ) : order.status === 'CREATED' ? (
              <span className="text-[11px] font-bold text-slate-800">Kutilmoqda: {uzs(chakana)}</span>
            ) : (
              <span className="text-[11px] font-bold text-slate-800">To'langan: {uzs(order.amountPaid)}</span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </div>

          {/* Accept Books button for ORDERED — opens cost modal */}
          {order.status === 'ORDERED' && (
            <button
              onClick={(e) => { e.stopPropagation(); setQabulKorsat(true); }}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-1"
            >
              <Package className="w-3 h-3" /> Kitobni qabul qilish
            </button>
          )}

          {/* Hand Over button — only shown when ARRIVED, fully paid, AND no other student debts */}
          {order.status === 'ARRIVED' && ochiq && !boshqaQarz && (
            <button
              onClick={(e) => { e.stopPropagation(); deliverBook(order.id); }}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-3 h-3" /> Topshirish
            </button>
          )}

          {/* Blocked: student has other unpaid books. Interactive button opens StudentQarzlarModali */}
          {order.status === 'ARRIVED' && ochiq && boshqaQarz && (
            <button
              onClick={(e) => { e.stopPropagation(); setStudentQarzlarKorsat(true); }}
              className="w-full py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100/80 text-orange-850 text-[10px] font-bold rounded-lg text-left px-3 transition-all duration-150 space-y-1"
            >
              <div className="flex items-center gap-1 font-extrabold text-orange-700">
                <Lock className="w-3 h-3 shrink-0" /> Boshqa qarz: {uzs(totalOtherDebt)}
              </div>
              <div className="text-[9px] text-orange-600 font-semibold truncate leading-tight">
                Qarzdor: {otherDebtBooksInfo.join(', ')}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-orange-700 font-black text-right pt-1 border-t border-orange-200/50 flex items-center justify-end gap-0.5">
                Qarzlarni to'lash &rarr;
              </div>
            </button>
          )}

          {/* Debt prompt — shown when ARRIVED and has outstanding balance */}
          {order.status === 'ARRIVED' && qoldiq > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setTolovKorsat(true); }}
              className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-1"
            >
              <DollarSign className="w-3 h-3" /> Qarzni To'lash — {uzs(qoldiq)}
            </button>
          )}
        </div>
      </div>

      {tolovKorsat && (
        <QarzTolovModali order={order} onClose={() => setTolovKorsat(false)} />
      )}
      {qabulKorsat && (
        <QabulQilishModali order={order} onClose={() => setQabulKorsat(false)} />
      )}
      {studentQarzlarKorsat && (
        <StudentQarzlarModali studentId={order.studentId} onClose={() => setStudentQarzlarKorsat(false)} />
      )}
    </>
  );
}
