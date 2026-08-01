/**
 * views/LogisticsView/components/OmborgaKitobQoshishModali.tsx
 * Modal for manually adding physical books or set sub-items into warehouse inventory stock.
 */

import React, { useState, useEffect } from 'react';
import { Package, X, ChevronDown } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export default function OmborgaKitobQoshishModali({ onClose }: { onClose: () => void }) {
  const { inventory, addWarehouseStockItem } = useApp();
  const [bookId, setBookId] = useState(inventory[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [bookCost, setBookCost] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [xato, setXato] = useState('');

  const selectedBook = inventory.find(b => b.id === bookId);
  let setFiles: Array<{ name: string; fileId: string }> = [];
  if (selectedBook?.isSet && selectedBook?.setDetails) {
    try { setFiles = JSON.parse(selectedBook.setDetails); } catch (e) {}
  }

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  useEffect(() => {
    const b = inventory.find(i => i.id === bookId);
    if (b?.isSet && b?.setDetails) {
      try {
        const files: Array<{ fileId: string }> = JSON.parse(b.setDetails);
        setSelectedFileIds(files.map(f => f.fileId));
      } catch (e) {
        setSelectedFileIds([]);
      }
    } else {
      setSelectedFileIds([]);
    }
  }, [bookId, inventory]);

  const toggleSubBook = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) {
      setXato("Iltimos, darslikni tanlang.");
      return;
    }
    if (selectedBook?.isSet && setFiles.length > 0 && selectedFileIds.length === 0) {
      setXato("Komplektdan kamida 1 ta darslikni tanlang.");
      return;
    }

    setSaving(true);
    setXato('');

    const success = await addWarehouseStockItem({
      bookId,
      selectedFileIds: selectedBook?.isSet ? selectedFileIds : undefined,
      quantity,
      bookCost,
      comment: comment.trim() || undefined,
    });

    setSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="text-base font-bold">Omborga Jismoniy Kitob Qo'shish</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="sb-label">Darslik turi / Komplekt</label>
            {inventory.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                Hozircha bot/katalogda darsliklar mavjud emas. Avval Telegram bot orqali kitob yuklang.
              </div>
            ) : (
              <div className="relative">
                <select
                  className="sb-input appearance-none pr-8 font-bold text-slate-800"
                  value={bookId}
                  onChange={e => setBookId(e.target.value)}
                >
                  {inventory.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} {b.isSet ? '(📦 Komplekt)' : ''} ({b.categoryName || 'Umumiy'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* If selected item is a Komplekt Set: Sub-item Checklist */}
          {selectedBook?.isSet && setFiles.length > 0 && (
            <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl space-y-2">
              <label className="text-xs font-bold text-purple-900 block">
                Komplektdan qaysi darsliklar omborga qo'shilmoqda? (Belgilang):
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {setFiles.map((f, idx) => (
                  <label
                    key={f.fileId}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedFileIds.includes(f.fileId)
                        ? 'bg-white border-purple-400 text-purple-900 font-bold shadow-xs'
                        : 'bg-slate-100/70 border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFileIds.includes(f.fileId)}
                      onChange={() => toggleSubBook(f.fileId)}
                      className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300"
                    />
                    <span>{idx + 1}. {f.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sb-label">Miqdori (Soni)</label>
              <input
                type="number" min={1} max={500} className="sb-input font-mono font-bold"
                value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="sb-label">Tan narxi (dona / so'm)</label>
              <input
                type="number" min={0} step={1000} className="sb-input font-mono font-bold"
                value={bookCost || ''} placeholder="0 so'm"
                onChange={e => setBookCost(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          <div>
            <label className="sb-label">Izoh / Manba (ixtiyoriy)</label>
            <input
              type="text" className="sb-input"
              placeholder="masalan: Do'kondan keltirilgan yangi zaxira"
              value={comment} onChange={e => setComment(e.target.value)}
            />
          </div>

          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={saving} className="sb-btn-secondary flex-1 text-xs">
              Bekor qilish
            </button>
            <button type="submit" disabled={saving || inventory.length === 0} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
              {saving ? 'Saqlanmoqda...' : 'Omborga saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
