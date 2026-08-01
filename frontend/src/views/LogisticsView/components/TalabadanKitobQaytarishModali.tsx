/**
 * views/LogisticsView/components/TalabadanKitobQaytarishModali.tsx
 * Modal to search and accept returned books/sets from students back into physical inventory.
 */

import { useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { EmptyState } from '../../../components/ui';
import BekorQilishModali from '../../../components/BekorQilishModali';
import KomplektSubBookReturnModal from './KomplektSubBookReturnModal';
import type { Order } from '../../../types';

export default function TalabadanKitobQaytarishModali({ onClose }: { onClose: () => void }) {
  const { orders, getStudentName, getGroupName, getInventoryItem, returnOrderWithStock } = useApp();
  const [qidiruv, setQidiruv] = useState('');
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);

  // Filter GIVEN orders (topshirilgan darsliklar)
  const givenOrders = orders.filter(o => o.status === 'GIVEN');

  const filtered = qidiruv.trim() === ''
    ? givenOrders
    : givenOrders.filter(o => {
        const q = qidiruv.toLowerCase();
        const studentName = getStudentName(o.studentId).toLowerCase();
        const groupName   = getGroupName(o.groupId).toLowerCase();
        const inv         = getInventoryItem(o.bookId);
        const bookTitle   = (inv?.title ?? '').toLowerCase();
        return studentName.includes(q) || groupName.includes(q) || bookTitle.includes(q) || o.id.toLowerCase().includes(q);
      });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold">Topshirilgan Kitobni Talabadan Qaytarib Olish</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={qidiruv}
                onChange={e => setQidiruv(e.target.value)}
                placeholder="Talaba ismi, guruh yoki darslik nomi bo'yicha qidirish..."
                className="w-full h-10 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Given orders list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filtered.length === 0 ? (
              <EmptyState label={qidiruv ? `"${qidiruv}" bo'yicha berilgan kitoblar topilmadi.` : "Hozircha topshirilgan kitoblar mavjud emas."} />
            ) : (
              filtered.map(o => {
                const inv = getInventoryItem(o.bookId);
                const studentName = getStudentName(o.studentId);
                const groupName = getGroupName(o.groupId);

                return (
                  <div key={o.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-purple-300 transition-all shadow-xs gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{studentName}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Guruh: <span className="text-slate-700">{groupName}</span> • Darslik: <span className="text-purple-700 font-bold">{inv?.title ?? '—'}</span>
                        {inv?.isSet && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-purple-100 text-purple-700 rounded-full">Komplekt</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setReturningOrder(o)}
                      className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shrink-0 inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Omborga qaytarish
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-right shrink-0">
            <button onClick={onClose} className="sb-btn-secondary py-1.5 px-4 text-xs font-bold">
              Yopish
            </button>
          </div>
        </div>
      </div>

      {returningOrder && (() => {
        const inv = getInventoryItem(returningOrder.bookId);
        if (inv?.isSet && inv?.setDetails) {
          return (
            <KomplektSubBookReturnModal
              order={returningOrder}
              onClose={() => setReturningOrder(null)}
              onConfirm={(selectedFileIds, reason) => {
                returnOrderWithStock(returningOrder.id, selectedFileIds, reason);
                setReturningOrder(null);
                onClose();
              }}
            />
          );
        }
        return (
          <BekorQilishModali
            targetName={`${getStudentName(returningOrder.studentId)} — ${inv?.title ?? 'Kitob'}`}
            title="Kitobni Ombor Zaxirasiga Qaytarish Sababi"
            onClose={() => setReturningOrder(null)}
            onConfirm={(reason) => {
              returnOrderWithStock(returningOrder.id, [], reason);
              setReturningOrder(null);
              onClose();
            }}
          />
        );
      })()}
    </>
  );
}
