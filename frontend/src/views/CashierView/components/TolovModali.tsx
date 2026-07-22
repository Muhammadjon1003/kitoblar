/**
 * views/CashierView/components/TolovModali.tsx — O'zbek tili
 */

import { useState } from 'react';
import { DollarSign, X, CheckCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { uzs } from '../../../components/ui';
import type { Order } from '../../../types';

interface TolovModaliProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TolovModali({ order, onClose, onSuccess }: TolovModaliProps) {
  const { collectCash, retailPrice, getStudentName, getInventoryItem } = useApp();
  const [miqdor, setMiqdor] = useState('');
  const [xato, setXato] = useState('');
  const [yuborish, setYuborish] = useState(false);
  const chakana = retailPrice(order);
  const qoldiq = chakana - order.amountPaid;
  const inv = getInventoryItem(order.bookId);

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
            <button type="submit" disabled={yuborish} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
              {yuborish
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
                : <><CheckCircle className="w-3.5 h-3.5" /> Tasdiqlash — To'langan</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
