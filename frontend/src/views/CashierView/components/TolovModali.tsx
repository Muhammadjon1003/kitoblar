/**
 * views/CashierView/components/TolovModali.tsx — O'zbek tili
 */

import { useState } from 'react';
import { DollarSign, X, CheckCircle, Tag, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { uzs } from '../../../components/ui';
import type { Order } from '../../../types';

interface TolovModaliProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TolovModali({ order, onClose, onSuccess }: TolovModaliProps) {
  const { collectCash, markCoursePayment, retailPrice, getStudentName, getInventoryItem, orders } = useApp();
  const [miqdor, setMiqdor] = useState('');
  const [xato, setXato] = useState('');
  const [yuborish, setYuborish] = useState(false);
  const [yuborishCourse, setYuborishCourse] = useState(false);
  const chakana = retailPrice(order);
  const qoldiq = chakana - order.amountPaid;
  const inv = getInventoryItem(order.bookId);

  // Student's order history logic
  const studentPastOrders = orders.filter(o =>
    o.studentId === order.studentId &&
    o.id !== order.id &&
    o.status !== 'CANCELLED'
  ).sort((a, b) => {
    const timeA = new Date(a.createdAt || a.updatedAt).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt).getTime();
    return timeB - timeA;
  });

  const lastOrder = studentPastOrders[0];
  const lastOrderInv = lastOrder ? getInventoryItem(lastOrder.bookId) : null;

  // Days elapsed calculation
  const currentDateStr = order.createdAt || order.updatedAt;
  const lastDateStr = lastOrder ? (lastOrder.createdAt || lastOrder.updatedAt) : '';
  
  const currentDate = currentDateStr ? new Date(currentDateStr).getTime() : Date.now();
  const lastOrderDate = lastDateStr ? new Date(lastDateStr).getTime() : 0;
  
  const daysDiff = lastOrderDate > 0 ? Math.floor((currentDate - lastOrderDate) / (1000 * 60 * 60 * 24)) : null;

  // Same day order check (bulk order of multiple books on exact same date)
  const isSameDayOrder = lastOrderDate > 0 && 
    new Date(currentDate).toDateString() === new Date(lastOrderDate).toDateString();

  // Rule 1: Duplicate same book ordered before (regardless of time)
  const hasDuplicateBookOrder = studentPastOrders.some(o => o.bookId === order.bookId);

  // Rule 2: Last order < 61 days (2 months) AND NOT same day
  const isLessThan2Months = daysDiff !== null && daysDiff < 61 && !isSameDayOrder;

  // Show Red Warning if duplicate book OR ordered < 2 months ago
  const showRedWarning = hasDuplicateBookOrder || isLessThan2Months;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(miqdor);
    if (isNaN(val) || val <= 0) { setXato('To\'g\'ri miqdor kiriting.'); return; }
    setYuborish(true);
    try {
      await collectCash(order.id, val);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setYuborish(false);
    }
  };

  const handleCoursePayment = async () => {
    setYuborishCourse(true);
    try {
      await markCoursePayment(order.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setYuborishCourse(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl z-10">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">To'lov qabul qilish</p>
            <p className="text-[11px] text-slate-400">{getStudentName(order.studentId)}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Student Last Order & Warning Box */}
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
            showRedWarning
              ? 'bg-red-50 border-red-200 text-red-900 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[11px]">
                {showRedWarning ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                Oxirgi buyurtma qilingan darslik:
              </span>
              {lastOrder ? (
                <span className="font-mono text-[10px] text-slate-500">{lastDateStr}</span>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">Mavjud emas</span>
              )}
            </div>

            {lastOrder ? (
              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <span>📘 {lastOrderInv?.title ?? 'Darslik'}</span>
                <span className="text-[10px] font-normal text-slate-500">
                  ({daysDiff !== null ? (daysDiff === 0 ? 'Bugun' : `${daysDiff} kun oldin`) : '—'})
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">Bu talaba uchun birinchi darslik buyurtmasi.</div>
            )}

            {/* Red Warning Alerts */}
            {hasDuplicateBookOrder && (
              <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-[11px] font-bold text-red-900 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>Ogohlantirish: Ushbu talabaga ilgari ham ayni shu darslik ("{inv?.title}") buyurtma berilgan!</span>
              </div>
            )}

            {isLessThan2Months && !hasDuplicateBookOrder && (
              <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-[11px] font-bold text-red-900 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>Ogohlantirish: Talabaning oxirgi darsligi 2 oydan kam vaqt ichida ({daysDiff} kun oldin) buyurtma qilingan!</span>
              </div>
            )}
          </div>

          {/* Hisob-faktura */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Darslik</span>
              <span className="text-slate-700 font-medium truncate max-w-[160px]">{inv?.title}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Chakana narx (×1.5)</span>
              <span className="font-mono font-semibold text-slate-800">{uzs(chakana)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pt-1.5 border-t border-slate-200">
              <span>To'langan</span>
              <span className="font-mono text-emerald-600 font-semibold">{uzs(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Qoldiq qarz</span>
              <span className="font-mono text-amber-600">{uzs(qoldiq)}</span>
            </div>
          </div>

          <div>
            <label className="sb-label">Qabul qilingan miqdor</label>
            <input
              type="number" min="0.01" step="0.01" className="sb-input"
              placeholder={`Qarz: ${uzs(qoldiq)}`}
              value={miqdor}
              onChange={e => { setMiqdor(e.target.value); setXato(''); }}
              autoFocus
            />
            {xato && <p className="text-[11px] text-red-500 mt-1">{xato}</p>}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={handleCoursePayment}
              disabled={yuborish || yuborishCourse}
              className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {yuborishCourse ? (
                <><span className="w-3.5 h-3.5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><Tag className="w-3.5 h-3.5" /> To'lov ichida (Kurs to'loviga kiritilgan — 0 so'm)</>
              )}
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
              <button type="submit" disabled={yuborish || yuborishCourse} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
                {yuborish
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
                  : <><CheckCircle className="w-3.5 h-3.5" /> Tasdiqlash — To'langan</>
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
