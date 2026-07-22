/**
 * views/CashierView/components/TafsilotPaneli.tsx — O'zbek tili
 */

import { useState } from 'react';
import {
  DollarSign, XCircle, RotateCcw, Lock, Unlock, AlertTriangle, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge, uzs } from '../../../components/ui';
import type { Order } from '../../../types';
import TolovModali from './TolovModali';

export default function TafsilotPaneli({ order, onClose }: { order: Order; onClose: () => void }) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    cancelOrder, deliverBook, decoupleBook,
    retailPrice, isDeliverable, groups,
  } = useApp();
  const [tolovKorsat, setTolovKorsat] = useState(false);

  const inv       = getInventoryItem(order.bookId);
  const chakana   = retailPrice(order);
  const ochiq     = isDeliverable(order);
  const qoldiq    = Math.max(0, chakana - order.amountPaid);
  const tolovPct  = chakana > 0 ? Math.min(100, Math.round((order.amountPaid / chakana) * 100)) : 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Sarlavha */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">{getStudentName(order.studentId)}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Guruh: <span className="text-slate-800 font-semibold">{getGroupName(order.groupId)}</span>
              <span className="mx-1.5">•</span>
              O'qituvchi: <span className="text-slate-800 font-semibold">{groups.find(g => g.id === order.groupId)?.teacherName ?? '—'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Holat */}
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="text-[10px] text-slate-400 font-mono">Yangilangan: {order.updatedAt}</span>
          </div>

          {/* Darslik */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Darslik</p>
            <p className="text-sm font-semibold text-slate-800 leading-snug">{inv?.title ?? '—'}</p>
          </div>

          {/* Moliyaviy ma'lumot */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">To'lov holati</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chakana narx (narx × 1.5)</span>
                <span className="font-mono font-semibold text-slate-800">{uzs(chakana)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">To'langan miqdor</span>
                <span className="font-mono font-semibold text-emerald-600">{uzs(order.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Qoldiq qarz</span>
                  <span className={`font-mono font-semibold ${qoldiq > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {uzs(qoldiq)}
                  </span>
              </div>
              {/* To'lov jarayoni */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>To'lov jarayoni</span>
                  <span className="font-semibold">{tolovPct}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${tolovPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${tolovPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Izoh */}
          {order.comment && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Izoh</p>
              <p className="text-[12px] text-amber-800">{order.comment}</p>
            </div>
          )}

          {/* Ulgurji narx */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] flex justify-between items-center">
            <span className="text-slate-500">Tan narxi</span>
            <span className="font-mono font-semibold text-slate-600">{uzs(order.bookCost)}</span>
          </div>
        </div>

        {/* Amallar paneli */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-2 shrink-0">
          {order.status === 'CREATED' && (
            <>
              <button
                onClick={() => setTolovKorsat(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                <DollarSign className="w-4 h-4" /> To'lov qabul qilish
              </button>
              <button
                onClick={() => { cancelOrder(order.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Buyurtmani bekor qilish
              </button>
            </>
          )}

          {order.status === 'ARRIVED' && (
            <>
              {!ochiq && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Qoldiq qarz: {uzs(qoldiq)} — to'liq to'languncha topshirish bloklangan.
                </div>
              )}
              <button
                onClick={() => { if (ochiq) { deliverBook(order.id); onClose(); } }}
                disabled={!ochiq}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                  ochiq
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {ochiq
                  ? <><Unlock className="w-4 h-4" /> Kitobni topshirish — Berildi</>
                  : <><Lock className="w-4 h-4" /> Topshirish bloklangan</>
                }
              </button>
              <button
                onClick={() => { decoupleBook(order.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-50 border border-purple-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Omborga qaytarish
              </button>
            </>
          )}
        </div>
      </div>

      {tolovKorsat && (
        <TolovModali
          order={order}
          onClose={() => setTolovKorsat(false)}
          onSuccess={() => {
            setTolovKorsat(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
