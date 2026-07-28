import { useState } from 'react';
import {
  DollarSign, XCircle, RotateCcw, Lock, X, CheckCircle, Edit3, AlertTriangle, Clock, Sparkles
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge, uzs } from '../../../components/ui';
import type { Order } from '../../../types';
import TolovModali from './TolovModali';
import FixPaymentModal from './FixPaymentModal';
import BekorQilishModali from '../../../components/BekorQilishModali';

export default function TafsilotPaneli({ order, onClose }: { order: Order; onClose: () => void }) {
  const {
    getStudentName, getGroupName, getInventoryItem,
    cancelOrder, deliverBook, decoupleBook,
    retailPrice, isDeliverable, groups, orders,
  } = useApp();
  const [tolovKorsat, setTolovKorsat] = useState(false);
  const [fixKorsat, setFixKorsat]     = useState(false);
  const [bekorKorsat, setBekorKorsat] = useState(false);

  const inv       = getInventoryItem(order.bookId);
  const chakana   = retailPrice(order);
  const ochiq     = isDeliverable(order);
  const qoldiq    = Math.max(0, chakana - order.amountPaid);
  const tolovPct  = chakana > 0 ? Math.min(100, Math.round((order.amountPaid / chakana) * 100)) : 0;
  const studentName = getStudentName(order.studentId);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Sarlavha */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">{studentName}</p>
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
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Darslik</p>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{inv?.title ?? '—'}</p>
            </div>

            {/* Origin indicator for cashier handover */}
            {['ARRIVED', 'Ombordan biriktirildi'].includes(order.status) && (
              <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                order.status === 'Ombordan biriktirildi' || (order.comment || '').toLowerCase().includes('ombor')
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <span className="text-lg leading-none">
                  {order.status === 'Ombordan biriktirildi' || (order.comment || '').toLowerCase().includes('ombor') ? '📦' : '🚚'}
                </span>
                <div className="space-y-0.5">
                  <p className="font-extrabold uppercase tracking-wide text-[11px]">
                    {order.status === 'Ombordan biriktirildi' || (order.comment || '').toLowerCase().includes('ombor')
                      ? "Ombor Zaxirasidan Oling"
                      : "Yangi Kelgan Partiyadan Oling"}
                  </p>
                  <p className="text-[10px] font-medium leading-tight opacity-90">
                    {order.status === 'Ombordan biriktirildi' || (order.comment || '').toLowerCase().includes('ombor')
                      ? "Ushbu kitob ombordagi bo'sh/qaytarilgan zaxiradan biriktirilgan. Kitobni ombor zaxira tokchasidan oling."
                      : "Ushbu kitob ta'minotchidan kelgan yangi partiyadan biriktirilgan. Yangi partiya tokchasidan oling."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Moliyaviy ma'lumot */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">To'lov holati</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chakana narx (narx × 1.5)</span>
                {order.sotuvNarxi === 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                ) : (
                  <span className="font-mono font-semibold text-slate-800">{uzs(chakana)}</span>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">To'langan miqdor</span>
                {order.sotuvNarxi === 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                ) : (
                  <span className="font-mono font-semibold text-emerald-600">{uzs(order.amountPaid)}</span>
                )}
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
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Izoh / Sabab</p>
              <p className="text-[12px] text-amber-800 font-medium">{order.comment}</p>
            </div>
          )}

          {/* Replaces Tan narxi: Student Order History & Red Alert Box */}
          {(() => {
            const studentPastOrders = orders.filter(o =>
              o.studentId === order.studentId &&
              o.id !== order.id &&
              o.status !== 'CANCELLED'
            ).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.updatedAt).getTime();
              const timeB = new Date(b.createdAt || b.updatedAt).getTime();
              return timeB - timeA;
            });

            const lastOrder = studentPastOrders[0];
            const lastOrderInv = lastOrder ? getInventoryItem(lastOrder.bookId) : null;
            const isFirstOrder = studentPastOrders.length === 0;

            const currentDateStr = order.createdAt || order.updatedAt;
            const lastDateStr = lastOrder ? (lastOrder.createdAt || lastOrder.updatedAt) : '';

            const currentDate = currentDateStr ? new Date(currentDateStr).getTime() : Date.now();
            const lastOrderDate = lastDateStr ? new Date(lastDateStr).getTime() : 0;
            const daysDiff = lastOrderDate > 0 ? Math.floor((currentDate - lastOrderDate) / (1000 * 60 * 60 * 24)) : null;

            const isSameDayOrder = lastOrderDate > 0 && 
              new Date(currentDate).toDateString() === new Date(lastOrderDate).toDateString();

            const hasDuplicateBookOrder = studentPastOrders.some(o => o.bookId === order.bookId);
            const isLessThan2Months = daysDiff !== null && daysDiff < 61 && !isSameDayOrder;
            const showRedWarning = hasDuplicateBookOrder || isLessThan2Months;

            if (isFirstOrder) {
              return (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      Buyurtma tarixi:
                    </span>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      Birinchi buyurtma ✨
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-blue-800 mt-0.5">
                    Ushbu darslik buyurtmasi talaba uchun birinchisi sanaladi.
                  </p>
                </div>
              );
            }

            return (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                showRedWarning
                  ? 'bg-red-50 border-red-200 text-red-900 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    {showRedWarning ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    Oxirgi buyurtma qilingan darslik:
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{lastDateStr}</span>
                </div>

                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <span>📘 {lastOrderInv?.title ?? 'Darslik'}</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    ({daysDiff !== null ? (daysDiff === 0 ? 'Bugun' : `${daysDiff} kun oldin`) : '—'})
                  </span>
                </div>

                {hasDuplicateBookOrder && (
                  <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-[11px] font-bold text-red-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>Ogohlantirish: Ushbu talabaga ilgari ham ayni shu darslik ("{inv?.title}") buyurtma berilgan!</span>
                  </div>
                )}

                {isLessThan2Months && !hasDuplicateBookOrder && (
                  <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-[11px] font-bold text-red-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>Ogohlantirish: Talabaning oxirgi darsligi 2 oydan kam vaqt ichida ({daysDiff} kun oldin) buyurtma qilingan!</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Amallar paneli */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-2 shrink-0">
          {order.status === 'CREATED' && (
            <button
              onClick={() => setTolovKorsat(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              <DollarSign className="w-4 h-4" /> To'lov qabul qilish
            </button>
          )}

          {/* Deliver button — shown ONLY when physical book HAS ARRIVED or allocated from warehouse */}
          {['ARRIVED', 'Ombordan biriktirildi'].includes(order.status) && (
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
                ? <><CheckCircle className="w-4 h-4" /> Kitobni topshirish — Berildi</>
                : <><Lock className="w-4 h-4" /> Topshirish (Qarz mavjud)</>
              }
            </button>
          )}

          {/* Fix Payment & Status Modal button */}
          <button
            onClick={() => setFixKorsat(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> To'lov / Holatni tahrirlash (Tuzatish)
          </button>

          {/* Decouple to warehouse */}
          {order.status === 'ARRIVED' && (
            <button
              onClick={() => { decoupleBook(order.id); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-50 border border-purple-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Omborga qaytarish
            </button>
          )}

          {/* Cancel order */}
          {order.status !== 'GIVEN' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => setBekorKorsat(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-100 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Buyurtmani bekor qilish
            </button>
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
      {fixKorsat && (
        <FixPaymentModal
          order={order}
          onClose={() => setFixKorsat(false)}
        />
      )}
      {bekorKorsat && (
        <BekorQilishModali
          targetName={studentName}
          onClose={() => setBekorKorsat(false)}
          onConfirm={(reason) => {
            cancelOrder(order.id, reason);
            setBekorKorsat(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
