/**
 * views/CashierView/components/QarzTolovModali.tsx — O'zbek tili
 */

import { useState } from 'react';
import { DollarSign, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { uzs } from '../../../components/ui';
import type { Order } from '../../../types';

interface QarzTolovModaliProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QarzTolovModali({ order, onClose, onSuccess }: QarzTolovModaliProps) {
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
