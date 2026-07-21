/**
 * views/CashierView/PipelineColumn.tsx — O'zbek tili
 */

import { useState } from 'react';
import {
  DollarSign, XCircle, CheckCircle, RotateCcw,
  Lock, Unlock, AlertTriangle, X, ChevronRight, Package,
  CheckSquare, Square, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState, uzs } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

import { QabulQilishModali, OmmaviyQabulModali } from '../../components/QabulModallari';

// ─── To'lov qabul qilish modali ────────────────────────────────────

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
    try {
      await collectCash(order.id, val);
    } catch (err) {
      console.error(err);
    } finally {
      setYuborish(false);
      onClose();
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

// ─── Talaba barcha kitoblari va qarzlari modali ────────────────────────────────

interface StudentQarzlarModaliProps {
  studentId: string;
  onClose: () => void;
}

function StudentQarzlarModali({ studentId, onClose }: StudentQarzlarModaliProps) {
  const { orders, collectCash, getStudentName, getInventoryItem, getGroupName } = useApp();
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
      // Clear input
      setPaymentAmounts(prev => ({ ...prev, [orderId]: '' }));
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
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white shrink-0">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Talaba kitoblari va qarzdorligi</h3>
            <p className="text-[11px] text-orange-100 font-medium">{studentName}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Total debt summary card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-255'}`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Umumiy qarz miqdori</p>
              <p className={`text-2xl font-black font-mono ${totalDebt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {uzs(totalDebt)}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${totalDebt > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-705'}`}>
              {totalDebt > 0 ? 'Qarzdorlik mavjud' : 'Qarz yo\'q'}
            </span>
          </div>

          {/* Book allocation status / Orders list */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Biriktirilgan barcha kitoblar ({studentOrders.length})</p>
            {studentOrders.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                <p className="text-xs text-slate-500 italic">Talabaga hozircha hech qanday kitob biriktirilmagan.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {studentOrders.map(o => {
                  const inv = getInventoryItem(o.bookId);
                  const debt = Math.max(0, o.sotuvNarxi - o.amountPaid);
                  const isPending = ['CREATED', 'PAID', 'ORDERED', 'ARRIVED'].includes(o.status);

                  return (
                    <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-slate-800 truncate max-w-[200px] md:max-w-[300px]">
                            {inv?.title ?? 'Noma\'lum kitob'}
                          </span>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">{getGroupName(o.groupId)}</p>
                        <div className="flex gap-4 text-[10px] text-slate-650 font-medium">
                          <span>Sotuv narxi: <strong className="font-mono text-slate-800">{uzs(o.sotuvNarxi)}</strong></span>
                          <span>To\'langan: <strong className="font-mono text-slate-800">{uzs(o.amountPaid)}</strong></span>
                        </div>
                      </div>

                      {/* Payment section for items with debt */}
                      {isPending && debt > 0 ? (
                        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 w-full md:w-auto">
                          <div className="relative flex-1 md:flex-initial">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder={`Qoldiq: ${debt}`}
                              value={paymentAmounts[o.id] || ''}
                              onChange={e => setPaymentAmounts(prev => ({ ...prev, [o.id]: e.target.value }))}
                              className="w-full md:w-32 h-9 px-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                            />
                            {debt > 0 && (
                              <button
                                type="button"
                                onClick={() => setPaymentAmounts(prev => ({ ...prev, [o.id]: String(debt) }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-orange-650 hover:text-orange-850 uppercase"
                              >
                                Max
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={submittingId === o.id || !paymentAmounts[o.id]}
                            onClick={() => handlePay(o.id)}
                            className="px-3 h-9 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            {submittingId === o.id ? (
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <DollarSign className="w-3.5 h-3.5" />
                            )}
                            To\'lash
                          </button>
                        </div>
                      ) : (
                        <div className="text-right shrink-0">
                          {debt === 0 && isPending ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> To'liq to'langan
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Topshirilgan</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Minimal karta ────────────────────────────────────────────────────────────


interface BuyurtmaKartaProps {
  order: Order;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function BuyurtmaKarta({ order, onClick, isSelected, onToggleSelect }: BuyurtmaKartaProps) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    retailPrice, isDeliverable, deliverBook,
    orders,
  } = useApp();
  const [tolovKorsat,  setTolovKorsat]  = useState(false);
  const [qabulKorsat,  setQabulKorsat]  = useState(false);
  const [studentQarzlarKorsat, setStudentQarzlarKorsat] = useState(false);

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

  // Other active orders with outstanding balance
  const activeOtherOrdersWithDebt = orders.filter(o =>
    o.id !== order.id &&
    o.studentId === order.studentId &&
    ['CREATED', 'PAID', 'ORDERED', 'ARRIVED'].includes(o.status) &&
    o.amountPaid < o.sotuvNarxi &&
    o.sotuvNarxi > 0
  );

  const totalOtherDebt = activeOtherOrdersWithDebt.reduce((sum, o) => sum + Math.max(0, o.sotuvNarxi - o.amountPaid), 0);

  // Get titles of books with debt
  const otherDebtBooksInfo = activeOtherOrdersWithDebt.map(o => {
    const item = getInventoryItem(o.bookId);
    return item?.title ?? 'Kitob';
  });

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
          isSelected
            ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
            : order.status === 'ARRIVED' && qoldiq > 0
            ? 'border-red-300 hover:border-red-400 hover:shadow-md hover:shadow-red-100'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-55'
        }`}
      >
        {/* Header - clicking student name or group name opens the comprehensive StudentQarzlarModali */}
        <div className="flex items-start justify-between gap-2">
          <div 
            className="min-w-0 hover:text-indigo-600 transition-colors flex-1"
            onClick={(e) => { e.stopPropagation(); setStudentQarzlarKorsat(true); }}
            title="Talabaning barcha kitoblarini ko'rish"
          >
            <p className="text-[13px] font-bold text-slate-800 truncate underline decoration-dashed decoration-slate-350 hover:decoration-indigo-500">
              {getStudentName(order.studentId)}
            </p>
            <p className="text-[10px] text-slate-700 font-bold mt-0.5">{getGroupName(order.groupId)}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleSelect && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(order.id); }}
                className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5"
                title={isSelected ? "Tanlovni bekor qilish" : "Qabul qilish uchun tanlash"}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 text-emerald-600 font-bold" />
                  : <Square className="w-4 h-4 text-slate-400" />
                }
              </button>
            )}
            <StatusBadge status={order.status} />
          </div>
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

          {/* Blocked: student has other unpaid books. Interactive button opens StudentQarzlarModali */}
          {order.status === 'ARRIVED' && ochiq && boshqaQarz && (
            <button
              onClick={(e) => { e.stopPropagation(); setStudentQarzlarKorsat(true); }}
              className="w-full py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100/80 text-orange-850 text-[10px] font-bold rounded-lg text-left px-3 transition-all duration-150 space-y-1"
            >
              <div className="flex items-center gap-1 font-extrabold text-orange-700">
                <Lock className="w-3 h-3 shrink-0" /> Boshqa qarz: {uzs(totalOtherDebt)}
              </div>
              <div className="text-[9px] text-orange-600 font-semibold truncate leading-tight">
                Qarzdor: {otherDebtBooksInfo.join(', ')}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-orange-700 font-black text-right pt-1 border-t border-orange-200/50 flex items-center justify-end gap-0.5">
                Qarzlarni to'lash &rarr;
              </div>
            </button>
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
      {studentQarzlarKorsat && (
        <StudentQarzlarModali studentId={order.studentId} onClose={() => setStudentQarzlarKorsat(false)} />
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

