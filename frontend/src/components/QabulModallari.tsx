/**
 * components/QabulModallari.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal components for accepting books (order status: ORDERED → ARRIVED)
 * and setting procurement cost (tan narxi) individually or in bulk.
 */

import { useState } from 'react';
import { Package, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uzs } from './ui';
import type { Order } from '../types';

interface SingleAcceptProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QabulQilishModali({ order, onClose, onSuccess }: SingleAcceptProps) {
  const { markArrived, getStudentName, getInventoryItem, sotuvNarxi } = useApp();
  const defaultSellingPrice = sotuvNarxi > 0 ? sotuvNarxi : order.sotuvNarxi;

  const [tanNarx, setTanNarx] = useState('');
  const [sotuvNarxInput, setSotuvNarxInput] = useState(String(defaultSellingPrice || ''));
  const [yuborish, setYuborish] = useState(false);
  const [xato, setXato] = useState('');
  const inv = getInventoryItem(order.bookId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valCost = parseFloat(tanNarx);
    if (isNaN(valCost) || valCost < 0) {
      setXato("Iltimos, to'g'ri tan narx kiriting.");
      return;
    }
    const valSell = parseFloat(sotuvNarxInput);
    if (isNaN(valSell) || valSell < 0) {
      setXato("Iltimos, to'g'ri sotuv narxi kiriting.");
      return;
    }

    setYuborish(true);
    try {
      await markArrived(order.id, valCost, valSell);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setYuborish(false);
    }
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Book info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Darslik:</span>
              <span className="font-bold text-slate-800 truncate max-w-[180px]">{inv?.title ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-semibold">Menejer belgilagan standart narx:</span>
              <span className="font-mono font-bold text-emerald-600">{uzs(defaultSellingPrice)}</span>
            </div>
          </div>

          {/* Cost input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Kitob tan narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={tanNarx}
              onChange={e => { setTanNarx(e.target.value); setXato(''); }}
              placeholder="Masalan: 45000 (0 bo'lsa tekin)"
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-indigo-500 focus:outline-none rounded-xl transition-colors font-mono"
              autoFocus
            />
          </div>

          {/* Selling price input (autofilled from manager setting, editable by logistics) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Sotuv narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={sotuvNarxInput}
              onChange={e => { setSotuvNarxInput(e.target.value); setXato(''); }}
              placeholder="Menejer tomonidan belgilangan sotuv narxi"
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-indigo-500 focus:outline-none rounded-xl transition-colors font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Menejer belgilagan standart sotuv narxi avto-to'ldiriladi. O'zgartirilsa, menejer narxi ham o'zgaradi.
            </p>
          </div>

          {xato && <p className="text-[11px] text-red-600 font-semibold mt-1">{xato}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={yuborish}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              {yuborish ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><Package className="w-3.5 h-3.5" /> Qabul qilish</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BulkAcceptProps {
  orders: Order[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function OmmaviyQabulModali({ orders, onClose, onSuccess }: BulkAcceptProps) {
  const { markArrived, getInventoryItem, sotuvNarxi, fireToast } = useApp();
  const [tanNarx, setTanNarx] = useState('');
  const [sotuvNarxInput, setSotuvNarxInput] = useState(String(sotuvNarxi || ''));
  const [yuborish, setYuborish] = useState(false);
  const [xato, setXato] = useState('');

  // Collect distinct book titles
  const bookTitles = Array.from(
    new Set(orders.map(o => getInventoryItem(o.bookId)?.title).filter(Boolean))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valCost = parseFloat(tanNarx);
    if (isNaN(valCost) || valCost < 0) {
      setXato("Iltimos, to'g'ri tan narx kiriting.");
      return;
    }
    const valSell = parseFloat(sotuvNarxInput);
    if (isNaN(valSell) || valSell < 0) {
      setXato("Iltimos, to'g'ri sotuv narxi kiriting.");
      return;
    }

    setYuborish(true);
    try {
      await Promise.all(orders.map(o => markArrived(o.id, valCost, valSell)));
      fireToast(`${orders.length} ta kitob muvaffaqiyatli qabul qilindi!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
    } finally {
      setYuborish(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Ommaviy kitob qabul qilish
            </p>
            <p className="text-[11px] text-emerald-100 mt-0.5 font-medium">
              Tanlangan: <span className="font-bold font-mono">{orders.length} ta buyurtma</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Books summary */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Qabul qilinadigan kitoblar:</p>
            <p className="text-slate-700 font-semibold truncate">
              {bookTitles.join(', ') || 'Tanlangan darsliklar'}
            </p>
          </div>

          {/* Cost input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Umumiy tan narxi (har bir kitob uchun so'mda)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={tanNarx}
              onChange={e => { setTanNarx(e.target.value); setXato(''); }}
              placeholder="Masalan: 45000 (barchasiga bir xil narx)"
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-emerald-500 focus:outline-none rounded-xl transition-colors font-mono"
              autoFocus
            />
          </div>

          {/* Selling price input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
              Sotuv narxi (har bir kitob uchun so'mda)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={sotuvNarxInput}
              onChange={e => { setSotuvNarxInput(e.target.value); setXato(''); }}
              placeholder="Menejer narxi..."
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-emerald-500 focus:outline-none rounded-xl transition-colors font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Menejer belgilagan standart sotuv narxi avto-to'ldiriladi.
            </p>
          </div>

          {xato && <p className="text-[11px] text-red-600 font-semibold mt-1">{xato}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={yuborish}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              {yuborish ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Barchasini qabul qilish</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
