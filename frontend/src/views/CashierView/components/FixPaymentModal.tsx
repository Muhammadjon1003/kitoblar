/**
 * views/CashierView/components/FixPaymentModal.tsx — O'zbek tili
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { uzs } from '../../../components/ui';
import type { Order, OrderStatus } from '../../../types';

interface FixPaymentModalProps {
  order: Order;
  onClose: () => void;
}

export default function FixPaymentModal({ order, onClose }: FixPaymentModalProps) {
  const { updateOrderAdmin, getStudentName, getInventoryItem, fireToast } = useApp();
  const [amount,     setAmount]     = useState(String(order.amountPaid));
  const [bookCost,   setBookCost]   = useState(String(order.bookCost));
  const [sotuvNarxi, setSotuvNarxi] = useState(String(order.sotuvNarxi));
  const [status,     setStatus]     = useState<OrderStatus>(order.status);
  const [comment,    setComment]    = useState(order.comment);
  const [saving,     setSaving]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      fireToast('Iltimos, to\'g\'ri to\'langan miqdor kiriting.', 'error');
      return;
    }
    const parsedCost = parseFloat(bookCost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      fireToast('Iltimos, to\'g\'ri tan narx kiriting.', 'error');
      return;
    }
    const parsedSotuv = parseFloat(sotuvNarxi);
    if (isNaN(parsedSotuv) || parsedSotuv < 0) {
      fireToast('Iltimos, to\'g\'ri sotuv narxi kiriting.', 'error');
      return;
    }

    setSaving(true);
    await updateOrderAdmin(order.id, {
      status,
      amountPaid: parsedAmount,
      bookCost: parsedCost,
      sotuvNarxi: parsedSotuv,
      comment
    });
    setSaving(false);
    onClose();
  };

  const inv = getInventoryItem(order.bookId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">To'lov va buyurtmani tahrirlash (Tuzatish)</h3>
            <p className="text-[11px] text-blue-100 mt-0.5">{getStudentName(order.studentId)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Darslik:</span>
              <span className="font-bold text-slate-800">{inv?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Hozirgi chakana narx:</span>
              <span className="font-bold text-slate-800">{order.sotuvNarxi === 0 ? "To'lov ichida" : uzs(order.sotuvNarxi)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sb-label">To'langan miqdor (so'm)</label>
              <input
                type="number" min="0" step="1" className="sb-input font-mono font-bold"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sb-label">Tan narxi / Xarajat (so'm)</label>
              <input
                type="number" min="0" step="1" className="sb-input font-mono font-bold"
                value={bookCost}
                onChange={e => setBookCost(e.target.value)}
                placeholder="Logistika tan narxi"
                required
              />
            </div>
          </div>

          <div>
            <label className="sb-label">Sotuv narxi (so'm)</label>
            <input
              type="number" min="0" step="1" className="sb-input font-mono font-bold"
              value={sotuvNarxi}
              onChange={e => setSotuvNarxi(e.target.value)}
              placeholder="0 bo'lsa To'lov ichida"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * 0 ga teng bo'lsa "To'lov ichida" (kurs to'loviga kiritilgan) deb hisoblanadi.
            </p>
          </div>

          <div>
            <label className="sb-label">Buyurtma holati</label>
            <select
              className="sb-input font-semibold"
              value={status}
              onChange={e => setStatus(e.target.value as OrderStatus)}
              required
            >
              <option value="CREATED">Yaratildi (To'lov kutilmoqda)</option>
              <option value="PAID">To'langan (Buyurtma kutilmoqda)</option>
              <option value="ORDERED">Buyurtma berildi (Yo'lda)</option>
              <option value="ARRIVED">Keldi (Topshirishga tayyor)</option>
              <option value="GIVEN">Topshirildi (Yakunlangan)</option>
              <option value="CANCELLED">Bekor qilindi</option>
              <option value="RETURNED">Qaytarildi (Omborga)</option>
            </select>
          </div>

          <div>
            <label className="sb-label">Izoh (Tuzatish sababi)</label>
            <textarea
              className="sb-input min-h-[60px]"
              placeholder="Nega o'zgartirilganligi haqida qisqa eslatma..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
            <button type="submit" disabled={saving} className="sb-btn-primary flex-1 text-xs flex items-center justify-center gap-1.5">
              {saving ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</> : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
