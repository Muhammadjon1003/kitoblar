/**
 * views/LogisticsView/WarehouseInventory.tsx — O'zbek tili
 * tg_file_id va texnik identifikatorlar foydalanuvchidan yashirilgan.
 */

import { useState } from 'react';
import { Archive, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState, TableShell, Th, Td } from '../../components/ui';

export default function WarehouseInventory() {
  const { inventory, students, groups, allocateFromWarehouse } = useApp();

  const returnedBooks = inventory.filter(i => i.isReturned);

  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const setAllocation = (invId: string, studentId: string) => {
    setAllocations(prev => ({ ...prev, [invId]: studentId }));
  };

  const handleAllocate = (invId: string) => {
    const studentId = allocations[invId];
    if (!studentId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    allocateFromWarehouse(invId, studentId, student.groupId);
    setAllocations(prev => { const next = { ...prev }; delete next[invId]; return next; });
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" />
            Qayta foydalanish ombori
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Qaytarilgan kitoblar — talabaga biriktirish orqali darhol yetkazib berish holatiga o'tadi.
          </p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm">
          {returnedBooks.length} ta mavjud
        </span>
      </div>

      {returnedBooks.length === 0 ? (
        <EmptyState label="Omborxonada qaytarilgan kitob yo'q." />
      ) : (
        <div className="space-y-3">
          {returnedBooks.map((inv, idx) => {
            const selectedStudentId = allocations[inv.id] ?? '';
            const selectedStudent   = students.find(s => s.id === selectedStudentId);

            return (
              <div key={inv.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Kitob ma'lumotlari */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600">
                      #{idx + 1}
                    </span>
                    <p className="text-sm font-bold text-slate-800">{inv.title}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="px-2.5 py-0.5 bg-purple-100 border border-purple-200 text-purple-700 rounded-full font-bold">
                      Qaytarilgan
                    </span>
                    {inv.categoryName && (
                      <span className="text-slate-500 font-semibold">{inv.categoryName}</span>
                    )}
                    <span className="text-emerald-600 font-bold">→ Bepul biriktirish</span>
                  </div>
                </div>

                {/* Talaba tanlash + biriktirish */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <select
                      className="sb-input appearance-none pr-8 text-xs min-w-[220px] bg-white border-slate-300 rounded-xl"
                      value={selectedStudentId}
                      onChange={e => setAllocation(inv.id, e.target.value)}
                    >
                      <option value="">— Talabani tanlang —</option>
                      {groups.map(g => (
                        <optgroup key={g.id} label={g.groupName}>
                          {students
                            .filter(s => s.groupId === g.id)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))
                          }
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => handleAllocate(inv.id)}
                    disabled={!selectedStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold sb-btn-primary disabled:opacity-40 whitespace-nowrap shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Biriktirish
                    {selectedStudent && ` → ${selectedStudent.name.split(' ')[0]}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Umumiy inventar jadvali */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 bg-slate-100/60 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-800">Barcha inventar ro'yxati</p>
          <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Tizimga yuklangan va kiritilgan barcha darsliklar inventari</p>
        </div>
        
        <TableShell>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Kitob nomi</Th>
              <Th>Kategoriya</Th>
              <Th>Holati</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map((inv, idx) => (
              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                <Td mono>{idx + 1}</Td>
                <Td><span className="font-bold text-slate-800">{inv.title}</span></Td>
                <Td muted>{inv.categoryName ?? '—'}</Td>
                <Td>
                  {inv.isReturned
                    ? <span className="px-2.5 py-0.5 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-[10px] font-bold">Qaytarilgan / Mavjud</span>
                    : <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold">Muomalada</span>
                  }
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
