/**
 * views/CashierView/PipelineColumn.tsx — O'zbek tili
 * CRM Yo'nalish ustuni komponenti
 */

import { useState } from 'react';
import { CheckCircle2, CheckSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

import { OmmaviyQabulModali } from '../../components/QabulModallari';
import BuyurtmaKarta from './components/BuyurtmaKarta';
import TafsilotPaneli from './components/TafsilotPaneli';

interface PipelineColumnProps {
  statuses: OrderStatus[];
  title: string;
  subtitle: string;
  accentLeft: string;
  countColor: string;
}

export default function PipelineColumn({ statuses, title, subtitle, accentLeft, countColor }: PipelineColumnProps) {
  const { orders, getStudentName, getInventoryItem } = useApp();
  const [tanlangan, setTanlangan] = useState<Order | null>(null);
  const [qidiruv, setQidiruv] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkAcceptModal, setShowBulkAcceptModal] = useState(false);

  const statusBuyurtmalari = orders.filter(o => statuses.includes(o.status));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === statusBuyurtmalari.length
        ? new Set()
        : new Set(statusBuyurtmalari.map(o => o.id))
    );
  };

  const filtered = qidiruv.trim() === ''
    ? statusBuyurtmalari
    : statusBuyurtmalari.filter(o => {
        const q = qidiruv.toLowerCase();
        const studentName = getStudentName(o.studentId).toLowerCase();
        const inv         = getInventoryItem(o.bookId);
        const bookTitle   = (inv?.title ?? '').toLowerCase();
        const orderId     = o.id.toLowerCase();
        return studentName.includes(q) || bookTitle.includes(q) || orderId.includes(q);
      });

  const selectedOrdersToAccept = statusBuyurtmalari.filter(o => selectedIds.has(o.id));

  return (
    <>
      <div className={`flex flex-col w-full rounded-2xl border border-slate-200 bg-slate-50/60 border-l-4 shadow-sm ${accentLeft}`}>
        {/* Column header */}
        <div className="px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">{title}</p>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${countColor}`}>
              {filtered.length}{qidiruv && statusBuyurtmalari.length !== filtered.length ? `/${statusBuyurtmalari.length}` : ''}
            </span>
          </div>
          <p className="text-[10px] text-slate-700 mt-0.5 font-semibold">{subtitle}</p>

          {/* Bulk accept button for Yo'lda (ORDERED) column */}
          {statuses.includes('ORDERED') && statusBuyurtmalari.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {selectedIds.size > 0 ? (
                <button
                  onClick={() => setShowBulkAcceptModal(true)}
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" /> Tanlangan {selectedIds.size} ta kitobni qabul qilish
                </button>
              ) : (
                <button
                  onClick={toggleSelectAll}
                  className="w-full py-1.5 px-2 bg-slate-200/80 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-slate-600" /> Barchasini tanlash / qabul qilish
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={qidiruv}
              onChange={e => setQidiruv(e.target.value)}
              placeholder="Qidirish..."
              className="w-full h-8 pl-8 pr-8 text-[11px] font-semibold text-slate-800 placeholder-slate-500 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:outline-none rounded-lg transition-colors duration-150"
            />
            {qidiruv && (
              <button
                onClick={() => setQidiruv('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable card list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {filtered.length === 0
            ? <EmptyState label={qidiruv ? `"${qidiruv}" bo'yicha natija topilmadi.` : "Bu bosqichda buyurtmalar yo'q."} />
            : filtered.map(o => (
                <BuyurtmaKarta
                  key={o.id}
                  order={o}
                  onClick={() => setTanlangan(o)}
                  isSelected={selectedIds.has(o.id)}
                  onToggleSelect={statuses.includes('ORDERED') ? toggleSelect : undefined}
                />
              ))
          }
        </div>
      </div>

      {tanlangan && (
        <TafsilotPaneli order={tanlangan} onClose={() => setTanlangan(null)} />
      )}

      {showBulkAcceptModal && selectedOrdersToAccept.length > 0 && (
        <OmmaviyQabulModali
          orders={selectedOrdersToAccept}
          onClose={() => setShowBulkAcceptModal(false)}
          onSuccess={() => setSelectedIds(new Set())}
        />
      )}
    </>
  );
}
