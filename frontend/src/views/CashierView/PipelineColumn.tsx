/**
 * views/CashierView/PipelineColumn.tsx — O'zbek tili
 */

import { useState } from 'react';
import {
  DollarSign, XCircle, CheckCircle, RotateCcw,
  Lock, Unlock, AlertTriangle, X, ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

// ─── To'lov qabul qilish modali ──────────────────────────────────────────────

function TolovModali({ order, onClose }: { order: Order; onClose: () => void }) {
  const { collectCash, retailPrice, getStudentName, getInventoryItem } = useApp();
  const [miqdor, setMiqdor] = useState('');
  const [xato, setXato] = useState('');
  const chakana = retailPrice(order.bookCost);
  const qoldiq = chakana - order.amountPaid;
  const inv = getInventoryItem(order.bookId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(miqdor);
    if (isNaN(val) || val <= 0) { setXato('To\'g\'ri miqdor kiriting.'); return; }
    collectCash(order.id, val);
    onClose();
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
          {/* Hisob-faktura */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Darslik</span>
              <span className="text-slate-700 font-medium truncate max-w-[160px]">{inv?.title}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Chakana narx (×1.5)</span>
              <span className="font-mono font-semibold text-slate-800">${chakana}</span>
            </div>
            <div className="flex justify-between text-slate-500 pt-1.5 border-t border-slate-200">
              <span>To'langan</span>
              <span className="font-mono text-emerald-600 font-semibold">${order.amountPaid}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Qoldiq qarz</span>
              <span className="font-mono text-amber-600">${qoldiq.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="sb-label">Qabul qilingan miqdor</label>
            <input
              type="number" min="0.01" step="0.01" className="sb-input"
              placeholder={`Qarz: $${qoldiq.toFixed(2)}`}
              value={miqdor}
              onChange={e => { setMiqdor(e.target.value); setXato(''); }}
              autoFocus
            />
            {xato && <p className="text-[11px] text-red-500 mt-1">{xato}</p>}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
            <button type="submit" className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> Tasdiqlash — To'langan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tafsilot paneli (drawer) ─────────────────────────────────────────────────

function TafsilotPaneli({ order, onClose }: { order: Order; onClose: () => void }) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    cancelOrder, deliverBook, decoupleBook,
    retailPrice, isDeliverable,
  } = useApp();
  const [tolovKorsat, setTolovKorsat] = useState(false);

  const inv       = getInventoryItem(order.bookId);
  const chakana   = retailPrice(order.bookCost);
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
            <p className="text-[11px] text-slate-400 mt-0.5">{getGroupName(order.groupId)}</p>
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
            <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{inv?.tgFileId}</p>
          </div>

          {/* Moliyaviy ma'lumot */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">To'lov holati</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chakana narx (narx × 1.5)</span>
                <span className="font-mono font-semibold text-slate-800">${chakana}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">To'langan miqdor</span>
                <span className="font-mono font-semibold text-emerald-600">${order.amountPaid}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Qoldiq qarz</span>
                <span className={`font-mono font-semibold ${qoldiq > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  ${qoldiq.toFixed(2)}
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
            <span className="text-slate-500">Ulgurji narx (book_cost)</span>
            <span className="font-mono font-semibold text-slate-600">${order.bookCost}</span>
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
                  Qoldiq qarz: ${qoldiq.toFixed(2)} — to'liq to'languncha topshirish bloklangan.
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

      {tolovKorsat && <TolovModali order={order} onClose={() => setTolovKorsat(false)} />}
    </>
  );
}

// ─── Minimal karta ────────────────────────────────────────────────────────────

function BuyurtmaKarta({ order, onClick }: { order: Order; onClick: () => void }) {
  const { getStudentName, getGroupName, getInventoryItem, retailPrice, isDeliverable } = useApp();
  const inv      = getInventoryItem(order.bookId);
  const ochiq    = isDeliverable(order);
  const chakana  = retailPrice(order.bookCost);
  const qoldiq   = Math.max(0, chakana - order.amountPaid);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 truncate">{getStudentName(order.studentId)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{getGroupName(order.groupId)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="text-[11px] text-slate-500 mt-2 leading-snug truncate">{inv?.title ?? '—'}</p>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
        {order.status === 'ARRIVED' ? (
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${ochiq ? 'text-emerald-600' : 'text-amber-600'}`}>
            {ochiq
              ? <><Unlock className="w-3 h-3" /> Topshirishga tayyor</>
              : <><Lock className="w-3 h-3" /> Qarz: ${qoldiq.toFixed(2)}</>
            }
          </span>
        ) : order.status === 'CREATED' ? (
          <span className="text-[11px] text-slate-400">Kutilmoqda: ${chakana}</span>
        ) : (
          <span className="text-[11px] text-slate-400">To'langan: ${order.amountPaid}</span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
      </div>
    </button>
  );
}

// ─── Yo'nalish ustuni ─────────────────────────────────────────────────────────

interface PipelineColumnProps {
  status: OrderStatus;
  title: string;
  subtitle: string;
  accentLeft: string;
  countColor: string;
}

export default function PipelineColumn({ status, title, subtitle, accentLeft, countColor }: PipelineColumnProps) {
  const { orders } = useApp();
  const [tanlangan, setTanlangan] = useState<Order | null>(null);

  const bosqichBuyurtmalari = orders.filter(o => o.status === status);

  return (
    <>
      <div className={`flex flex-col min-w-[280px] max-w-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50/60 border-l-4 ${accentLeft}`}>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">{title}</p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${countColor}`}>
              {bosqichBuyurtmalari.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {bosqichBuyurtmalari.length === 0
            ? <EmptyState label="Bu bosqichda buyurtmalar yo'q." />
            : bosqichBuyurtmalari.map(o => (
                <BuyurtmaKarta key={o.id} order={o} onClick={() => setTanlangan(o)} />
              ))
          }
        </div>
      </div>

      {tanlangan && (
        <TafsilotPaneli order={tanlangan} onClose={() => setTanlangan(null)} />
      )}
    </>
  );
}
