/**
 * views/CashierView/PipelineColumn.tsx — O'zbek tili
 */

import { useState } from 'react';
import {
  DollarSign, XCircle, CheckCircle, RotateCcw,
  Lock, Unlock, AlertTriangle, X, ChevronRight, Package,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState, uzs } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

// ─── To'lov qabul qilish modali ────────────────────────────────────

// ─── Kitobni qabul qilish modali (tan narx kirish) ──────────────────────

function QabulQilishModali({ order, onClose }: { order: Order; onClose: () => void }) {
  const { markArrived, getStudentName, getInventoryItem } = useApp();
  const [tanNarx, setTanNarx] = useState('');
  const [yuborish, setYuborish] = useState(false);
  const [xato, setXato] = useState('');
  const inv = getInventoryItem(order.bookId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tanNarx);
    if (isNaN(val) || val <= 0) { setXato("Iltimos, to'g'ri tan narx kiriting."); return; }
    setYuborish(true);
    await markArrived(order.id, val);
    setYuborish(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl z-10 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4" /> Kitobni qabul qilish
            </p>
            <p className="text-[11px] text-blue-100 mt-0.5">{getStudentName(order.studentId)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Book info */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
            <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">{inv?.title ?? '—'}</span>
          </div>

          {/* Cost input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Kitob tan narxi (so'm)
            </label>
            <input
              type="number" min="1" step="1"
              value={tanNarx}
              onChange={e => { setTanNarx(e.target.value); setXato(''); }}
              placeholder="Masalan: 45000"
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-indigo-500 focus:outline-none rounded-xl transition-colors font-mono"
              autoFocus
            />
            {xato && <p className="text-[11px] text-red-600 font-semibold mt-1">{xato}</p>}
            <p className="text-[10px] text-slate-400 mt-1">
              Chakana narx (talabaga): <span className="font-semibold text-slate-600">
                {tanNarx && !isNaN(parseFloat(tanNarx)) ? uzs(parseFloat(tanNarx) * 1.5) : '—'}
              </span>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50">
              Bekor qilish
            </button>
            <button type="submit" disabled={yuborish}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5">
              {yuborish
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
                : <><Package className="w-3.5 h-3.5" /> Qabul qilish</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TolovModali({ order, onClose }: { order: Order; onClose: () => void }) {
  const { collectCash, retailPrice, getStudentName, getInventoryItem } = useApp();
  const [miqdor, setMiqdor] = useState('');
  const [xato, setXato] = useState('');
  const chakana = retailPrice(order);
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

      {tolovKorsat && <TolovModali order={order} onClose={() => setTolovKorsat(false)} />}
    </>
  );
}

// ─── Qarz to'lash modali ──────────────────────────────────────────────────────

function QarzTolovModali({ order, onClose }: { order: Order; onClose: () => void }) {
  const { collectCash, getStudentName, getInventoryItem } = useApp();
  const chakana  = order.sotuvNarxi;
  const qoldiq   = Math.max(0, chakana - order.amountPaid);
  const inv      = getInventoryItem(order.bookId);

  const [miqdor, setMiqdor] = useState(qoldiq.toFixed(2));
  const [yuborish, setYuborish] = useState(false);
  const [xato, setXato] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(miqdor);
    if (isNaN(val) || val <= 0) { setXato('To\'g\'ri miqdor kiriting.'); return; }
    setYuborish(true);
    // Simulate async API call (swap with real fetch when endpoint is ready)
    await new Promise(r => setTimeout(r, 400));
    collectCash(order.id, val);
    setYuborish(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl z-10 overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Qarz To'lovi</p>
            <p className="text-[11px] text-red-100 mt-0.5 font-medium">{getStudentName(order.studentId)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Debt alert banner */}
        <div className="mx-5 mt-5 flex items-center gap-3 px-4 py-3 bg-red-50 border-2 border-red-400 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Qoldiq qarz</p>
            <p className="text-xl font-black text-red-700 font-mono">{uzs(qoldiq)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-semibold text-red-700">To'langan</p>
            <p className="text-sm font-bold text-emerald-700 font-mono">{uzs(order.amountPaid)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Book info */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px]">
            <span className="text-slate-600 font-medium shrink-0">Darslik:</span>
            <span className="font-bold text-slate-800 truncate">{inv?.title ?? '—'}</span>
            <span className="ml-auto font-mono font-bold text-slate-700 shrink-0">{uzs(chakana)}</span>
          </div>

          {/* Payment input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Qabul qilingan miqdor (so'm)
            </label>
            <input
              type="number" min="0.01" step="0.01"
              value={miqdor}
              onChange={e => { setMiqdor(e.target.value); setXato(''); }}
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-blue-500 focus:outline-none rounded-xl transition-colors font-mono"
              autoFocus
            />
            {xato && <p className="text-[11px] text-red-600 font-semibold mt-1">{xato}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={yuborish}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all duration-150"
            >
              {yuborish
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
                : <><DollarSign className="w-3.5 h-3.5" /> Qarzni To'lash</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Minimal karta ────────────────────────────────────────────────────────────

function BuyurtmaKarta({ order, onClick }: { order: Order; onClick: () => void }) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    retailPrice, isDeliverable, deliverBook,
    orders,
  } = useApp();
  const [tolovKorsat,  setTolovKorsat]  = useState(false);
  const [qabulKorsat,  setQabulKorsat]  = useState(false);

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
          order.status === 'ARRIVED' && qoldiq > 0
            ? 'border-red-300 hover:border-red-400 hover:shadow-md hover:shadow-red-100'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 truncate">{getStudentName(order.studentId)}</p>
            <p className="text-[10px] text-slate-700 font-bold mt-0.5">{getGroupName(order.groupId)}</p>
          </div>
          <StatusBadge status={order.status} />
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

          {/* Blocked: student has other unpaid books */}
          {order.status === 'ARRIVED' && ochiq && boshqaQarz && (
            <div className="w-full py-1.5 bg-orange-100 border border-orange-300 text-orange-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 px-2">
              <Lock className="w-3 h-3 shrink-0" /> Boshqa kitoblarda qarz bor
            </div>
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
    </>
  );
}


// ─── Yo'nalish ustuni ─────────────────────────────────────────────────────────

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

  const statusBuyurtmalari = orders.filter(o => statuses.includes(o.status));

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

  // If column has no orders at all AND no active search, hide it entirely
  if (statusBuyurtmalari.length === 0 && qidiruv.trim() === '') return null;

  return (
    <>
      <div className={`flex flex-col min-w-[280px] max-w-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50/60 border-l-4 ${accentLeft}`}>
        {/* Column header */}
        <div className="px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">{title}</p>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${countColor}`}>
              {filtered.length}{qidiruv && statusBuyurtmalari.length !== filtered.length ? `/${statusBuyurtmalari.length}` : ''}
            </span>
          </div>
          <p className="text-[10px] text-slate-700 mt-0.5 font-semibold">{subtitle}</p>
        </div>

        {/* Search input — fixed height, does not shift columns */}
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

