/**
 * views/TeacherView.tsx — Light theme
 */

import { useState, useEffect } from 'react';
import { BookOpen, CheckSquare, Square, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, ModalShell, EmptyState, TableShell, Th, Td } from '../components/ui';
import type { BulkOrderItem } from '../types';

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

function BulkOrderModal({ selectedIds, activeGroupId, onClose }: {
  selectedIds: string[]; activeGroupId: string; onClose: () => void;
}) {
  const { getStudentName, createBulkOrders } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBooks, setCategoryBooks] = useState<Record<string, InventoryItem[]>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form entries
  const [entries, setEntries] = useState<Record<string, { categoryId: string; bookId: string; comment: string }>>({});

  // Fetch books helper
  const fetchBooksForStudent = async (studentId: string, catId: string) => {
    setLoadingStates(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`https://kitoblar-seven.vercel.app/backend/books?categoryId=${catId}`);
      if (!res.ok) throw new Error('Kitoblarni yuklab bo\'lmadi');
      const data = await res.json();

      const mapped: InventoryItem[] = data.map((b: any) => ({
        id: String(b.id),
        title: b.name,
        tgFileId: b.tgFileId,
        isReturned: false,
        bookCost: 10
      }));

      setCategoryBooks(prev => ({ ...prev, [studentId]: mapped }));
      
      // Auto-select first book in the list
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

  // 1. Fetch categories on mount
  useEffect(() => {
    async function initCategories() {
      try {
        setGlobalLoading(true);
        setError(null);
        const res = await fetch('https://kitoblar-seven.vercel.app/backend/categories');
        if (!res.ok) throw new Error('Kategoriyalarni yuklab bo\'lmadi');
        const data = await res.json();
        
        if (data.length === 0) {
          throw new Error('Tizimda hech qanday kategoriya mavjud emas. Avval Telegram bot orqali kategoriya qo\'shing.');
        }

        setCategories(data);
        
        // Initialize default category for all students
        const firstCatId = String(data[0].id);
        const initialEntries = Object.fromEntries(
          selectedIds.map(id => [id, { categoryId: firstCatId, bookId: '', comment: '' }])
        );
        setEntries(initialEntries);

        // Fetch books for the first category for each student
        await Promise.all(
          selectedIds.map(async (sid) => {
            await fetchBooksForStudent(sid, firstCatId);
          })
        );

      } catch (err: any) {
        setError(err.message);
      } finally {
        setGlobalLoading(false);
      }
    }
    initCategories();
  }, [selectedIds]);

  const handleCategoryChange = async (studentId: string, catId: string) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], categoryId: catId, bookId: '' }
    }));
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
            const studentCat = entries[sid]?.categoryId || '';
            const booksList = categoryBooks[sid] || [];
            const isLoadingBooks = loadingStates[sid];

            return (
              <div key={sid} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-slate-800">{getStudentName(sid)}</p>
                <div className="grid grid-cols-3 gap-3">
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
            <button type="submit" className="sb-btn-primary flex items-center gap-1.5 text-xs" 
              disabled={selectedIds.some(sid => !entries[sid]?.bookId)}>
              <Send className="w-3.5 h-3.5" /> Buyurtma yuborish
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

export default function TeacherView() {
  const {
    students,
    getStudentOrders, getInventoryItem,
    getGroupsByTeacher,
  } = useApp();

  const ACTIVE_TEACHER_ID = 't1';
  const teacherGroups = getGroupsByTeacher(ACTIVE_TEACHER_ID);

  const [activeGroupId, setActiveGroupId] = useState<string>(teacherGroups[0]?.id ?? '');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showModal,     setShowModal]     = useState(false);

  const groupStudents = students.filter(s => s.groupId === activeGroupId);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === groupStudents.length ? new Set() : new Set(groupStudents.map(s => s.id))
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-7 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="relative">
          <select className="sb-input appearance-none pr-8 text-sm font-medium"
            value={activeGroupId}
            onChange={e => { setActiveGroupId(e.target.value); setSelectedIds(new Set()); }}>
            {teacherGroups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <span className="text-[11px] text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
          {groupStudents.length} students
        </span>

        <div className="ml-auto flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 font-semibold">
              {selectedIds.size} selected
            </span>
          )}
          <button onClick={() => selectedIds.size > 0 && setShowModal(true)}
            disabled={selectedIds.size === 0}
            className="sb-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-40">
            <BookOpen className="w-3.5 h-3.5" /> Create Bulk Order
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        {groupStudents.length === 0 ? (
          <EmptyState label="No students in this group." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {selectedIds.size === groupStudents.length && groupStudents.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      : <Square className="w-3.5 h-3.5" />}
                  </button>
                </Th>
                <Th>Student Name</Th>
                <Th>Last Allocated Book</Th>
                <Th>Last Order Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupStudents.map(student => {
                const latestOrder = getStudentOrders(student.id)[0];
                const bookItem = latestOrder ? getInventoryItem(latestOrder.bookId) : undefined;
                const selected = selectedIds.has(student.id);

                return (
                  <tr key={student.id}
                    className={`transition-colors cursor-pointer ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleStudent(student.id)}>
                    <Td>
                      <button onClick={e => { e.stopPropagation(); toggleStudent(student.id); }}
                        className="text-slate-400 hover:text-blue-600 transition-colors">
                        {selected
                          ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800">{student.name}</span>
                      </div>
                    </Td>
                    <Td muted={!bookItem}>{bookItem ? bookItem.title : 'No orders yet'}</Td>
                    <Td mono muted={!latestOrder}>{latestOrder ? latestOrder.updatedAt : '—'}</Td>
                    <Td>
                      {latestOrder
                        ? <StatusBadge status={latestOrder.status} />
                        : <span className="text-[11px] text-slate-400">No active order</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}

      </div>

      {showModal && (
        <BulkOrderModal selectedIds={[...selectedIds]} activeGroupId={activeGroupId}
          onClose={() => { setShowModal(false); setSelectedIds(new Set()); }} />
      )}
    </div>
  );
}
