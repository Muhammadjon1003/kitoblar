/**
 * views/TeacherView/EditOrderBookModal.tsx
 * Allows teachers to edit the book on a CREATED (un-dispatched) order.
 */

import { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModalShell } from '../../components/ui';

interface EditOrderBookModalProps {
  orderId: string;
  currentBookId: string;
  studentName: string;
  onClose: () => void;
}

export default function EditOrderBookModal({
  orderId,
  currentBookId,
  studentName,
  onClose
}: EditOrderBookModalProps) {
  const { inventory, updateOrderBook, fireToast } = useApp();
  const [selectedBookId, setSelectedBookId] = useState(currentBookId);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || selectedBookId === currentBookId) {
      onClose();
      return;
    }

    setSaving(true);
    const selectedBook = inventory.find(b => b.id === selectedBookId);
    const bookCost = selectedBook?.bookCost ?? 0;
    const sotuvNarxi = selectedBook?.price ?? 0;

    const success = await updateOrderBook(orderId, {
      bookId: selectedBookId,
      ...(bookCost > 0 && { bookCost }),
      ...(sotuvNarxi > 0 && { sotuvNarxi }),
    });

    setSaving(false);
    if (success) {
      fireToast(`${studentName} uchun darslik muvaffaqiyatli yangilandi!`, 'success');
      onClose();
    }
  };

  return (
    <ModalShell title="Darslikni O'zgartirish" onClose={onClose}>
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800">
          <b>Talaba:</b> {studentName}
          <p className="text-[11px] text-blue-600 font-normal mt-0.5">
            Buyurtma hali ta'minotchiga yuborilmagani uchun darslikni bevosita yangilashingiz mumkin.
          </p>
        </div>

        <div>
          <label className="sb-label">Yangi Darslikni Tanlang</label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {inventory.map(book => {
              const isSelected = selectedBookId === book.id;
              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-600 text-blue-900 font-bold shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold">{book.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{book.categoryName || 'Umumiy'}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={saving} className="sb-btn-secondary flex-1 text-xs">
            Bekor qilish
          </button>
          <button type="submit" disabled={saving || selectedBookId === currentBookId} className="sb-btn-primary flex-1 text-xs flex items-center justify-center gap-1.5">
            {saving ? "Saqlanmoqda..." : "Saqlash va Yangilash"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
