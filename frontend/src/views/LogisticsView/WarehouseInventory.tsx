/**
 * views/LogisticsView/WarehouseInventory.tsx — O'zbek tili
 * tg_file_id va texnik identifikatorlar foydalanuvchidan yashirilgan.
 */

import { useState } from 'react';
import { Archive, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';

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
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-zinc-500" />
            Qayta foydalanish ombori
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1">
            Qaytarilgan kitoblar — talabaga biriktirish orqali darhol yetkazib berish holatiga o'tadi.
          </p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300">
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
              <div key={inv.id} className="sb-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Kitob ma'lumotlari */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">
                      #{idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-zinc-100">{inv.title}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded font-semibold">
                      Qaytarilgan
                    </span>
                    {inv.categoryName && (
                      <span className="text-zinc-400">{inv.categoryName}</span>
                    )}
                    <span className="text-emerald-400 font-semibold">→ Bepul biriktirish</span>
                  </div>
                </div>

                {/* Talaba tanlash + biriktirish */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <select
                      className="sb-input appearance-none pr-8 text-xs min-w-[220px]"
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
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => handleAllocate(inv.id)}
                    disabled={!selectedStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold sb-btn-primary disabled:opacity-40 whitespace-nowrap"
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
      <div className="sb-card overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-300">Barcha inventar ro'yxati</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                {['#', 'Kitob nomi', 'Kategoriya', 'Holati'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {inventory.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 font-mono text-[10px]">{idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-zinc-200">{inv.title}</td>
                  <td className="px-5 py-3 text-zinc-400">{inv.categoryName ?? '—'}</td>
                  <td className="px-5 py-3">
                    {inv.isReturned
                      ? <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded text-[10px] font-semibold">Qaytarilgan / Mavjud</span>
                      : <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-[10px]">Muomalada</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
