/**
 * views/CashierView/components/StudentQarzlarModali.tsx — O'zbek tili
 */

import { useState } from 'react';
import { DollarSign, AlertTriangle, X, Lock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge, uzs } from '../../../components/ui';

interface StudentQarzlarModaliProps {
  studentId: string;
  onClose: () => void;
}

export default function StudentQarzlarModali({ studentId, onClose }: StudentQarzlarModaliProps) {
  const { orders, collectCash, deliverBook, getStudentName, getInventoryItem, getGroupName } = useApp();
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const studentName = getStudentName(studentId);
  const studentOrders = orders.filter(o => o.studentId === studentId);

  // Compute total debt across active orders
  const activeOrders = studentOrders.filter(o => ['CREATED', 'PAID', 'ORDERED', 'ARRIVED'].includes(o.status));
  const totalDebt = activeOrders.reduce((sum, o) => sum + Math.max(0, o.sotuvNarxi - o.amountPaid), 0);

  const handlePay = async (orderId: string) => {
    const inputVal = paymentAmounts[orderId];
    if (!inputVal) return;
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount <= 0) return;

    setSubmittingId(orderId);
    try {
      await collectCash(orderId, amount);
      setPaymentAmounts(prev => ({ ...prev, [orderId]: '' }));
      // Check if all student debts are cleared
      const remainingTotal = activeOrders.reduce((sum, o) => {
        const paidNow = o.id === orderId ? amount : 0;
        return sum + Math.max(0, o.sotuvNarxi - (o.amountPaid + paidNow));
      }, 0);
      if (remainingTotal <= 0) {
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-slate-250 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-200" />
              <h3 className="text-base font-bold">Talaba Qarzdorliklari — Topshirish Bloklangan</h3>
            </div>
            <p className="text-xs text-amber-100 mt-0.5 font-medium">
              Talaba: <span className="font-bold underline">{studentName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total summary banner */}
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-900 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Barcha darsliklar bo'yicha jami qarz:</span>
          </div>
          <span className="font-mono text-lg font-black text-red-600 bg-white px-3 py-1 rounded-xl border border-red-200 shadow-sm">
            {uzs(totalDebt)}
          </span>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {studentOrders.map(o => {
            const inv = getInventoryItem(o.bookId);
            const qoldiq = Math.max(0, o.sotuvNarxi - o.amountPaid);
            const inputVal = paymentAmounts[o.id] !== undefined ? paymentAmounts[o.id] : (qoldiq > 0 ? qoldiq.toString() : '');

            return (
              <div
                key={o.id}
                className={`p-4 rounded-xl border transition-all ${
                  qoldiq > 0
                    ? 'bg-red-50/40 border-red-200 shadow-sm'
                    : 'bg-emerald-50/30 border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Guruh: {getGroupName(o.groupId)}
                    </span>
                    <p className="text-sm font-bold text-slate-800">{inv?.title ?? '—'}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs font-semibold my-2">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Chakana Narx</span>
                    {o.sotuvNarxi === 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded font-sans">To'lov ichida</span>
                    ) : (
                      <span className="font-mono text-slate-700">{uzs(o.sotuvNarxi)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">To'langan</span>
                    {o.sotuvNarxi === 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded font-sans">To'lov ichida</span>
                    ) : (
                      <span className="font-mono text-emerald-600 font-bold">{uzs(o.amountPaid)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Qoldiq Qarz</span>
                    <span className={`font-mono font-black ${qoldiq > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {uzs(qoldiq)}
                    </span>
                  </div>
                </div>

                {/* Inline payment form for unpaid orders */}
                {qoldiq > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">so'm</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={inputVal}
                        onChange={e => setPaymentAmounts(prev => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="Miqdor..."
                        className="w-full h-9 pl-12 pr-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      onClick={() => handlePay(o.id)}
                      disabled={submittingId === o.id || !inputVal || parseFloat(inputVal) <= 0}
                      className="px-4 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-all shrink-0"
                    >
                      {submittingId === o.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <DollarSign className="w-3.5 h-3.5" />
                          To'lash
                        </>
                      )}
                    </button>
                  </div>
                )}

                {qoldiq === 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> To'lov to'liq qoplangan
                    </div>
                    {o.status !== 'GIVEN' && (
                      <button
                        onClick={() => deliverBook(o.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Topshirish — Berildi
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
