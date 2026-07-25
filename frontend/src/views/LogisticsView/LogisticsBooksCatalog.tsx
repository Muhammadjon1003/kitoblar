/**
 * views/LogisticsView/LogisticsBooksCatalog.tsx — O'zbek tili
 * Logistika uchun darsliklar katalogi va alohida sotuv narxlarini belgilash sahifasi.
 */

import { useState } from 'react';
import { BookOpen, Search, Edit3, CheckCircle2, X, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableShell, Th, Td, EmptyState, uzs } from '../../components/ui';
import type { InventoryItem } from '../../types';

function DarslikNarxModali({ book, onClose }: { book: InventoryItem; onClose: () => void }) {
  const { updateBookPrice, sotuvNarxi } = useApp();
  const currentPrice = (book.price && book.price > 0) ? book.price : sotuvNarxi;

  const [priceInput, setPriceInput] = useState(String(currentPrice || ''));
  const [saving, setSaving]         = useState(false);
  const [xato, setXato]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priceInput);
    if (isNaN(val) || val < 0) {
      setXato("Iltimos, to'g'ri sotuv narxi kiriting.");
      return;
    }

    setSaving(true);
    setXato('');

    try {
      const ok = await updateBookPrice(book.id, val);
      if (ok) onClose();
    } catch (err: any) {
      setXato(err.message || "Narx saqlashda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            <h3 className="text-base font-bold">Darslik Sotuv Narxini Belgilash</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Fan / Kategoriya:</span>
              <span className="font-bold text-slate-800">{book.categoryName || 'Umumiy'}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-semibold">Darslik Nomi:</span>
              <span className="font-bold text-slate-900">{book.title}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-semibold">Menejer standart narxi:</span>
              <span className="font-mono font-bold text-slate-700">{uzs(sotuvNarxi)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Ushbu darslik sotuv narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={priceInput}
              onChange={e => { setPriceInput(e.target.value); setXato(''); }}
              placeholder="Masalan: 120000"
              required
              className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-white border-2 border-slate-300 focus:border-amber-500 focus:outline-none rounded-xl font-mono"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Ushbu narx o'qituvchilar buyurtma berganida avtomatik belgilanadi.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Narxni Saqlash
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function LogisticsBooksCatalog() {
  const { inventory, sotuvNarxi } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<InventoryItem | null>(null);

  const filteredBooks = inventory.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || (b.categoryName && b.categoryName.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            Darsliklar Katalogi va Sotuv Narxlari
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Logistika bo'limi uchun darslik turlari bo'yicha sotuv narxlarini oldindan belgilash
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Darslik nomi yoki fan bo'yicha..."
            className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <span>Jami darsliklar:</span>
          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md font-mono">{inventory.length} ta</span>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredBooks.length === 0 ? (
          <div className="p-8">
            <EmptyState label={searchQuery ? `"${searchQuery}" bo'yicha darslik topilmadi.` : "Hozircha darsliklar ro'yxati bo'sh."} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <TableShell>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Fan / Kategoriya</Th>
                <Th>Darslik Nomi</Th>
                <Th>Sotuv Narxi (so'm)</Th>
                <Th>Holat / Narx Manbasi</Th>
                <Th right>Amallar</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.map((book, idx) => {
                const hasCustomPrice = Boolean(book.price && book.price > 0);
                const activePrice = hasCustomPrice ? book.price! : sotuvNarxi;

                return (
                  <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td mono>{idx + 1}</Td>
                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {book.categoryName || 'Umumiy'}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-bold text-slate-800 text-xs">{book.title}</span>
                    </Td>
                    <Td mono>
                      <span className="font-bold text-emerald-700 text-xs font-mono">{uzs(activePrice)}</span>
                    </Td>
                    <Td>
                      {hasCustomPrice ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800">
                          <Tag className="w-3 h-3" /> Logistika maxsus narxi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                          Menejer standart narxi
                        </span>
                      )}
                    </Td>
                    <Td right>
                      <button
                        onClick={() => setSelectedBook(book)}
                        className="py-1 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Narxni o'zgartirish</span>
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          </div>
        )}
      </div>

      {/* Edit Price Modal */}
      {selectedBook && (
        <DarslikNarxModali book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

    </div>
  );
}
