/**
 * views/LogisticsView/LogisticsBooksCatalog.tsx — O'zbek tili
 * Logistika uchun darsliklar va komplektlar nomi va narxlarini tahrirlash sahifasi.
 */

import React, { useState } from 'react';
import { BookOpen, Search, Edit3, CheckCircle2, X, Plus, Trash2, Layers, Send, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableShell, Th, Td, EmptyState, uzs } from '../../components/ui';
import type { InventoryItem } from '../../types';

function DarslikTahrirlashModali({ book, onClose }: { book: InventoryItem; onClose: () => void }) {
  const { updateBookDetails, sotuvNarxi } = useApp();
  const currentPrice = (book.price && book.price > 0) ? book.price : sotuvNarxi;

  const [titleInput, setTitleInput] = useState(book.title || '');
  const [priceInput, setPriceInput] = useState(String(currentPrice || ''));

  let parsedSubFiles: Array<{ name: string; fileId: string }> = [];
  if (book.isSet && book.setDetails) {
    try { parsedSubFiles = JSON.parse(book.setDetails); } catch (e) {}
  }

  const [subBooks, setSubBooks] = useState<Array<{ name: string; fileId: string }>>(parsedSubFiles);
  const [saving, setSaving]     = useState(false);
  const [xato, setXato]         = useState('');

  const handleSubBookNameChange = (index: number, newName: string) => {
    setSubBooks(prev => prev.map((item, idx) => idx === index ? { ...item, name: newName } : item));
  };

  const handleAddSubBook = () => {
    setSubBooks(prev => [
      ...prev,
      { name: `Darslik ${prev.length + 1}`, fileId: `sub_book_${Date.now()}` }
    ]);
  };

  const handleRemoveSubBook = (index: number) => {
    setSubBooks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      setXato("Iltimos, darslik nomini kiriting.");
      return;
    }
    const val = parseFloat(priceInput);
    if (isNaN(val) || val < 0) {
      setXato("Iltimos, to'g'ri sotuv narxi kiriting.");
      return;
    }

    setSaving(true);
    setXato('');

    try {
      const ok = await updateBookDetails(book.id, {
        name: titleInput.trim(),
        price: val,
        setDetails: book.isSet ? JSON.stringify(subBooks) : undefined
      });
      if (ok) onClose();
    } catch (err: any) {
      setXato(err.message || "Saqlashda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            <h3 className="text-base font-bold">Darslik va Komplekt Nomi / Narxini Tahrirlash</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Fan / Kategoriya:</span>
            <span className="font-bold text-slate-800">{book.categoryName || 'Umumiy'}</span>
          </div>

          {/* Main Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              {book.isSet ? '📦 Komplekt Nomi' : '📖 Darslik Nomi'}
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={e => { setTitleInput(e.target.value); setXato(''); }}
              placeholder="Masalan: Primary Starter (PDF & Audio)"
              required
              className="w-full h-10 px-3 text-sm font-bold text-slate-900 bg-white border border-slate-300 focus:border-amber-500 focus:outline-none rounded-xl"
            />
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Sotuv narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={priceInput}
              onChange={e => { setPriceInput(e.target.value); setXato(''); }}
              placeholder="Masalan: 120000"
              required
              className="w-full h-10 px-3 text-sm font-bold text-slate-900 bg-white border border-slate-300 focus:border-amber-500 focus:outline-none rounded-xl font-mono"
            />
          </div>

          {/* If Set: Sub-books list editor */}
          {book.isSet && (
            <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Komplekt Ichidagi Darsliklar ({subBooks.length} ta):
                </label>
                <button
                  type="button"
                  onClick={handleAddSubBook}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Darslik Qo'shish
                </button>
              </div>

              {subBooks.length === 0 ? (
                <p className="text-xs text-purple-600 italic">Komplektda darsliklar yo'q.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {subBooks.map((sb, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-purple-200 rounded-lg shadow-2xs">
                      <span className="text-[11px] font-mono font-bold text-purple-700 w-5 text-center">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={sb.name}
                        onChange={e => handleSubBookNameChange(idx, e.target.value)}
                        placeholder="Darslik nomi..."
                        className="flex-1 h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubBook(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saqlash
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
  const { inventory, sotuvNarxi, fireToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<InventoryItem | null>(null);
  const [postingList, setPostingList] = useState(false);

  const handlePostStorageList = async () => {
    setPostingList(true);
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API}/backend/books/post-storage-list`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      fireToast(`Barcha darsliklar ro'yxati (${data.totalCount} ta) Ombor Kanaliga matn ko'rinishida yuborildi!`, 'success');
    } catch (e: any) {
      fireToast(`Yuborishda xatolik: ${e.message}`, 'error');
    } finally {
      setPostingList(false);
    }
  };

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
            Darsliklar Katalogi, Nomlari va Narxlari
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Darsliklar va komplekt ichidagi kitoblar nomlarini bevosita veb-saytdan tahrirlash
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/backend/books/export-csv`}
            download="Darsliklar_Royxati_SmartBook.csv"
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            CSV Excel Yuklash
          </a>
          <button
            onClick={handlePostStorageList}
            disabled={postingList}
            className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            {postingList ? "Yuborilmoqda..." : "Ombor Kanaliga Matnli Ro'yxat Yuborish"}
          </button>
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
                <Th>Tarkibi</Th>
                <Th right>Amallar</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.map((book, idx) => {
                const hasCustomPrice = Boolean(book.price && book.price > 0);
                const activePrice = hasCustomPrice ? book.price! : sotuvNarxi;

                let subCount = 1;
                if (book.isSet && book.setDetails) {
                  try {
                    const files = JSON.parse(book.setDetails);
                    subCount = files.length;
                  } catch (e) {}
                }

                return (
                  <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td mono>{idx + 1}</Td>
                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {book.categoryName || 'Umumiy'}
                      </span>
                    </Td>
                    <Td>
                      <div>
                        <span className="font-bold text-slate-800 text-xs">{book.title}</span>
                        {book.isSet && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                            📦 Komplekt ({subCount} ta)
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td mono>
                      <span className="font-bold text-emerald-700 text-xs font-mono">{uzs(activePrice)}</span>
                    </Td>
                    <Td>
                      {book.isSet ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 border border-purple-200 text-purple-800">
                          <Layers className="w-3 h-3 text-purple-600" /> {subCount} ta darslik to'plami
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                          Alohida 1 ta darslik
                        </span>
                      )}
                    </Td>
                    <Td right>
                      <button
                        onClick={() => setSelectedBook(book)}
                        className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ml-auto shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Nomi va Narxni Tahrirlash</span>
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

      {/* Edit Book Modal */}
      {selectedBook && (
        <DarslikTahrirlashModali book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

    </div>
  );
}
