/**
 * views/TeacherView/BulkOrderModal.tsx — O'zbek tili
 */

import { useState, useEffect } from 'react';
import { BookOpen, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModalShell } from '../../components/ui';
import type { BulkOrderItem } from '../../types';

interface Category {
  id: number;
  name: string;
}

interface InventoryItem {
  id: string;
  title: string;
  tgFileId: string;
  isReturned: boolean;
  bookCost: number;
  categoryName?: string;
}

interface BulkOrderModalProps {
  selectedIds: string[];
  activeGroupId: string;
  onClose: () => void;
}

export default function BulkOrderModal({ selectedIds, activeGroupId, onClose }: BulkOrderModalProps) {
  const { getStudentName, createBulkOrders } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBooks, setCategoryBooks] = useState<Record<string, InventoryItem[]>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<Record<string, { categoryId: string; bookId: string; comment: string }>>({});

  const fetchBooksForStudent = async (studentId: string, catId: string) => {
    setLoadingStates(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`https://kitoblar-seven.vercel.app/backend/books?categoryId=${catId}`);
      if (!res.ok) throw new Error("Kitoblarni yuklab bo'lmadi");
      const data = await res.json();

      const mapped: InventoryItem[] = data.map((b: any) => ({
        id: String(b.id),
        title: b.name,
        tgFileId: b.tgFileId,
        isReturned: false,
        bookCost: 0
      }));

      setCategoryBooks(prev => ({ ...prev, [studentId]: mapped }));
      setEntries(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          categoryId: catId,
          bookId: mapped[0]?.id || ''
        }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [studentId]: false }));
    }
  };

  useEffect(() => {
    async function initCategories() {
      try {
        setGlobalLoading(true);
        setError(null);
        const res = await fetch('https://kitoblar-seven.vercel.app/backend/categories');
        if (!res.ok) throw new Error("Kategoriyalarni yuklab bo'lmadi");
        const data = await res.json();

        if (data.length === 0) {
          throw new Error("Tizimda hech qanday fan mavjud emas. Avval Telegram bot orqali fan qo'shing.");
        }

        setCategories(data);
        const firstCatId = String(data[0].id);
        const initialEntries = Object.fromEntries(
          selectedIds.map(id => [id, { categoryId: firstCatId, bookId: '', comment: '' }])
        );
        setEntries(initialEntries);

        await Promise.all(selectedIds.map(sid => fetchBooksForStudent(sid, firstCatId)));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setGlobalLoading(false);
      }
    }
    initCategories();
  }, [selectedIds]);

  const handleCategoryChange = async (studentId: string, catId: string) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], categoryId: catId, bookId: '' } }));
    await fetchBooksForStudent(studentId, catId);
  };

  const updateEntry = (studentId: string, field: 'bookId' | 'comment', value: string) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items: BulkOrderItem[] = selectedIds.map(sid => ({
      studentId: sid,
      groupId: activeGroupId,
      bookId: entries[sid]?.bookId || '',
      comment: entries[sid]?.comment || '',
    }));
    createBulkOrders(items);
    onClose();
  };

  return (
    <ModalShell title="Yangi buyurtma yaratish" subtitle={`${selectedIds.length} ta talaba — kitob biriktirish`}
      icon={BookOpen} onClose={onClose} width="max-w-2xl">

      {globalLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-800">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold leading-relaxed">
            ⚠️ Xatolik yuz berdi:<br/>{error}
          </div>
          <button type="button" onClick={onClose} className="sb-btn-secondary text-xs">Yopish</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {selectedIds.map(sid => {
            const studentCat  = entries[sid]?.categoryId || '';
            const booksList   = categoryBooks[sid] || [];
            const isLoadingBooks = loadingStates[sid];

            return (
              <div key={sid} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-slate-800">{getStudentName(sid)}</p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Category */}
                  <div>
                    <label className="sb-label">Fan (Kategoriya)</label>
                    <div className="relative">
                      <select className="sb-input appearance-none pr-8 text-xs font-medium"
                        value={studentCat}
                        onChange={e => handleCategoryChange(sid, e.target.value)} required>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  {/* Book */}
                  <div>
                    <label className="sb-label">Kitob</label>
                    <div className="relative">
                      {isLoadingBooks ? (
                        <div className="sb-input text-xs font-medium flex items-center justify-between bg-slate-100 text-slate-700">
                          Yuklanmoqda...
                          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                        </div>
                      ) : booksList.length === 0 ? (
                        <select className="sb-input appearance-none pr-8 text-xs font-medium bg-slate-100 border-red-200 text-slate-800" disabled required>
                          <option value="">Bu fanda kitob yo'q</option>
                        </select>
                      ) : (
                        <>
                          <select className="sb-input appearance-none pr-8 text-xs font-medium"
                            value={entries[sid]?.bookId || ''}
                            onChange={e => updateEntry(sid, 'bookId', e.target.value)} required>
                            {booksList.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.title}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Comment */}
                  <div>
                    <label className="sb-label">Izoh</label>
                    <input className="sb-input text-xs font-medium" placeholder="Ixtiyoriy eslatma..."
                      value={entries[sid]?.comment || ''}
                      onChange={e => updateEntry(sid, 'comment', e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
            <button type="button" onClick={onClose} className="sb-btn-secondary text-xs">Bekor qilish</button>
            <button type="submit" className="sb-btn-primary flex items-center gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" /> Buyurtma berish
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
