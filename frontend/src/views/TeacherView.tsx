/**
 * views/TeacherView.tsx — Light theme
 */

import { useState } from 'react';
import { BookOpen, CheckSquare, Square, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, ModalShell, EmptyState, TableShell, Th, Td } from '../components/ui';
import type { BulkOrderItem } from '../types';

function BulkOrderModal({ selectedIds, activeGroupId, onClose }: {
  selectedIds: string[]; activeGroupId: string; onClose: () => void;
}) {
  const { inventory, getStudentName, createBulkOrders } = useApp();
  
  // Extract unique category names
  const categories = Array.from(new Set(inventory.map(i => i.categoryName || 'Umumiy')));

  // Initial state helper
  const getInitialBookForCategory = (cat: string) => {
    return inventory.find(i => (i.categoryName || 'Umumiy') === cat)?.id || '';
  };

  const [entries, setEntries] = useState<Record<string, { categoryName: string; bookId: string; comment: string }>>(() => {
    const initialCat = categories[0] || 'Umumiy';
    return Object.fromEntries(
      selectedIds.map(id => [
        id,
        {
          categoryName: initialCat,
          bookId: getInitialBookForCategory(initialCat),
          comment: ''
        }
      ])
    );
  });

  const handleCategoryChange = (studentId: string, catName: string) => {
    const defaultBookId = getInitialBookForCategory(catName);
    setEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        categoryName: catName,
        bookId: defaultBookId
      }
    }));
  };

  const updateEntry = (studentId: string, field: 'bookId' | 'comment', value: string) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items: BulkOrderItem[] = selectedIds.map(sid => ({
      studentId: sid, groupId: activeGroupId,
      bookId: entries[sid].bookId, comment: entries[sid].comment,
    }));
    createBulkOrders(items);
    onClose();
  };

  return (
    <ModalShell title="Yangi buyurtma yaratish" subtitle={`${selectedIds.length} ta talaba — kitob biriktirish`}
      icon={BookOpen} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
        {selectedIds.map(sid => {
          const studentCat = entries[sid].categoryName;
          const filteredBooks = inventory.filter(i => (i.categoryName || 'Umumiy') === studentCat);

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
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="sb-label">Kitob</label>
                  <div className="relative">
                    <select className="sb-input appearance-none pr-8 text-xs font-medium"
                      value={entries[sid].bookId}
                      onChange={e => updateEntry(sid, 'bookId', e.target.value)} required>
                      {filteredBooks.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="sb-label">Izoh</label>
                  <input className="sb-input text-xs font-medium" placeholder="Ixtiyoriy eslatma..."
                    value={entries[sid].comment}
                    onChange={e => updateEntry(sid, 'comment', e.target.value)} />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
          <button type="button" onClick={onClose} className="sb-btn-secondary text-xs">Bekor qilish</button>
          <button type="submit" className="sb-btn-primary flex items-center gap-1.5 text-xs">
            <Send className="w-3.5 h-3.5" /> Buyurtma yuborish
          </button>
        </div>
      </form>
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
